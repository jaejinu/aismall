-- Preserve confirmation request semantics even after the booking is moved.
ALTER TABLE app.bookings ADD COLUMN requested_session_id uuid;
UPDATE app.bookings b SET requested_session_id=coalesce(
 (SELECT (a.details->>'from_session_id')::uuid FROM app.audit_events a
  WHERE a.tenant_id=b.tenant_id AND a.branch_id=b.branch_id AND a.action='booking.rescheduled' AND a.details->>'id'=b.id::text
  ORDER BY (a.details->>'version')::integer,a.created_at,a.id LIMIT 1), b.session_id);
ALTER TABLE app.bookings ALTER COLUMN requested_session_id SET NOT NULL;
ALTER TABLE app.bookings ADD CONSTRAINT bookings_request_session_fk FOREIGN KEY(tenant_id,branch_id,requested_session_id)
 REFERENCES app.sessions(tenant_id,branch_id,id);
CREATE OR REPLACE FUNCTION app_private.confirm_booking(tenant uuid,branch uuid,session uuid,customer uuid,request uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app.sessions; previous app.bookings; result uuid; BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 SELECT * INTO target FROM app.sessions WHERE tenant_id=tenant AND branch_id=branch AND id=session FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO previous FROM app.bookings WHERE tenant_id=tenant AND branch_id=branch AND request_id=request;
 IF FOUND THEN
  IF previous.requested_session_id<>session OR previous.customer_id<>customer THEN RAISE EXCEPTION 'Request conflict' USING ERRCODE='22023'; END IF;
  RETURN previous.id; -- Retrying must never restore a cancelled reservation.
 END IF;
 IF target.starts_at<=clock_timestamp() THEN RAISE EXCEPTION 'Session started' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM app.bookings WHERE tenant_id=tenant AND branch_id=branch AND session_id=session AND status='confirmed')>=target.capacity
 THEN RAISE EXCEPTION 'Session full' USING ERRCODE='P0002'; END IF;
 INSERT INTO app.bookings(tenant_id,branch_id,session_id,customer_id,request_id,requested_session_id)
 VALUES(tenant,branch,session,customer,request,session) RETURNING id INTO result;
 PERFORM app_private.booking_audit(tenant,branch,'booking.confirmed',result); RETURN result;
END $$;
