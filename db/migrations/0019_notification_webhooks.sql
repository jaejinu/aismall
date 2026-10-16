-- Delivery facts are separate from queue completion; callbacks never enqueue mail.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aismall_notification_webhook') THEN
  CREATE ROLE aismall_notification_webhook NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
 END IF;
END $$;
GRANT USAGE ON SCHEMA app_private TO aismall_notification_webhook;
CREATE TABLE app_private.notification_receipts(
 outbox_id uuid PRIMARY KEY REFERENCES app_private.booking_outbox(id),
 email_id uuid NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app_private.notification_delivery_events(
 event_id text PRIMARY KEY CHECK(length(event_id) BETWEEN 1 AND 200),
 email_id uuid NOT NULL,event_type text NOT NULL CHECK(event_type IN ('email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.suppressed')),
 occurred_at timestamptz NOT NULL CHECK(isfinite(occurred_at)),received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notification_delivery_email ON app_private.notification_delivery_events(email_id,event_type);
REVOKE ALL ON app_private.notification_receipts,app_private.notification_delivery_events FROM PUBLIC,aismall_app,aismall_notification_worker,aismall_notification_webhook;
CREATE FUNCTION app_private.record_notification_receipt(job uuid,token uuid,provider_email uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE existing uuid; result text;
BEGIN
 IF provider_email IS NULL THEN RAISE EXCEPTION 'Receipt required' USING ERRCODE='22023'; END IF;
 -- Result and receipt commit together; an expired lease cannot attach a receipt.
 result:=app_private.record_notification_result(job,token,'provider_accepted');
 INSERT INTO app_private.notification_receipts(outbox_id,email_id) VALUES(job,provider_email) ON CONFLICT(outbox_id) DO NOTHING;
 SELECT email_id INTO existing FROM app_private.notification_receipts WHERE outbox_id=job;
 IF existing<>provider_email THEN RAISE EXCEPTION 'Receipt conflict' USING ERRCODE='40001'; END IF;
 RETURN result;
END $$;
CREATE FUNCTION app_private.ingest_notification_delivery(event_key text,provider_email uuid,kind text,event_time timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE existing app_private.notification_delivery_events;
BEGIN
 IF event_key IS NULL OR length(event_key) NOT BETWEEN 1 AND 200 OR provider_email IS NULL OR event_time IS NULL OR NOT isfinite(event_time)
 OR kind IS NULL OR kind NOT IN ('email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.suppressed')
 THEN RAISE EXCEPTION 'Invalid delivery event' USING ERRCODE='22023'; END IF;
 -- Keep sanitized unmatched receipts too: webhook may arrive before send acknowledgement.
 INSERT INTO app_private.notification_delivery_events(event_id,email_id,event_type,occurred_at)
 VALUES(event_key,provider_email,kind,event_time) ON CONFLICT(event_id) DO NOTHING;
 SELECT * INTO existing FROM app_private.notification_delivery_events WHERE event_id=event_key;
 IF existing.email_id<>provider_email OR existing.event_type<>kind OR existing.occurred_at<>event_time
 THEN RAISE EXCEPTION 'Event conflict' USING ERRCODE='40001'; END IF;
END $$;
CREATE FUNCTION app_private.notification_delivery_status(target_tenant uuid,target_branch uuid,job uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;
BEGIN
 PERFORM app_private.require_booking_operator(target_tenant,target_branch);
 IF NOT EXISTS(SELECT 1 FROM app_private.booking_outbox WHERE id=job AND tenant_id=target_tenant AND branch_id=target_branch)
 THEN RAISE EXCEPTION 'Notification unavailable' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('receipt_recorded',EXISTS(SELECT 1 FROM app_private.notification_receipts WHERE outbox_id=job),
 'events',COALESCE(jsonb_agg(facts ORDER BY facts->>'type'),'[]'::jsonb)) INTO result
 FROM (SELECT jsonb_build_object('type',e.event_type,'occurred_at',min(e.occurred_at)) AS facts
 FROM app_private.notification_receipts r JOIN app_private.notification_delivery_events e ON e.email_id=r.email_id
 WHERE r.outbox_id=job GROUP BY e.event_type) observed;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION app_private.record_notification_receipt(uuid,uuid,uuid),app_private.ingest_notification_delivery(text,uuid,text,timestamptz),app_private.notification_delivery_status(uuid,uuid,uuid) FROM PUBLIC,aismall_app,aismall_notification_worker,aismall_notification_webhook;
GRANT EXECUTE ON FUNCTION app_private.record_notification_receipt(uuid,uuid,uuid) TO aismall_notification_worker;
GRANT EXECUTE ON FUNCTION app_private.ingest_notification_delivery(text,uuid,text,timestamptz) TO aismall_notification_webhook;
GRANT EXECUTE ON FUNCTION app_private.notification_delivery_status(uuid,uuid,uuid) TO aismall_app;
