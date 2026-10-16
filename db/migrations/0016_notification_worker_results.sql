-- Scoped identity resolution and sanitized attempt outcomes for the isolated worker.
CREATE FUNCTION app_private.notification_auth_identity(job uuid,token uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE eligible jsonb; result jsonb;
BEGIN
 eligible:=app_private.prepare_booking_notification(job,token);
 IF NOT (eligible->>'allowed')::boolean THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('issuer',auth_issuer,'subject',auth_subject) INTO result FROM app.users
 WHERE id=(eligible->>'recipient_user_id')::uuid AND status='active';
 RETURN result;
END $$;
CREATE TABLE app_private.notification_attempt_results(
 outbox_id uuid NOT NULL REFERENCES app_private.booking_outbox(id),
 generation integer NOT NULL,attempt integer NOT NULL,
 reason text NOT NULL CHECK(reason IN ('provider_accepted','transport_temporary','transport_permanent','identity_unavailable','identity_unverified',
 'inactive_scope','superseded','expired_event','recipient_unavailable','consent_missing','before_consent','channel_disabled')),
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(outbox_id,generation,attempt)
);
REVOKE ALL ON app_private.notification_attempt_results FROM PUBLIC,aismall_app,aismall_notification_worker;
CREATE FUNCTION app_private.record_notification_result(job uuid,token uuid,result_reason text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item app_private.booking_outbox; outcome text;
BEGIN
 IF result_reason IS NULL OR result_reason NOT IN ('provider_accepted','transport_temporary','transport_permanent','identity_unavailable','identity_unverified',
 'inactive_scope','superseded','expired_event','recipient_unavailable','consent_missing','before_consent','channel_disabled')
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
REVOKE ALL ON FUNCTION app_private.notification_auth_identity(uuid,uuid),app_private.record_notification_result(uuid,uuid,text) FROM PUBLIC,aismall_app;
GRANT EXECUTE ON FUNCTION app_private.notification_auth_identity(uuid,uuid),app_private.record_notification_result(uuid,uuid,text) TO aismall_notification_worker;
