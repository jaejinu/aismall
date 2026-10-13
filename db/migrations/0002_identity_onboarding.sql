-- Trusted server only: these narrowly scoped routines bootstrap identity and the
-- first organization. They intentionally bypass RLS as the migration owner.
-- Never expose them through Data API or grant execution to anon/authenticated.
CREATE TABLE app_private.first_organizations (
  user_id uuid PRIMARY KEY REFERENCES app.users(id),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id)
);
REVOKE ALL ON app_private.first_organizations FROM PUBLIC, aismall_app;
ALTER TABLE app.audit_events DROP CONSTRAINT audit_events_action_check;
ALTER TABLE app.audit_events ADD CONSTRAINT audit_events_action_check
  CHECK (action IN ('branch.renamed', 'organization.created'));
-- Only the audited onboarding routine can create this new event type.
ALTER POLICY audit_insert ON app.audit_events WITH CHECK (
  action = 'branch.renamed' AND actor_user_id = app_private.user_id()
  AND app_private.can_access_branch(tenant_id, branch_id, true)
);

CREATE FUNCTION app_private.resolve_identity(issuer text, subject text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE result uuid;
BEGIN
  IF issuer IS NULL OR issuer !~ '^https://[a-z0-9]+\.supabase\.co/auth/v1$'
    OR subject IS NULL OR subject !~ '^[0-9a-fA-F-]{36}$' THEN
    RAISE EXCEPTION 'Invalid identity' USING ERRCODE = '22023';
  END IF;
  PERFORM subject::uuid;
  INSERT INTO app.users(auth_issuer, auth_subject) VALUES(issuer, subject)
    ON CONFLICT (auth_issuer, auth_subject) DO NOTHING;
  SELECT id INTO result FROM app.users
    WHERE auth_issuer = issuer AND auth_subject = subject AND status = 'active';
  IF result IS NULL THEN RAISE EXCEPTION 'Identity unavailable' USING ERRCODE = '42501'; END IF;
  RETURN result;
END $$;

CREATE FUNCTION app_private.my_organizations(actor uuid)
RETURNS TABLE(id uuid, name text, role text)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT t.id, t.name, m.role FROM app.tenants t
  JOIN app.staff_memberships m ON m.tenant_id = t.id
  JOIN app.users u ON u.id = m.user_id
  WHERE u.id = actor AND u.status = 'active' AND m.status = 'active' AND t.status = 'active'
  ORDER BY t.created_at, t.id
$$;

CREATE FUNCTION app_private.create_first_organization(actor uuid, organization_name text, branch_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE tenant uuid; branch uuid;
BEGIN
  IF organization_name IS NULL OR branch_name IS NULL
    OR char_length(btrim(organization_name)) NOT BETWEEN 1 AND 120
    OR char_length(btrim(branch_name)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Invalid name' USING ERRCODE = '22023';
  END IF;
  -- Serializes retries and concurrent first-organization requests for this user.
  PERFORM 1 FROM app.users WHERE id = actor AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Identity unavailable' USING ERRCODE = '42501'; END IF;
  SELECT tenant_id INTO tenant FROM app_private.first_organizations WHERE user_id = actor;
  IF tenant IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM app_private.my_organizations(actor) o WHERE o.id = tenant) THEN
      RAISE EXCEPTION 'Organization unavailable' USING ERRCODE = '42501';
    END IF;
    RETURN tenant;
  END IF;
  IF EXISTS (SELECT 1 FROM app.staff_memberships WHERE user_id = actor) THEN
    RAISE EXCEPTION 'Onboarding already handled' USING ERRCODE = '42501';
  END IF;
  tenant := gen_random_uuid(); branch := gen_random_uuid();
  INSERT INTO app.tenants(id, slug, name) VALUES(tenant, 'org-' || tenant, btrim(organization_name));
  INSERT INTO app.staff_memberships(tenant_id, user_id, role) VALUES(tenant, actor, 'tenant_admin');
  INSERT INTO app.branches(id, tenant_id, slug, name) VALUES(branch, tenant, 'main', btrim(branch_name));
  INSERT INTO app.audit_events(tenant_id, branch_id, actor_user_id, action, details)
    VALUES(tenant, branch, actor, 'organization.created', jsonb_build_object('source', 'first_onboarding'));
  INSERT INTO app_private.first_organizations(user_id, tenant_id) VALUES(actor, tenant);
  RETURN tenant;
END $$;
REVOKE ALL ON FUNCTION app_private.resolve_identity(text,text), app_private.my_organizations(uuid),
  app_private.create_first_organization(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.resolve_identity(text,text), app_private.my_organizations(uuid),
  app_private.create_first_organization(uuid,text,text) TO aismall_app;
