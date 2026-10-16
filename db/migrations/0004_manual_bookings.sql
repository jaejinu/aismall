-- Manual operations only. Member requests, waitlists and attendance are separate domains.
CREATE TABLE app.customers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, branch_id uuid NOT NULL,
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,branch_id,id), FOREIGN KEY(tenant_id,branch_id) REFERENCES app.branches(tenant_id,id)
);
CREATE TABLE app.programs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, branch_id uuid NOT NULL,
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,branch_id,id), FOREIGN KEY(tenant_id,branch_id) REFERENCES app.branches(tenant_id,id)
);
CREATE TABLE app.sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, branch_id uuid NOT NULL, program_id uuid NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 1000),
 CHECK(isfinite(starts_at) AND isfinite(ends_at) AND ends_at > starts_at),
 UNIQUE(tenant_id,branch_id,id), FOREIGN KEY(tenant_id,branch_id,program_id) REFERENCES app.programs(tenant_id,branch_id,id)
);
CREATE TABLE app.bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, branch_id uuid NOT NULL,
 session_id uuid NOT NULL, customer_id uuid NOT NULL, request_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 cancellation_reason text CHECK(char_length(btrim(cancellation_reason)) BETWEEN 1 AND 200),
 created_at timestamptz NOT NULL DEFAULT now(), cancelled_at timestamptz,
 CHECK((status='confirmed' AND cancelled_at IS NULL AND cancellation_reason IS NULL) OR
       (status='cancelled' AND cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL)),
 UNIQUE(tenant_id,branch_id,request_id),
 FOREIGN KEY(tenant_id,branch_id,session_id) REFERENCES app.sessions(tenant_id,branch_id,id),
 FOREIGN KEY(tenant_id,branch_id,customer_id) REFERENCES app.customers(tenant_id,branch_id,id)
);
CREATE UNIQUE INDEX bookings_one_active_customer ON app.bookings(tenant_id,branch_id,session_id,customer_id) WHERE status='confirmed';
CREATE INDEX sessions_branch_time ON app.sessions(tenant_id,branch_id,starts_at);
CREATE INDEX bookings_branch_created ON app.bookings(tenant_id,branch_id,created_at DESC);

DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['customers','programs','sessions','bookings'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tbl);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tbl);
  EXECUTE format('CREATE POLICY branch_read ON app.%I FOR SELECT TO aismall_app USING
   (app_private.can_access_branch(tenant_id,branch_id) AND EXISTS
    (SELECT 1 FROM app.branches b WHERE b.tenant_id=%I.tenant_id AND b.id=%I.branch_id))',tbl,tbl,tbl);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC,aismall_app',tbl);
  EXECUTE format('GRANT SELECT ON app.%I TO aismall_app',tbl);
 END LOOP;
END $$;
ALTER TABLE app.audit_events DROP CONSTRAINT audit_events_action_check;
ALTER TABLE app.audit_events ADD CONSTRAINT audit_events_action_check CHECK(action IN
 ('branch.renamed','organization.created','staff.invited','invitation.cancelled','invitation.accepted','staff.assigned','staff.revoked',
 'customer.created','program.created','session.created','booking.confirmed','booking.cancelled'));

-- Same tenant lock order as team management. SHARE permits independent operations
-- while serializing against role changes/revocation (which lock tenant FOR UPDATE).
CREATE FUNCTION app_private.require_booking_operator(tenant uuid, branch uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF tenant IS DISTINCT FROM app_private.tenant_id() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM app.tenants WHERE id=tenant AND status='active' FOR SHARE;
 IF NOT FOUND OR NOT EXISTS (
  SELECT 1 FROM app.staff_memberships m JOIN app.users u ON u.id=m.user_id
  WHERE m.tenant_id=tenant AND m.user_id=app_private.user_id() AND m.status='active' AND u.status='active'
  AND (m.role='tenant_admin' OR EXISTS(SELECT 1 FROM app.branch_assignments a
   WHERE a.tenant_id=tenant AND a.membership_id=m.id AND a.branch_id=branch AND a.status='active' AND a.role IN ('branch_owner','manager')))
 ) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM app.branches WHERE tenant_id=tenant AND id=branch AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
END $$;
CREATE FUNCTION app_private.booking_audit(tenant uuid,branch uuid,event text,entity uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
 INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details)
 VALUES(tenant,branch,app_private.user_id(),event,jsonb_build_object('id',entity))
$$;
CREATE FUNCTION app_private.create_customer(tenant uuid,branch uuid,label text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result uuid; BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 INSERT INTO app.customers(tenant_id,branch_id,name) VALUES(tenant,branch,btrim(label)) RETURNING id INTO result;
 PERFORM app_private.booking_audit(tenant,branch,'customer.created',result); RETURN result;
END $$;
CREATE FUNCTION app_private.create_program(tenant uuid,branch uuid,label text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result uuid; BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 INSERT INTO app.programs(tenant_id,branch_id,name) VALUES(tenant,branch,btrim(label)) RETURNING id INTO result;
 PERFORM app_private.booking_audit(tenant,branch,'program.created',result); RETURN result;
END $$;
CREATE FUNCTION app_private.create_session(tenant uuid,branch uuid,program uuid,starts timestamptz,ends timestamptz,seats integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result uuid; BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 IF starts <= clock_timestamp() THEN RAISE EXCEPTION 'Session must be in future' USING ERRCODE='22023'; END IF;
 INSERT INTO app.sessions(tenant_id,branch_id,program_id,starts_at,ends_at,capacity)
 VALUES(tenant,branch,program,starts,ends,seats) RETURNING id INTO result;
 PERFORM app_private.booking_audit(tenant,branch,'session.created',result); RETURN result;
END $$;
CREATE FUNCTION app_private.confirm_booking(tenant uuid,branch uuid,session uuid,customer uuid,request uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app.sessions; previous app.bookings; result uuid; BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 SELECT * INTO target FROM app.sessions WHERE tenant_id=tenant AND branch_id=branch AND id=session FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO previous FROM app.bookings WHERE tenant_id=tenant AND branch_id=branch AND request_id=request;
 IF FOUND THEN
  IF previous.session_id<>session OR previous.customer_id<>customer THEN RAISE EXCEPTION 'Request conflict' USING ERRCODE='22023'; END IF;
  RETURN previous.id; -- Retrying must never restore a cancelled reservation.
 END IF;
 IF target.starts_at<=clock_timestamp() THEN RAISE EXCEPTION 'Session started' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM app.bookings WHERE tenant_id=tenant AND branch_id=branch AND session_id=session AND status='confirmed')>=target.capacity
 THEN RAISE EXCEPTION 'Session full' USING ERRCODE='P0002'; END IF;
 INSERT INTO app.bookings(tenant_id,branch_id,session_id,customer_id,request_id)
 VALUES(tenant,branch,session,customer,request) RETURNING id INTO result;
 PERFORM app_private.booking_audit(tenant,branch,'booking.confirmed',result); RETURN result;
END $$;
CREATE FUNCTION app_private.cancel_booking(tenant uuid,branch uuid,booking uuid,expected integer,reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app.bookings; starts timestamptz; BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 SELECT * INTO target FROM app.bookings WHERE tenant_id=tenant AND branch_id=branch AND id=booking;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 -- Lock session first, matching confirmation; count and cancellation are serialized.
 SELECT starts_at INTO starts FROM app.sessions WHERE id=target.session_id AND tenant_id=tenant AND branch_id=branch FOR UPDATE;
 SELECT * INTO target FROM app.bookings WHERE id=booking FOR UPDATE;
 IF expected IS NULL OR expected<1 OR target.version<>expected OR target.status<>'confirmed' THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 IF starts<=clock_timestamp()+interval '24 hours' THEN RAISE EXCEPTION 'Cancellation closed' USING ERRCODE='22023'; END IF;
 UPDATE app.bookings SET status='cancelled',version=version+1,cancellation_reason=btrim(reason),cancelled_at=clock_timestamp() WHERE id=booking;
 PERFORM app_private.booking_audit(tenant,branch,'booking.cancelled',booking);
END $$;
REVOKE ALL ON FUNCTION app_private.require_booking_operator(uuid,uuid),app_private.booking_audit(uuid,uuid,text,uuid),
 app_private.create_customer(uuid,uuid,text),app_private.create_program(uuid,uuid,text),
 app_private.create_session(uuid,uuid,uuid,timestamptz,timestamptz,integer),
 app_private.confirm_booking(uuid,uuid,uuid,uuid,uuid),app_private.cancel_booking(uuid,uuid,uuid,integer,text) FROM PUBLIC,aismall_app;
GRANT EXECUTE ON FUNCTION app_private.create_customer(uuid,uuid,text),app_private.create_program(uuid,uuid,text),
 app_private.create_session(uuid,uuid,uuid,timestamptz,timestamptz,integer),
 app_private.confirm_booking(uuid,uuid,uuid,uuid,uuid),app_private.cancel_booking(uuid,uuid,uuid,integer,text) TO aismall_app;
