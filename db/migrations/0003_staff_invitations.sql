-- Server-only team operations. All management is serialized per tenant.
ALTER TABLE app.staff_memberships ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
CREATE TABLE app_private.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id),
  branch_id uuid NOT NULL,
  email text NOT NULL CHECK (email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 254),
  role text NOT NULL CHECK (role IN ('branch_owner','manager','staff')),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid NOT NULL REFERENCES app.users(id),
  accepted_by uuid REFERENCES app.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','cancelled','expired')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id,branch_id) REFERENCES app.branches(tenant_id,id)
);
CREATE UNIQUE INDEX invitations_pending_email ON app_private.staff_invitations(tenant_id,email) WHERE status='pending';
REVOKE ALL ON app_private.staff_invitations FROM PUBLIC, aismall_app;
ALTER TABLE app.audit_events DROP CONSTRAINT audit_events_action_check;
ALTER TABLE app.audit_events ADD CONSTRAINT audit_events_action_check CHECK (action IN
  ('branch.renamed','organization.created','staff.invited','invitation.cancelled','invitation.accepted','staff.assigned','staff.revoked'));

CREATE FUNCTION app_private.require_team_admin(actor uuid, tenant uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  PERFORM 1 FROM app.tenants WHERE id=tenant AND status='active' FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM app.staff_memberships m JOIN app.users u ON u.id=m.user_id
    WHERE m.tenant_id=tenant AND m.user_id=actor AND m.role='tenant_admin' AND m.status='active' AND u.status='active'
  ) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
END $$;

CREATE FUNCTION app_private.team_snapshot(actor uuid, tenant uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE members jsonb; invitations jsonb;
BEGIN
  PERFORM app_private.require_team_admin(actor,tenant);
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'role',m.role,'status',m.status,'version',m.version,
    'label', CASE WHEN m.user_id=actor THEN '나' ELSE coalesce((SELECT i.email FROM app_private.staff_invitations i WHERE i.tenant_id=tenant AND i.accepted_by=m.user_id AND i.status='accepted' ORDER BY i.created_at DESC LIMIT 1),'기존 직원') END,
    'assignments',coalesce((SELECT jsonb_agg(jsonb_build_object('branchId',a.branch_id,'branchName',b.name,'role',a.role)) FROM app.branch_assignments a JOIN app.branches b ON b.tenant_id=a.tenant_id AND b.id=a.branch_id WHERE a.tenant_id=tenant AND a.membership_id=m.id AND a.status='active'),'[]'::jsonb)) ORDER BY m.created_at,m.id),'[]'::jsonb)
    INTO members FROM app.staff_memberships m WHERE m.tenant_id=tenant;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'role',i.role,'branchName',b.name,
    'status', CASE WHEN i.status='pending' AND i.expires_at<=clock_timestamp() THEN 'expired' ELSE i.status END,
    'expiresAt',i.expires_at) ORDER BY i.created_at DESC),'[]'::jsonb)
    INTO invitations FROM (SELECT * FROM app_private.staff_invitations WHERE tenant_id=tenant ORDER BY created_at DESC LIMIT 100) i
    JOIN app.branches b ON b.tenant_id=i.tenant_id AND b.id=i.branch_id;
  RETURN jsonb_build_object('members',members,'invitations',invitations);
END $$;

CREATE FUNCTION app_private.invite_staff(actor uuid, tenant uuid, recipient text, branch uuid, assigned_role text, hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE invitation uuid;
BEGIN
  PERFORM app_private.require_team_admin(actor,tenant);
  IF recipient IS NULL OR recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR char_length(recipient)>254
    OR assigned_role IS NULL OR assigned_role NOT IN ('branch_owner','manager','staff')
    OR hash IS NULL OR hash !~ '^[0-9a-f]{64}$'
    OR NOT EXISTS (SELECT 1 FROM app.branches WHERE tenant_id=tenant AND id=branch AND status='active')
  THEN RAISE EXCEPTION 'Invalid invitation' USING ERRCODE='22023'; END IF;
  UPDATE app_private.staff_invitations SET status='expired' WHERE tenant_id=tenant AND status='pending' AND expires_at<=clock_timestamp();
  IF (SELECT count(*) FROM app_private.staff_invitations WHERE tenant_id=tenant AND status='pending')>=100
  THEN RAISE EXCEPTION 'Pending invitation limit' USING ERRCODE='22023'; END IF;
  INSERT INTO app_private.staff_invitations(tenant_id,branch_id,email,role,token_hash,invited_by)
    VALUES(tenant,branch,lower(btrim(recipient)),assigned_role,hash,actor) RETURNING id INTO invitation;
  INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details)
    VALUES(tenant,branch,actor,'staff.invited',jsonb_build_object('invitationId',invitation,'role',assigned_role));
  RETURN invitation;
END $$;

CREATE FUNCTION app_private.cancel_staff_invitation(actor uuid, tenant uuid, invitation uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app_private.staff_invitations;
BEGIN
  PERFORM app_private.require_team_admin(actor,tenant);
  SELECT * INTO target FROM app_private.staff_invitations WHERE id=invitation AND tenant_id=tenant FOR UPDATE;
  IF NOT FOUND OR target.status<>'pending' THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501'; END IF;
  UPDATE app_private.staff_invitations SET status='cancelled' WHERE id=invitation;
  INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details)
    VALUES(tenant,target.branch_id,actor,'invitation.cancelled',jsonb_build_object('invitationId',invitation));
END $$;

CREATE FUNCTION app_private.accept_staff_invitation(actor uuid, verified_email text, hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app_private.staff_invitations; tenant uuid; member uuid;
BEGIN
  -- Identity/email must come from verified Auth, never the request body.
  IF verified_email IS NULL OR hash IS NULL THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501'; END IF;
  SELECT tenant_id INTO tenant FROM app_private.staff_invitations WHERE token_hash=hash;
  PERFORM 1 FROM app.tenants WHERE id=tenant AND status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501'; END IF;
  SELECT * INTO target FROM app_private.staff_invitations WHERE token_hash=hash FOR UPDATE;
  IF target.status<>'pending' OR target.expires_at<=clock_timestamp() OR target.email<>lower(btrim(verified_email))
    OR NOT EXISTS (SELECT 1 FROM app.users WHERE id=actor AND status='active')
    OR NOT EXISTS (SELECT 1 FROM app.branches WHERE tenant_id=tenant AND id=target.branch_id AND status='active')
    OR EXISTS (SELECT 1 FROM app.staff_memberships WHERE tenant_id=tenant AND user_id=actor)
  THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501'; END IF;
  -- A departed/demoted inviter cannot leave a usable invitation behind.
  PERFORM app_private.require_team_admin(target.invited_by,tenant);
  INSERT INTO app.staff_memberships(tenant_id,user_id,role) VALUES(tenant,actor,'branch_staff') RETURNING id INTO member;
  INSERT INTO app.branch_assignments(tenant_id,membership_id,branch_id,role) VALUES(tenant,member,target.branch_id,target.role);
  UPDATE app_private.staff_invitations SET status='accepted',accepted_by=actor WHERE id=target.id;
  INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details)
    VALUES(tenant,target.branch_id,actor,'invitation.accepted',jsonb_build_object('invitationId',target.id,'membershipId',member,'role',target.role));
  RETURN tenant;
END $$;

CREATE FUNCTION app_private.assign_staff(actor uuid, tenant uuid, member uuid, branch uuid, assigned_role text, expected_version integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app.staff_memberships; previous jsonb;
BEGIN
  PERFORM app_private.require_team_admin(actor,tenant);
  SELECT * INTO target FROM app.staff_memberships WHERE tenant_id=tenant AND id=member FOR UPDATE;
  IF NOT FOUND OR target.role<>'branch_staff' OR target.status<>'active' THEN RAISE EXCEPTION 'Staff unavailable' USING ERRCODE='42501'; END IF;
  IF expected_version IS NULL OR target.version<>expected_version THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
  IF assigned_role IS NULL OR assigned_role NOT IN ('branch_owner','manager','staff') OR NOT EXISTS (SELECT 1 FROM app.branches WHERE tenant_id=tenant AND id=branch AND status='active')
  THEN RAISE EXCEPTION 'Invalid assignment' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('branchId',branch_id,'role',role)),'[]'::jsonb) INTO previous
    FROM app.branch_assignments WHERE tenant_id=tenant AND membership_id=member AND status='active';
  -- First team UI supports one active branch per staff; replacement is explicit.
  UPDATE app.branch_assignments SET status='revoked' WHERE tenant_id=tenant AND membership_id=member;
  INSERT INTO app.branch_assignments(tenant_id,membership_id,branch_id,role) VALUES(tenant,member,branch,assigned_role)
    ON CONFLICT (tenant_id,membership_id,branch_id) DO UPDATE SET role=excluded.role,status='active';
  UPDATE app.staff_memberships SET version=version+1 WHERE id=member;
  INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details)
    VALUES(tenant,branch,actor,'staff.assigned',jsonb_build_object('membershipId',member,'before',previous,'role',assigned_role,'version',target.version+1));
END $$;

CREATE FUNCTION app_private.revoke_staff(actor uuid, tenant uuid, member uuid, expected_version integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app.staff_memberships; branch uuid;
BEGIN
  PERFORM app_private.require_team_admin(actor,tenant);
  SELECT * INTO target FROM app.staff_memberships WHERE tenant_id=tenant AND id=member FOR UPDATE;
  IF NOT FOUND OR target.role<>'branch_staff' OR target.status<>'active' THEN RAISE EXCEPTION 'Staff unavailable' USING ERRCODE='42501'; END IF;
  IF expected_version IS NULL OR target.version<>expected_version THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
  SELECT branch_id INTO branch FROM app.branch_assignments WHERE tenant_id=tenant AND membership_id=member ORDER BY branch_id LIMIT 1;
  IF branch IS NULL THEN RAISE EXCEPTION 'Assignment missing' USING ERRCODE='22023'; END IF;
  UPDATE app.staff_memberships SET status='revoked',version=version+1 WHERE id=member;
  UPDATE app.branch_assignments SET status='revoked' WHERE tenant_id=tenant AND membership_id=member;
  INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details)
    VALUES(tenant,branch,actor,'staff.revoked',jsonb_build_object('membershipId',member,'version',target.version+1));
END $$;
REVOKE ALL ON FUNCTION app_private.require_team_admin(uuid,uuid),app_private.team_snapshot(uuid,uuid),
 app_private.invite_staff(uuid,uuid,text,uuid,text,text),app_private.cancel_staff_invitation(uuid,uuid,uuid),
 app_private.accept_staff_invitation(uuid,text,text),app_private.assign_staff(uuid,uuid,uuid,uuid,text,integer),
 app_private.revoke_staff(uuid,uuid,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.team_snapshot(uuid,uuid),app_private.invite_staff(uuid,uuid,text,uuid,text,text),
 app_private.cancel_staff_invitation(uuid,uuid,uuid),app_private.accept_staff_invitation(uuid,text,text),
 app_private.assign_staff(uuid,uuid,uuid,uuid,text,integer),app_private.revoke_staff(uuid,uuid,uuid,integer) TO aismall_app;
