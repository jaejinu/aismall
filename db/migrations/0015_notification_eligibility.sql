-- Explicit opt-in bound to an existing verified member link. No address is copied.
CREATE TABLE app_private.notification_preferences(
 link_id uuid PRIMARY KEY REFERENCES app_private.customer_links(id),
 enabled boolean NOT NULL DEFAULT false,version integer NOT NULL DEFAULT 0 CHECK(version>=0),
 enabled_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT enabled OR enabled_at IS NOT NULL)
);
CREATE TABLE app_private.notification_preference_events(
 link_id uuid NOT NULL REFERENCES app_private.customer_links(id),version integer NOT NULL,
 actor_user_id uuid NOT NULL REFERENCES app.users(id),enabled boolean NOT NULL,
 policy_version text NOT NULL DEFAULT 'booking-email-v1',created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(link_id,version)
);
CREATE TABLE app_private.notification_channels(
 tenant_id uuid NOT NULL,branch_id uuid NOT NULL,email_enabled boolean NOT NULL DEFAULT false,
 PRIMARY KEY(tenant_id,branch_id),FOREIGN KEY(tenant_id,branch_id) REFERENCES app.branches(tenant_id,id)
);
REVOKE ALL ON app_private.notification_preferences,app_private.notification_preference_events,app_private.notification_channels FROM PUBLIC,aismall_app,aismall_notification_worker;
CREATE FUNCTION app_private.member_notification_preference(actor uuid,link uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;
BEGIN
 PERFORM app_private.require_customer(actor,link);
 SELECT jsonb_build_object('enabled',enabled,'version',version) INTO result FROM app_private.notification_preferences WHERE link_id=link;
 RETURN coalesce(result,'{"enabled":false,"version":0}'::jsonb);
END $$;
CREATE FUNCTION app_private.set_notification_preference(actor uuid,link uuid,verified_email text,consent boolean,expected integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target app_private.customer_links; pref app_private.notification_preferences;
BEGIN
 target:=app_private.require_customer(actor,link);
 IF consent IS NULL OR expected IS NULL OR expected<0 THEN RAISE EXCEPTION 'Invalid preference' USING ERRCODE='22023'; END IF;
 -- Opt-out remains possible after an email change; opt-in requires the linked verified email.
 IF consent AND (verified_email IS NULL OR lower(btrim(verified_email))<>target.email) THEN RAISE EXCEPTION 'Verified address required' USING ERRCODE='42501'; END IF;
 INSERT INTO app_private.notification_preferences(link_id) VALUES(link) ON CONFLICT DO NOTHING;
 SELECT * INTO pref FROM app_private.notification_preferences WHERE link_id=link FOR UPDATE;
 IF pref.version=expected+1 AND pref.enabled=consent THEN RETURN; END IF;
 IF pref.version<>expected THEN RAISE EXCEPTION 'Preference changed' USING ERRCODE='40001'; END IF;
 IF pref.enabled=consent THEN RETURN; END IF;
 UPDATE app_private.notification_preferences SET enabled=consent,version=version+1,
 enabled_at=CASE WHEN consent THEN clock_timestamp() ELSE NULL END,updated_at=clock_timestamp() WHERE link_id=link;
 INSERT INTO app_private.notification_preference_events(link_id,version,actor_user_id,enabled) VALUES(link,expected+1,actor,consent);
END $$;
REVOKE ALL ON FUNCTION app_private.member_notification_preference(uuid,uuid),app_private.set_notification_preference(uuid,uuid,text,boolean,integer) FROM PUBLIC,aismall_notification_worker;
GRANT EXECUTE ON FUNCTION app_private.member_notification_preference(uuid,uuid),app_private.set_notification_preference(uuid,uuid,text,boolean,integer) TO aismall_app;

-- Read-only last-moment gate. A successful result is not a durable sending permit.
CREATE FUNCTION app_private.prepare_booking_notification(job uuid,token uuid) RETURNS jsonb
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
 SELECT * INTO pref FROM app_private.notification_preferences WHERE link_id=target.id;
 IF NOT FOUND OR NOT pref.enabled THEN RETURN jsonb_build_object('allowed',false,'reason','consent_missing'); END IF;
 IF item.created_at<pref.enabled_at THEN RETURN jsonb_build_object('allowed',false,'reason','before_consent'); END IF;
 IF NOT EXISTS(SELECT 1 FROM app_private.notification_channels WHERE tenant_id=item.tenant_id AND branch_id=item.branch_id AND email_enabled)
 THEN RETURN jsonb_build_object('allowed',false,'reason','channel_disabled'); END IF;
 RETURN jsonb_build_object('allowed',true,'channel','email','recipient',target.email,'recipient_user_id',target.user_id,'idempotency_key',item.id,'lease_until',item.lease_until);
END $$;
REVOKE ALL ON FUNCTION app_private.prepare_booking_notification(uuid,uuid) FROM PUBLIC,aismall_app;
GRANT EXECUTE ON FUNCTION app_private.prepare_booking_notification(uuid,uuid) TO aismall_notification_worker;
