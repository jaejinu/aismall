-- Conservative pilot policy: suppression belongs to one branch customer, not a global address.
-- Existing immutable webhook facts are the evidence; consent is never rewritten.
CREATE INDEX booking_outbox_recipient_history ON app_private.booking_outbox(tenant_id,branch_id,((payload->>'customer_id')::uuid));
CREATE FUNCTION app_private.notification_recipient_suppressed(tenant uuid,branch uuid,customer uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM app_private.booking_outbox o
 JOIN app_private.notification_receipts r ON r.outbox_id=o.id
 JOIN app_private.notification_delivery_events e ON e.email_id=r.email_id
 WHERE o.tenant_id=tenant AND o.branch_id=branch AND (o.payload->>'customer_id')::uuid=customer
 AND e.event_type IN ('email.bounced','email.complained'));
$$;
REVOKE ALL ON FUNCTION app_private.notification_recipient_suppressed(uuid,uuid,uuid) FROM PUBLIC,aismall_app,aismall_notification_worker,aismall_notification_webhook;
ALTER TABLE app_private.notification_attempt_results DROP CONSTRAINT notification_attempt_results_reason_check;
ALTER TABLE app_private.notification_attempt_results ADD CONSTRAINT notification_attempt_results_reason_check CHECK(reason IN ('provider_accepted','transport_temporary','transport_permanent','identity_unavailable','identity_unverified',
 'inactive_scope','superseded','expired_event','recipient_unavailable','consent_missing','before_consent','channel_disabled','recipient_suppressed'));

CREATE OR REPLACE FUNCTION app_private.prepare_booking_notification(job uuid,token uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item app_private.booking_outbox; booking app.bookings; target app_private.customer_links; pref app_private.notification_preferences; reason text;
BEGIN
 SELECT * INTO item FROM app_private.booking_outbox WHERE id=job;
 IF NOT FOUND OR item.status<>'processing' OR token IS NULL OR item.lease_token<>token OR item.lease_until<=clock_timestamp()
 THEN RAISE EXCEPTION 'Lease conflict' USING ERRCODE='40001'; END IF;
 SELECT * INTO booking FROM app.bookings WHERE id=item.booking_id AND tenant_id=item.tenant_id AND branch_id=item.branch_id;
 IF NOT EXISTS(SELECT 1 FROM app.tenants WHERE id=item.tenant_id AND status='active')
 OR NOT EXISTS(SELECT 1 FROM app.branches WHERE id=item.branch_id AND tenant_id=item.tenant_id AND status='active') THEN reason:='inactive_scope';
 ELSIF booking.id IS NULL OR booking.version<>item.booking_version THEN reason:='superseded';
 ELSIF item.created_at<=clock_timestamp()-interval '24 hours' OR (item.payload->>'starts_at')::timestamptz<=clock_timestamp() THEN reason:='expired_event';
 END IF;
 IF reason IS NOT NULL THEN RETURN jsonb_build_object('allowed',false,'reason',reason); END IF;
 SELECT * INTO target FROM app_private.customer_links WHERE tenant_id=item.tenant_id AND branch_id=item.branch_id AND customer_id=booking.customer_id AND status='active';
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM app.users WHERE id=target.user_id AND status='active') THEN RETURN jsonb_build_object('allowed',false,'reason','recipient_unavailable'); END IF;
 IF app_private.notification_recipient_suppressed(item.tenant_id,item.branch_id,booking.customer_id) THEN RETURN jsonb_build_object('allowed',false,'reason','recipient_suppressed'); END IF;
 SELECT * INTO pref FROM app_private.notification_preferences WHERE link_id=target.id;
 IF NOT FOUND OR NOT pref.enabled THEN RETURN jsonb_build_object('allowed',false,'reason','consent_missing'); END IF;
 IF item.created_at<pref.enabled_at THEN RETURN jsonb_build_object('allowed',false,'reason','before_consent'); END IF;
 IF NOT EXISTS(SELECT 1 FROM app_private.notification_channels WHERE tenant_id=item.tenant_id AND branch_id=item.branch_id AND email_enabled)
 THEN RETURN jsonb_build_object('allowed',false,'reason','channel_disabled'); END IF;
 RETURN jsonb_build_object('allowed',true,'channel','email','recipient',target.email,'recipient_user_id',target.user_id,'idempotency_key',item.id,'lease_until',item.lease_until);
END $$;

CREATE OR REPLACE FUNCTION app_private.record_notification_result(job uuid,token uuid,result_reason text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item app_private.booking_outbox; outcome text;
BEGIN
 IF result_reason IS NULL OR result_reason NOT IN ('provider_accepted','transport_temporary','transport_permanent','identity_unavailable','identity_unverified',
 'inactive_scope','superseded','expired_event','recipient_unavailable','consent_missing','before_consent','channel_disabled','recipient_suppressed')
 THEN RAISE EXCEPTION 'Invalid result reason' USING ERRCODE='22023'; END IF;
 SELECT * INTO item FROM app_private.booking_outbox WHERE id=job FOR UPDATE;
 outcome:=CASE WHEN result_reason='provider_accepted' THEN 'delivered'
 WHEN result_reason IN ('transport_temporary','identity_unavailable','channel_disabled') THEN 'temporary' ELSE 'permanent' END;
 -- finish validates ownership, token and lease, and consumes it atomically.
 PERFORM app_private.finish_booking_notification(job,token,outcome);
 INSERT INTO app_private.notification_attempt_results(outbox_id,generation,attempt,reason)
 VALUES(job,item.redrive_count,item.attempts,result_reason);
 RETURN (SELECT status FROM app_private.booking_outbox WHERE id=job);
END $$;
