ALTER TABLE app.programs ADD COLUMN member_booking_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN application_deadline_hours integer NOT NULL DEFAULT 24 CHECK(application_deadline_hours IN (2,24));
ALTER TABLE app.bookings ADD CONSTRAINT bookings_tenant_branch_id UNIQUE(tenant_id,branch_id,id);
CREATE TABLE app_private.customer_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,branch_id uuid NOT NULL,customer_id uuid NOT NULL,
 email text NOT NULL CHECK(email=lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 254),
 token_hash text NOT NULL UNIQUE CHECK(token_hash ~ '^[0-9a-f]{64}$'),expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',
 invited_by uuid NOT NULL REFERENCES app.users(id),user_id uuid REFERENCES app.users(id),
 status text NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','active','revoked')),
 UNIQUE(tenant_id,branch_id,customer_id),UNIQUE(tenant_id,branch_id,id),
 FOREIGN KEY(tenant_id,branch_id,customer_id) REFERENCES app.customers(tenant_id,branch_id,id)
);
CREATE UNIQUE INDEX customer_link_user_branch ON app_private.customer_links(tenant_id,branch_id,user_id) WHERE user_id IS NOT NULL;
CREATE TABLE app.member_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,branch_id uuid NOT NULL,link_id uuid NOT NULL,
 customer_id uuid NOT NULL,session_id uuid NOT NULL,request_key uuid NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','withdrawn')),
 version integer NOT NULL DEFAULT 1,booking_id uuid,decision_reason text CHECK(char_length(btrim(decision_reason)) BETWEEN 1 AND 200),
 created_at timestamptz NOT NULL DEFAULT now(),decided_at timestamptz,
 UNIQUE(link_id,request_key),
 CHECK((status='approved')=(booking_id IS NOT NULL)),
 FOREIGN KEY(tenant_id,branch_id,link_id) REFERENCES app_private.customer_links(tenant_id,branch_id,id),
 FOREIGN KEY(tenant_id,branch_id,customer_id) REFERENCES app.customers(tenant_id,branch_id,id),
 FOREIGN KEY(tenant_id,branch_id,session_id) REFERENCES app.sessions(tenant_id,branch_id,id),
 FOREIGN KEY(tenant_id,branch_id,booking_id) REFERENCES app.bookings(tenant_id,branch_id,id)
);
CREATE UNIQUE INDEX requests_one_pending ON app.member_requests(tenant_id,branch_id,customer_id,session_id) WHERE status='pending';
CREATE INDEX requests_branch_status ON app.member_requests(tenant_id,branch_id,status,created_at);
ALTER TABLE app.member_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.member_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY requests_staff_read ON app.member_requests FOR SELECT TO aismall_app USING
 (app_private.can_access_branch(tenant_id,branch_id) AND EXISTS(SELECT 1 FROM app.branches b WHERE b.tenant_id=member_requests.tenant_id AND b.id=member_requests.branch_id));
REVOKE ALL ON app.member_requests,app_private.customer_links FROM PUBLIC,aismall_app;
GRANT SELECT ON app.member_requests TO aismall_app;
ALTER TABLE app.audit_events DROP CONSTRAINT audit_events_action_check;
ALTER TABLE app.audit_events ADD CONSTRAINT audit_events_action_check CHECK(action IN
 ('branch.renamed','organization.created','staff.invited','invitation.cancelled','invitation.accepted','staff.assigned','staff.revoked',
 'customer.created','program.created','session.created','booking.confirmed','booking.cancelled','booking.rescheduled','booking.attendance_recorded',
 'member.invited','member.linked','member.revoked','program.member_policy','request.created','request.approved','request.rejected','request.withdrawn'));

CREATE FUNCTION app_private.invite_customer(tenant uuid,branch uuid,customer uuid,email_address text,hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result uuid;BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 INSERT INTO app_private.customer_links(tenant_id,branch_id,customer_id,email,token_hash,invited_by)
 VALUES(tenant,branch,customer,lower(btrim(email_address)),hash,app_private.user_id()) ON CONFLICT(tenant_id,branch_id,customer_id) DO UPDATE
 SET email=excluded.email,token_hash=excluded.token_hash,expires_at=clock_timestamp()+interval '7 days',invited_by=excluded.invited_by
 WHERE customer_links.status='invited' RETURNING id INTO result;
 IF result IS NULL THEN RAISE EXCEPTION 'Already linked or revoked' USING ERRCODE='42501'; END IF;
 PERFORM app_private.booking_audit(tenant,branch,'member.invited',result);RETURN result;
END $$;
CREATE FUNCTION app_private.accept_customer(actor uuid,verified_email text,hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app_private.customer_links;BEGIN
 SELECT * INTO target FROM app_private.customer_links WHERE token_hash=hash;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM app.tenants WHERE id=target.tenant_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM app.branches WHERE id=target.branch_id AND tenant_id=target.tenant_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO target FROM app_private.customer_links WHERE id=target.id FOR UPDATE;
 IF target.status<>'invited' OR target.expires_at<=clock_timestamp() OR target.email IS DISTINCT FROM lower(btrim(verified_email))
 OR NOT EXISTS(SELECT 1 FROM app.users WHERE id=actor AND status='active')
 OR NOT EXISTS(SELECT 1 FROM app.staff_memberships m JOIN app.users u ON u.id=m.user_id WHERE m.tenant_id=target.tenant_id AND m.user_id=target.invited_by AND m.status='active' AND u.status='active'
  AND (m.role='tenant_admin' OR EXISTS(SELECT 1 FROM app.branch_assignments a WHERE a.tenant_id=m.tenant_id AND a.membership_id=m.id AND a.branch_id=target.branch_id AND a.status='active' AND a.role IN ('branch_owner','manager'))))
 THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 UPDATE app_private.customer_links SET status='active',user_id=actor WHERE id=target.id;
 INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details) VALUES(target.tenant_id,target.branch_id,actor,'member.linked',jsonb_build_object('id',target.id));
END $$;
CREATE FUNCTION app_private.require_customer(actor uuid,link uuid) RETURNS app_private.customer_links
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app_private.customer_links;BEGIN
 SELECT * INTO target FROM app_private.customer_links WHERE id=link AND user_id=actor;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM app.tenants WHERE id=target.tenant_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM app.branches WHERE tenant_id=target.tenant_id AND id=target.branch_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO target FROM app_private.customer_links WHERE id=link AND user_id=actor AND status='active' FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM app.users WHERE id=actor AND status='active') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 RETURN target;
END $$;
CREATE FUNCTION app_private.member_snapshot(actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;BEGIN
 IF NOT EXISTS(SELECT 1 FROM app.users WHERE id=actor AND status='active') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'branch',b.name,'organization',t.name,
 'sessions',(SELECT coalesce(jsonb_agg(x),'[]') FROM (SELECT s.id,p.name,s.starts_at,s.capacity,
   (SELECT count(*) FROM app.bookings k WHERE k.tenant_id=l.tenant_id AND k.branch_id=l.branch_id AND k.session_id=s.id AND k.status='confirmed') AS confirmed
   FROM app.sessions s JOIN app.programs p ON p.id=s.program_id AND p.tenant_id=s.tenant_id AND p.branch_id=s.branch_id
   WHERE s.tenant_id=l.tenant_id AND s.branch_id=l.branch_id AND p.member_booking_enabled AND s.starts_at>clock_timestamp()+make_interval(hours=>p.application_deadline_hours)
   ORDER BY s.starts_at,s.id LIMIT 100) x),
 'requests',(SELECT coalesce(jsonb_agg(x),'[]') FROM (SELECT r.id,r.version,r.status,r.decision_reason,p.name,s.starts_at FROM app.member_requests r
   JOIN app.sessions s ON s.id=r.session_id JOIN app.programs p ON p.id=s.program_id
   WHERE r.link_id=l.id ORDER BY r.created_at DESC,r.id LIMIT 100) x),
 'bookings',(SELECT coalesce(jsonb_agg(x),'[]') FROM (SELECT k.id,k.status,k.attendance,p.name,s.starts_at FROM app.bookings k JOIN app.sessions s ON s.id=k.session_id JOIN app.programs p ON p.id=s.program_id
   WHERE k.tenant_id=l.tenant_id AND k.branch_id=l.branch_id AND k.customer_id=l.customer_id ORDER BY k.created_at DESC,k.id LIMIT 100) x)
 )),'[]') INTO result FROM app_private.customer_links l JOIN app.branches b ON b.id=l.branch_id AND b.tenant_id=l.tenant_id AND b.status='active'
 JOIN app.tenants t ON t.id=l.tenant_id AND t.status='active' WHERE l.user_id=actor AND l.status='active';
 RETURN result;
END $$;
CREATE FUNCTION app_private.request_booking(actor uuid,link uuid,session uuid,key uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app_private.customer_links; meeting app.sessions; previous app.member_requests; result uuid;BEGIN
 target:=app_private.require_customer(actor,link);
 SELECT * INTO meeting FROM app.sessions WHERE tenant_id=target.tenant_id AND branch_id=target.branch_id AND id=session FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO previous FROM app.member_requests WHERE link_id=link AND request_key=key;
 IF FOUND THEN
  IF previous.session_id<>session THEN RAISE EXCEPTION 'Request conflict' USING ERRCODE='22023'; END IF;RETURN previous.id;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM app.programs p WHERE p.id=meeting.program_id AND p.member_booking_enabled AND meeting.starts_at>clock_timestamp()+make_interval(hours=>p.application_deadline_hours))
 OR EXISTS(SELECT 1 FROM app.bookings WHERE tenant_id=target.tenant_id AND branch_id=target.branch_id AND session_id=session AND customer_id=target.customer_id AND status='confirmed')
 OR (SELECT count(*) FROM app.member_requests WHERE link_id=link AND status='pending')>=20
 THEN RAISE EXCEPTION 'Cannot request' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM app.bookings WHERE tenant_id=target.tenant_id AND branch_id=target.branch_id AND session_id=session AND status='confirmed')>=meeting.capacity
 THEN RAISE EXCEPTION 'Session full' USING ERRCODE='P0002'; END IF;
 INSERT INTO app.member_requests(tenant_id,branch_id,link_id,customer_id,session_id,request_key) VALUES(target.tenant_id,target.branch_id,link,target.customer_id,session,key) RETURNING id INTO result;
 INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details) VALUES(target.tenant_id,target.branch_id,actor,'request.created',jsonb_build_object('id',result)); RETURN result;
END $$;
CREATE FUNCTION app_private.withdraw_request(actor uuid,link uuid,request uuid,expected integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app_private.customer_links;BEGIN
 target:=app_private.require_customer(actor,link);
 UPDATE app.member_requests SET status='withdrawn',version=version+1,decided_at=clock_timestamp() WHERE id=request AND link_id=link AND status='pending' AND version=expected;
 IF NOT FOUND THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details) VALUES(target.tenant_id,target.branch_id,actor,'request.withdrawn',jsonb_build_object('id',request));
END $$;
CREATE FUNCTION app_private.decide_request(tenant uuid,branch uuid,request uuid,expected integer,approve boolean,reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app.member_requests; linked app_private.customer_links; booking uuid;BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 SELECT * INTO target FROM app.member_requests WHERE tenant_id=tenant AND branch_id=branch AND id=request;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO linked FROM app_private.customer_links WHERE id=target.link_id FOR SHARE;
 PERFORM 1 FROM app.sessions WHERE id=target.session_id FOR UPDATE;
 SELECT * INTO target FROM app.member_requests WHERE id=request FOR UPDATE;
 IF expected IS NULL OR target.version<>expected OR target.status<>'pending' THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 IF approve IS NULL OR reason IS NULL OR char_length(btrim(reason)) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Invalid decision' USING ERRCODE='22023'; END IF;
 IF approve THEN
  IF linked.status<>'active' OR NOT EXISTS(SELECT 1 FROM app.users WHERE id=linked.user_id AND status='active') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  booking:=app_private.confirm_booking(tenant,branch,target.session_id,target.customer_id,target.id);
  IF NOT EXISTS(SELECT 1 FROM app.bookings WHERE id=booking AND status='confirmed' AND session_id=target.session_id) THEN RAISE EXCEPTION 'Booking conflict' USING ERRCODE='40001'; END IF;
 END IF;
 UPDATE app.member_requests SET status=CASE WHEN approve THEN 'approved' ELSE 'rejected' END,version=version+1,booking_id=booking,decision_reason=btrim(reason),decided_at=clock_timestamp() WHERE id=request;
 PERFORM app_private.booking_audit(tenant,branch,CASE WHEN approve THEN 'request.approved' ELSE 'request.rejected' END,request);
END $$;
CREATE FUNCTION app_private.customer_links_for_staff(tenant uuid,branch uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'customer',c.name,'email',l.email,'status',l.status,'expires_at',l.expires_at)),'[]') INTO result
 FROM app_private.customer_links l JOIN app.customers c ON c.id=l.customer_id WHERE l.tenant_id=tenant AND l.branch_id=branch;
 RETURN result;
END $$;
CREATE FUNCTION app_private.revoke_customer(tenant uuid,branch uuid,link uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 UPDATE app_private.customer_links SET status='revoked' WHERE id=link AND tenant_id=tenant AND branch_id=branch AND status<>'revoked';
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM app_private.booking_audit(tenant,branch,'member.revoked',link);
END $$;
CREATE FUNCTION app_private.set_member_policy(tenant uuid,branch uuid,program uuid,enabled boolean,hours integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 UPDATE app.programs SET member_booking_enabled=enabled,application_deadline_hours=hours WHERE id=program AND tenant_id=tenant AND branch_id=branch;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM app_private.booking_audit(tenant,branch,'program.member_policy',program);
END $$;
REVOKE ALL ON FUNCTION app_private.invite_customer(uuid,uuid,uuid,text,text),app_private.accept_customer(uuid,text,text),app_private.require_customer(uuid,uuid),
 app_private.member_snapshot(uuid),app_private.request_booking(uuid,uuid,uuid,uuid),app_private.withdraw_request(uuid,uuid,uuid,integer),
 app_private.decide_request(uuid,uuid,uuid,integer,boolean,text),app_private.customer_links_for_staff(uuid,uuid),app_private.revoke_customer(uuid,uuid,uuid),app_private.set_member_policy(uuid,uuid,uuid,boolean,integer) FROM PUBLIC,aismall_app;
GRANT EXECUTE ON FUNCTION app_private.invite_customer(uuid,uuid,uuid,text,text),app_private.accept_customer(uuid,text,text),app_private.member_snapshot(uuid),
 app_private.request_booking(uuid,uuid,uuid,uuid),app_private.withdraw_request(uuid,uuid,uuid,integer),app_private.decide_request(uuid,uuid,uuid,integer,boolean,text),
 app_private.customer_links_for_staff(uuid,uuid),app_private.revoke_customer(uuid,uuid,uuid),app_private.set_member_policy(uuid,uuid,uuid,boolean,integer) TO aismall_app;
