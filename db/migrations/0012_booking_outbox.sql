-- Intent only: no addresses, provider credentials, schedules or outbound transport.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aismall_notification_worker') THEN
  CREATE ROLE aismall_notification_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
 END IF;
END $$;
GRANT USAGE ON SCHEMA app_private TO aismall_notification_worker;

CREATE TABLE app_private.booking_outbox(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,branch_id uuid NOT NULL,booking_id uuid NOT NULL,booking_version integer NOT NULL,
 event text NOT NULL CHECK(event IN ('booking.confirmed','booking.rescheduled','booking.cancelled')),
 payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','delivered','dead')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 available_at timestamptz NOT NULL DEFAULT now(),lease_token uuid,lease_until timestamptz,
 last_error text CHECK(last_error IN ('temporary','permanent','lease_expired')),
 created_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,
 UNIQUE(tenant_id,branch_id,booking_id,booking_version),
 FOREIGN KEY(tenant_id,branch_id,booking_id) REFERENCES app.bookings(tenant_id,branch_id,id),
 CHECK((status='processing')=(lease_token IS NOT NULL AND lease_until IS NOT NULL)),
 CHECK((status IN ('delivered','dead'))=(finished_at IS NOT NULL))
);
CREATE INDEX booking_outbox_ready ON app_private.booking_outbox(status,available_at,created_at);
REVOKE ALL ON app_private.booking_outbox FROM PUBLIC,aismall_app,aismall_notification_worker;

CREATE FUNCTION app_private.enqueue_booking_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE kind text; meeting app.sessions;
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'confirmed' THEN RETURN NEW; END IF;
  kind:='booking.confirmed';
 ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status='cancelled' THEN kind:='booking.cancelled';
 ELSIF OLD.session_id IS DISTINCT FROM NEW.session_id AND NEW.status='confirmed' THEN kind:='booking.rescheduled';
 ELSE RETURN NEW;
 END IF;
 SELECT * INTO meeting FROM app.sessions WHERE id=NEW.session_id AND tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id;
 INSERT INTO app_private.booking_outbox(tenant_id,branch_id,booking_id,booking_version,event,payload)
 VALUES(NEW.tenant_id,NEW.branch_id,NEW.id,NEW.version,kind,jsonb_build_object(
 'schema_version',1,'customer_id',NEW.customer_id,'session_id',NEW.session_id,'program_id',meeting.program_id,
 'starts_at',meeting.starts_at,'ends_at',meeting.ends_at,
 'previous_session_id',CASE WHEN TG_OP='UPDATE' THEN OLD.session_id ELSE NULL END));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_private.enqueue_booking_event() FROM PUBLIC,aismall_app,aismall_notification_worker;
CREATE TRIGGER booking_notification_intent AFTER INSERT OR UPDATE ON app.bookings
 FOR EACH ROW EXECUTE FUNCTION app_private.enqueue_booking_event();

CREATE FUNCTION app_private.claim_booking_notifications(batch_size integer)
RETURNS SETOF jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF batch_size IS NULL OR batch_size NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid batch size' USING ERRCODE='22023'; END IF;
 -- Exhausted leases become terminal; an unresponsive worker cannot block a booking forever.
 UPDATE app_private.booking_outbox SET status='dead',lease_token=NULL,lease_until=NULL,finished_at=clock_timestamp(),last_error='lease_expired'
 WHERE status='processing' AND lease_until<=clock_timestamp() AND attempts>=5;
 RETURN QUERY
 WITH candidates AS (
  SELECT o.id FROM app_private.booking_outbox o
  JOIN app.tenants t ON t.id=o.tenant_id AND t.status='active'
  JOIN app.branches b ON b.tenant_id=o.tenant_id AND b.id=o.branch_id AND b.status='active'
  WHERE o.attempts<5 AND ((o.status='pending' AND o.available_at<=clock_timestamp()) OR (o.status='processing' AND o.lease_until<=clock_timestamp()))
   AND NOT EXISTS(SELECT 1 FROM app_private.booking_outbox prior WHERE prior.booking_id=o.booking_id
     AND prior.booking_version<o.booking_version AND prior.status IN ('pending','processing'))
  ORDER BY o.created_at,o.id LIMIT batch_size FOR UPDATE OF o SKIP LOCKED
 ), claimed AS (
  UPDATE app_private.booking_outbox o SET status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),
    lease_until=clock_timestamp()+interval '60 seconds',last_error=CASE WHEN o.status='processing' THEN 'lease_expired' ELSE o.last_error END
  FROM candidates c WHERE o.id=c.id RETURNING o.*
 )
 SELECT jsonb_build_object('id',id,'tenant_id',tenant_id,'branch_id',branch_id,'booking_id',booking_id,
  'booking_version',booking_version,'event',event,'payload',payload,'attempt',attempts,'lease_token',lease_token,'lease_until',lease_until)
 FROM claimed;
END $$;

CREATE FUNCTION app_private.finish_booking_notification(job uuid,token uuid,outcome text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item app_private.booking_outbox;
BEGIN
 IF outcome IS NULL OR outcome NOT IN ('delivered','temporary','permanent') THEN RAISE EXCEPTION 'Invalid outcome' USING ERRCODE='22023'; END IF;
 SELECT * INTO item FROM app_private.booking_outbox WHERE id=job FOR UPDATE;
 IF NOT FOUND OR item.status<>'processing' OR token IS NULL OR item.lease_token<>token OR item.lease_until<=clock_timestamp()
 THEN RAISE EXCEPTION 'Lease conflict' USING ERRCODE='40001'; END IF;
 UPDATE app_private.booking_outbox SET
  status=CASE WHEN outcome='delivered' THEN 'delivered' WHEN outcome='permanent' OR attempts>=5 THEN 'dead' ELSE 'pending' END,
  available_at=CASE WHEN outcome='temporary' THEN clock_timestamp()+make_interval(secs=>30*(2^(attempts-1))::integer) ELSE available_at END,
  finished_at=CASE WHEN outcome IN ('delivered','permanent') OR attempts>=5 THEN clock_timestamp() ELSE NULL END,
  last_error=CASE WHEN outcome='delivered' THEN NULL ELSE outcome END,lease_token=NULL,lease_until=NULL
 WHERE id=job;
END $$;
REVOKE ALL ON FUNCTION app_private.claim_booking_notifications(integer),app_private.finish_booking_notification(uuid,uuid,text) FROM PUBLIC,aismall_app;
GRANT EXECUTE ON FUNCTION app_private.claim_booking_notifications(integer),app_private.finish_booking_notification(uuid,uuid,text) TO aismall_notification_worker;
