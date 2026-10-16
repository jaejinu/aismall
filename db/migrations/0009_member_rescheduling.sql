-- Transfer an existing confirmed booking within its program; no new booking is created.
CREATE FUNCTION app_private.reschedule_member_booking(actor uuid,link uuid,booking uuid,destination uuid,expected integer,reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE customer_link app_private.customer_links; tenant uuid; branch uuid; original app.bookings; current_booking app.bookings; source_session app.sessions; target_session app.sessions;
BEGIN
 customer_link:=app_private.require_customer(actor,link);
 tenant:=customer_link.tenant_id; branch:=customer_link.branch_id;
 SELECT * INTO original FROM app.bookings WHERE tenant_id=tenant AND branch_id=branch AND id=booking AND customer_id=customer_link.customer_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 -- Deterministic session order prevents opposite-direction transfers deadlocking.
 PERFORM id FROM app.sessions WHERE tenant_id=tenant AND branch_id=branch AND id IN (original.session_id,destination) ORDER BY id FOR UPDATE;
 SELECT * INTO current_booking FROM app.bookings WHERE id=booking FOR UPDATE;
 IF expected IS NULL OR expected<1 OR current_booking.version<>expected OR current_booking.status<>'confirmed'
    OR current_booking.session_id<>original.session_id OR current_booking.attendance<>'unrecorded'
 THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 SELECT * INTO source_session FROM app.sessions WHERE id=original.session_id AND tenant_id=tenant AND branch_id=branch;
 SELECT * INTO target_session FROM app.sessions WHERE id=destination AND tenant_id=tenant AND branch_id=branch;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF destination=original.session_id OR source_session.program_id<>target_session.program_id
    OR source_session.starts_at<=clock_timestamp()+interval '24 hours'
    OR target_session.starts_at<=clock_timestamp()+interval '24 hours'
    OR reason IS NULL OR char_length(btrim(reason)) NOT BETWEEN 1 AND 200
 THEN RAISE EXCEPTION 'Invalid reschedule' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM app.programs WHERE id=target_session.program_id AND tenant_id=tenant AND branch_id=branch
   AND member_booking_enabled FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Member booking closed' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM app.member_requests WHERE link_id=link AND session_id=destination AND status='pending')
   OR EXISTS(SELECT 1 FROM app.bookings WHERE tenant_id=tenant AND branch_id=branch AND session_id=destination
     AND customer_id=customer_link.customer_id AND status='confirmed')
 THEN RAISE EXCEPTION 'Already requested or booked' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM app.bookings WHERE tenant_id=tenant AND branch_id=branch AND session_id=destination AND status='confirmed')>=target_session.capacity
 THEN RAISE EXCEPTION 'Session full' USING ERRCODE='P0002'; END IF;
 UPDATE app.bookings SET session_id=destination,version=version+1 WHERE id=booking;
 INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details)
 VALUES(tenant,branch,actor,'booking.rescheduled',jsonb_build_object(
  'id',booking,'source','member','link_id',link,'from_session_id',original.session_id,'to_session_id',destination,'version',current_booking.version+1,'reason',btrim(reason)));
END $$;

REVOKE ALL ON FUNCTION app_private.reschedule_member_booking(uuid,uuid,uuid,uuid,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.reschedule_member_booking(uuid,uuid,uuid,uuid,integer,text) TO aismall_app;

CREATE OR REPLACE FUNCTION app_private.member_snapshot(actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;BEGIN
 IF NOT EXISTS(SELECT 1 FROM app.users WHERE id=actor AND status='active') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'branch',b.name,'organization',t.name,
 'sessions',(SELECT coalesce(jsonb_agg(x),'[]') FROM (SELECT s.id,s.program_id,p.name,s.starts_at,s.capacity,
   (SELECT count(*) FROM app.bookings k WHERE k.tenant_id=l.tenant_id AND k.branch_id=l.branch_id AND k.session_id=s.id AND k.status='confirmed') AS confirmed
   FROM app.sessions s JOIN app.programs p ON p.id=s.program_id AND p.tenant_id=s.tenant_id AND p.branch_id=s.branch_id
   WHERE s.tenant_id=l.tenant_id AND s.branch_id=l.branch_id AND p.member_booking_enabled AND s.starts_at>clock_timestamp()+make_interval(hours=>p.application_deadline_hours)
   ORDER BY s.starts_at,s.id LIMIT 100) x),
 'requests',(SELECT coalesce(jsonb_agg(x),'[]') FROM (SELECT r.id,r.session_id,r.version,r.status,r.decision_reason,p.name,s.starts_at FROM app.member_requests r
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
