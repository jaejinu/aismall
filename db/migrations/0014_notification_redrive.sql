-- Bounded manual recovery. Keep the original provider idempotency key.
ALTER TABLE app_private.booking_outbox ADD COLUMN redrive_count integer NOT NULL DEFAULT 0 CHECK(redrive_count BETWEEN 0 AND 3);
CREATE TABLE app_private.notification_redrives(
 outbox_id uuid NOT NULL REFERENCES app_private.booking_outbox(id),
 generation integer NOT NULL CHECK(generation BETWEEN 1 AND 3),
 actor_user_id uuid NOT NULL REFERENCES app.users(id),
 previous_attempts integer NOT NULL,previous_error text,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(outbox_id,generation)
);
REVOKE ALL ON app_private.notification_redrives FROM PUBLIC,aismall_app,aismall_notification_worker;
CREATE FUNCTION app_private.redrive_booking_notification(tenant uuid,branch uuid,job uuid,expected integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item app_private.booking_outbox; current_version integer;
BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 IF expected IS NULL OR expected NOT BETWEEN 0 AND 2 THEN RAISE EXCEPTION 'Invalid generation' USING ERRCODE='22023'; END IF;
 -- Booking before outbox matches booking mutations and serializes newer events.
 SELECT k.version INTO current_version FROM app.bookings k
 JOIN app_private.booking_outbox o ON o.booking_id=k.id AND o.tenant_id=k.tenant_id AND o.branch_id=k.branch_id
 WHERE o.id=job AND o.tenant_id=tenant AND o.branch_id=branch FOR UPDATE OF k;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable notification' USING ERRCODE='42501'; END IF;
 SELECT * INTO item FROM app_private.booking_outbox WHERE id=job AND tenant_id=tenant AND branch_id=branch FOR UPDATE;
 -- Replay of an already accepted generation never resets an active lease or later failure.
 IF item.redrive_count=expected+1 THEN RETURN; END IF;
 IF item.redrive_count<>expected OR item.status<>'dead' OR item.booking_version<>current_version
 OR item.created_at<=clock_timestamp()-interval '24 hours' OR (item.payload->>'starts_at')::timestamptz<=clock_timestamp()
 THEN RAISE EXCEPTION 'Notification cannot be retried' USING ERRCODE='40001'; END IF;
 INSERT INTO app_private.notification_redrives(outbox_id,generation,actor_user_id,previous_attempts,previous_error)
 VALUES(job,expected+1,app_private.user_id(),item.attempts,item.last_error);
 UPDATE app_private.booking_outbox SET status='pending',attempts=0,redrive_count=expected+1,
 available_at=clock_timestamp(),finished_at=NULL,last_error=NULL,lease_token=NULL,lease_until=NULL WHERE id=job;
END $$;
REVOKE ALL ON FUNCTION app_private.redrive_booking_notification(uuid,uuid,uuid,integer) FROM PUBLIC,aismall_notification_worker;
GRANT EXECUTE ON FUNCTION app_private.redrive_booking_notification(uuid,uuid,uuid,integer) TO aismall_app;

CREATE OR REPLACE FUNCTION app_private.booking_notification_status(tenant uuid,branch uuid,filter_status text,page_number integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE summary jsonb; entries jsonb; more boolean;
BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 IF filter_status IS NULL OR filter_status NOT IN ('all','pending','processing','delivered','dead')
 OR page_number IS NULL OR page_number NOT BETWEEN 1 AND 10000
 THEN RAISE EXCEPTION 'Invalid filter' USING ERRCODE='22023'; END IF;
 SELECT jsonb_build_object('pending',count(*) FILTER(WHERE status='pending'),
 'processing',count(*) FILTER(WHERE status='processing'),'delivered',count(*) FILTER(WHERE status='delivered'),
 'dead',count(*) FILTER(WHERE status='dead'),
 'expired',count(*) FILTER(WHERE status='processing' AND lease_until<=clock_timestamp()))
 INTO summary FROM app_private.booking_outbox WHERE tenant_id=tenant AND branch_id=branch;
 SELECT coalesce(jsonb_agg(x ORDER BY x.created_at DESC,x.id DESC),'[]') INTO entries FROM (
  SELECT o.redrive_count,(o.status='dead' AND o.redrive_count<3 AND o.booking_version=k.version AND o.created_at>clock_timestamp()-interval '24 hours' AND (o.payload->>'starts_at')::timestamptz>clock_timestamp()) AS can_redrive,o.id,o.booking_id,o.booking_version,o.event,o.status,o.attempts,o.last_error,o.created_at,o.available_at,o.finished_at,
   (o.status='processing' AND o.lease_until<=clock_timestamp()) AS expired,
   c.name AS customer,p.name AS program,o.payload->>'starts_at' AS starts_at
  FROM app_private.booking_outbox o
  JOIN app.bookings k ON k.tenant_id=o.tenant_id AND k.branch_id=o.branch_id AND k.id=o.booking_id
  JOIN app.customers c ON c.tenant_id=k.tenant_id AND c.branch_id=k.branch_id AND c.id=k.customer_id
  JOIN app.programs p ON p.tenant_id=o.tenant_id AND p.branch_id=o.branch_id AND p.id=(o.payload->>'program_id')::uuid
  WHERE o.tenant_id=tenant AND o.branch_id=branch AND (filter_status='all' OR o.status=filter_status)
  ORDER BY o.created_at DESC,o.id DESC LIMIT 50 OFFSET (page_number-1)*50
 ) x;
 SELECT EXISTS(SELECT 1 FROM app_private.booking_outbox WHERE tenant_id=tenant AND branch_id=branch
  AND (filter_status='all' OR status=filter_status) OFFSET page_number*50 LIMIT 1) INTO more;
 RETURN jsonb_build_object('counts',summary,'items',entries,'hasMore',more,'page',page_number,'status',filter_status);
END $$;
