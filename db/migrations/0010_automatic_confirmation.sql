-- Existing programs and pending requests remain manual until explicitly configured.
ALTER TABLE app.programs ADD COLUMN confirmation_mode text NOT NULL DEFAULT 'manual' CHECK(confirmation_mode IN ('manual','automatic'));
ALTER TABLE app.member_requests ADD COLUMN confirmation_mode text NOT NULL DEFAULT 'manual' CHECK(confirmation_mode IN ('manual','automatic'));

CREATE FUNCTION app_private.set_member_policy(tenant uuid,branch uuid,program uuid,enabled boolean,hours integer,mode text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous app.programs;
BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 IF enabled IS NULL OR hours IS NULL OR hours NOT IN (2,24) OR mode IS NULL OR mode NOT IN ('manual','automatic')
 THEN RAISE EXCEPTION 'Invalid policy' USING ERRCODE='22023'; END IF;
 SELECT * INTO previous FROM app.programs WHERE id=program AND tenant_id=tenant AND branch_id=branch FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 UPDATE app.programs SET member_booking_enabled=enabled,application_deadline_hours=hours,confirmation_mode=mode WHERE id=program;
 INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details)
 VALUES(tenant,branch,app_private.user_id(),'program.member_policy',jsonb_build_object('id',program,
 'before',jsonb_build_object('enabled',previous.member_booking_enabled,'hours',previous.application_deadline_hours,'mode',previous.confirmation_mode),
 'after',jsonb_build_object('enabled',enabled,'hours',hours,'mode',mode)));
END $$;
CREATE OR REPLACE FUNCTION app_private.set_member_policy(tenant uuid,branch uuid,program uuid,enabled boolean,hours integer) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT app_private.set_member_policy(tenant,branch,program,enabled,hours,'manual');
$$;

CREATE FUNCTION app_private.request_booking(actor uuid,link uuid,session uuid,key uuid,expected_mode text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app_private.customer_links; meeting app.sessions; policy app.programs; previous app.member_requests; result uuid; booking uuid;
BEGIN
 target:=app_private.require_customer(actor,link);
 IF key IS NULL OR expected_mode IS NULL OR expected_mode NOT IN ('manual','automatic') THEN RAISE EXCEPTION 'Invalid request' USING ERRCODE='22023'; END IF;
 SELECT * INTO meeting FROM app.sessions WHERE tenant_id=target.tenant_id AND branch_id=target.branch_id AND id=session FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO previous FROM app.member_requests WHERE link_id=link AND request_key=key;
 IF FOUND THEN
  IF previous.session_id<>session OR previous.confirmation_mode<>expected_mode THEN RAISE EXCEPTION 'Request conflict' USING ERRCODE='22023'; END IF;
  RETURN previous.id;
 END IF;
 SELECT * INTO policy FROM app.programs WHERE id=meeting.program_id AND tenant_id=target.tenant_id AND branch_id=target.branch_id FOR SHARE;
 IF policy.confirmation_mode<>expected_mode THEN RAISE EXCEPTION 'Policy changed' USING ERRCODE='40001'; END IF;
 IF NOT policy.member_booking_enabled OR meeting.starts_at<=clock_timestamp()+make_interval(hours=>policy.application_deadline_hours)
 OR EXISTS(SELECT 1 FROM app.bookings WHERE tenant_id=target.tenant_id AND branch_id=target.branch_id AND session_id=session AND customer_id=target.customer_id AND status='confirmed')
 OR EXISTS(SELECT 1 FROM app.member_requests WHERE link_id=link AND session_id=session AND status='pending')
 OR (policy.confirmation_mode='manual' AND (SELECT count(*) FROM app.member_requests WHERE link_id=link AND status='pending')>=20)
 THEN RAISE EXCEPTION 'Cannot request' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM app.bookings WHERE tenant_id=target.tenant_id AND branch_id=target.branch_id AND session_id=session AND status='confirmed')>=meeting.capacity
 THEN RAISE EXCEPTION 'Session full' USING ERRCODE='P0002'; END IF;
 INSERT INTO app.member_requests(tenant_id,branch_id,link_id,customer_id,session_id,request_key,confirmation_mode)
 VALUES(target.tenant_id,target.branch_id,link,target.customer_id,session,key,policy.confirmation_mode) RETURNING id INTO result;
 INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details)
 VALUES(target.tenant_id,target.branch_id,actor,'request.created',jsonb_build_object('id',result,'mode',policy.confirmation_mode));
 IF policy.confirmation_mode='automatic' THEN
  INSERT INTO app.bookings(tenant_id,branch_id,session_id,customer_id,request_id,requested_session_id)
  VALUES(target.tenant_id,target.branch_id,session,target.customer_id,result,session) RETURNING id INTO booking;
  UPDATE app.member_requests SET status='approved',version=version+1,booking_id=booking,decision_reason='프로그램 설정에 따라 자동 확정',decided_at=clock_timestamp() WHERE id=result;
  INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details) VALUES
   (target.tenant_id,target.branch_id,actor,'booking.confirmed',jsonb_build_object('id',booking,'source','member','mode','automatic','request_id',result)),
   (target.tenant_id,target.branch_id,actor,'request.approved',jsonb_build_object('id',result,'source','member','mode','automatic'));
 END IF;
 RETURN result;
END $$;
-- Old clients can only express manual intent; a policy change requires a fresh view.
CREATE OR REPLACE FUNCTION app_private.request_booking(actor uuid,link uuid,session uuid,key uuid) RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT app_private.request_booking(actor,link,session,key,'manual');
$$;
REVOKE ALL ON FUNCTION app_private.set_member_policy(uuid,uuid,uuid,boolean,integer,text),app_private.request_booking(uuid,uuid,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.set_member_policy(uuid,uuid,uuid,boolean,integer,text),app_private.request_booking(uuid,uuid,uuid,uuid,text) TO aismall_app;

CREATE OR REPLACE FUNCTION app_private.member_snapshot(actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;BEGIN
 IF NOT EXISTS(SELECT 1 FROM app.users WHERE id=actor AND status='active') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'branch',b.name,'organization',t.name,
 'sessions',(SELECT coalesce(jsonb_agg(x),'[]') FROM (SELECT s.id,s.program_id,p.confirmation_mode,p.name,s.starts_at,s.capacity,
   (SELECT count(*) FROM app.bookings k WHERE k.tenant_id=l.tenant_id AND k.branch_id=l.branch_id AND k.session_id=s.id AND k.status='confirmed') AS confirmed
   FROM app.sessions s JOIN app.programs p ON p.id=s.program_id AND p.tenant_id=s.tenant_id AND p.branch_id=s.branch_id
   WHERE s.tenant_id=l.tenant_id AND s.branch_id=l.branch_id AND p.member_booking_enabled AND s.starts_at>clock_timestamp()+make_interval(hours=>p.application_deadline_hours)
   ORDER BY s.starts_at,s.id LIMIT 100) x),
 'requests',(SELECT coalesce(jsonb_agg(x),'[]') FROM (SELECT r.id,r.session_id,r.confirmation_mode,r.version,r.status,r.decision_reason,p.name,s.starts_at FROM app.member_requests r
   JOIN app.sessions s ON s.id=r.session_id JOIN app.programs p ON p.id=s.program_id
   WHERE r.link_id=l.id ORDER BY r.created_at DESC,r.id LIMIT 100) x),
 'bookings',(SELECT coalesce(jsonb_agg(x),'[]') FROM (SELECT k.id,k.session_id,s.program_id,k.version,k.status,k.attendance,p.name,s.starts_at,
   (k.status='confirmed' AND k.attendance='unrecorded' AND s.starts_at>clock_timestamp()+interval '24 hours') AS cancellable,
   (k.status='confirmed' AND k.attendance='unrecorded' AND p.member_booking_enabled AND s.starts_at>clock_timestamp()+interval '24 hours') AS reschedulable FROM app.bookings k JOIN app.sessions s ON s.id=k.session_id JOIN app.programs p ON p.id=s.program_id
   WHERE k.tenant_id=l.tenant_id AND k.branch_id=l.branch_id AND k.customer_id=l.customer_id ORDER BY k.created_at DESC,k.id LIMIT 100) x)
 )),'[]') INTO result FROM app_private.customer_links l JOIN app.branches b ON b.id=l.branch_id AND b.tenant_id=l.tenant_id AND b.status='active'
 JOIN app.tenants t ON t.id=l.tenant_id AND t.status='active' WHERE l.user_id=actor AND l.status='active';
 RETURN result;
END $$;
