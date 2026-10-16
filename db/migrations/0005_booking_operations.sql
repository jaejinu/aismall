-- Booking state and attendance are independent. Time passing never marks attendance.
ALTER TABLE app.bookings
 ADD COLUMN attendance text NOT NULL DEFAULT 'unrecorded' CHECK(attendance IN ('unrecorded','attended','no_show')),
 ADD COLUMN attendance_reason text CHECK(char_length(btrim(attendance_reason)) BETWEEN 1 AND 200),
 ADD COLUMN attendance_recorded_at timestamptz,
 ADD CONSTRAINT cancelled_without_attendance CHECK(status <> 'cancelled' OR attendance='unrecorded');
ALTER TABLE app.audit_events DROP CONSTRAINT audit_events_action_check;
ALTER TABLE app.audit_events ADD CONSTRAINT audit_events_action_check CHECK(action IN
 ('branch.renamed','organization.created','staff.invited','invitation.cancelled','invitation.accepted','staff.assigned','staff.revoked',
 'customer.created','program.created','session.created','booking.confirmed','booking.cancelled','booking.rescheduled','booking.attendance_recorded'));

CREATE FUNCTION app_private.reschedule_booking(tenant uuid,branch uuid,booking uuid,destination uuid,expected integer,reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE original app.bookings; current_booking app.bookings; source_session app.sessions; target_session app.sessions;
BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 SELECT * INTO original FROM app.bookings WHERE tenant_id=tenant AND branch_id=branch AND id=booking;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 -- Deterministic session order prevents opposite-direction transfers deadlocking.
 PERFORM id FROM app.sessions WHERE tenant_id=tenant AND branch_id=branch AND id IN (original.session_id,destination) ORDER BY id FOR UPDATE;
 SELECT * INTO current_booking FROM app.bookings WHERE id=booking FOR UPDATE;
 IF expected IS NULL OR current_booking.version<>expected OR current_booking.status<>'confirmed'
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
 IF (SELECT count(*) FROM app.bookings WHERE tenant_id=tenant AND branch_id=branch AND session_id=destination AND status='confirmed')>=target_session.capacity
 THEN RAISE EXCEPTION 'Session full' USING ERRCODE='P0002'; END IF;
 UPDATE app.bookings SET session_id=destination,version=version+1 WHERE id=booking;
 INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details)
 VALUES(tenant,branch,app_private.user_id(),'booking.rescheduled',jsonb_build_object(
  'id',booking,'from_session_id',original.session_id,'to_session_id',destination,'version',current_booking.version+1,'reason',btrim(reason)));
END $$;

CREATE FUNCTION app_private.record_attendance(tenant uuid,branch uuid,booking uuid,expected integer,outcome text,reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app.bookings; meeting app.sessions;
BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 SELECT * INTO target FROM app.bookings WHERE tenant_id=tenant AND branch_id=branch AND id=booking FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF expected IS NULL OR target.version<>expected OR target.status<>'confirmed'
 THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 SELECT * INTO meeting FROM app.sessions WHERE id=target.session_id AND tenant_id=tenant AND branch_id=branch;
 IF outcome IS NULL OR outcome NOT IN ('unrecorded','attended','no_show') OR outcome=target.attendance
    OR reason IS NULL OR char_length(btrim(reason)) NOT BETWEEN 1 AND 200
    OR meeting.starts_at>clock_timestamp() OR (outcome='no_show' AND meeting.ends_at>clock_timestamp())
 THEN RAISE EXCEPTION 'Invalid attendance' USING ERRCODE='22023'; END IF;
 UPDATE app.bookings SET attendance=outcome,attendance_reason=btrim(reason),attendance_recorded_at=clock_timestamp(),version=version+1 WHERE id=booking;
 INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details)
 VALUES(tenant,branch,app_private.user_id(),'booking.attendance_recorded',jsonb_build_object(
  'id',booking,'before',target.attendance,'after',outcome,'version',target.version+1,'reason',btrim(reason)));
END $$;
REVOKE ALL ON FUNCTION app_private.reschedule_booking(uuid,uuid,uuid,uuid,integer,text),
 app_private.record_attendance(uuid,uuid,uuid,integer,text,text) FROM PUBLIC,aismall_app;
GRANT EXECUTE ON FUNCTION app_private.reschedule_booking(uuid,uuid,uuid,uuid,integer,text),
 app_private.record_attendance(uuid,uuid,uuid,integer,text,text) TO aismall_app;
