CREATE FUNCTION app_private.claim_scoped_booking_notifications(target_tenant uuid,target_branch uuid,batch_size integer)
RETURNS SETOF jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF batch_size IS NULL OR batch_size NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid batch size' USING ERRCODE='22023'; END IF;
 IF target_tenant IS NULL OR target_branch IS NULL OR NOT EXISTS(SELECT 1 FROM app.branches WHERE tenant_id=target_tenant AND id=target_branch) THEN RAISE EXCEPTION 'Invalid notification scope' USING ERRCODE='22023'; END IF;
 -- Exhausted leases become terminal; an unresponsive worker cannot block a booking forever.
 UPDATE app_private.booking_outbox SET status='dead',lease_token=NULL,lease_until=NULL,finished_at=clock_timestamp(),last_error='lease_expired'
 WHERE tenant_id=target_tenant AND branch_id=target_branch AND status='processing' AND lease_until<=clock_timestamp() AND attempts>=5;
 RETURN QUERY
 WITH candidates AS (
  SELECT o.id FROM app_private.booking_outbox o
  JOIN app.tenants t ON t.id=o.tenant_id AND t.status='active'
  JOIN app.branches b ON b.tenant_id=o.tenant_id AND b.id=o.branch_id AND b.status='active'
  WHERE o.tenant_id=target_tenant AND o.branch_id=target_branch AND o.attempts<5 AND ((o.status='pending' AND o.available_at<=clock_timestamp()) OR (o.status='processing' AND o.lease_until<=clock_timestamp()))
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

CREATE FUNCTION app_private.preview_booking_notifications(target_tenant uuid,target_branch uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;
BEGIN
 IF target_tenant IS NULL OR target_branch IS NULL THEN RAISE EXCEPTION 'Invalid notification scope' USING ERRCODE='22023'; END IF;
 SELECT jsonb_build_object('tenant_id',t.id,'branch_id',b.id,'active',t.status='active' AND b.status='active',
 'email_enabled',COALESCE(c.email_enabled,false),
 'pending',(SELECT count(*) FROM app_private.booking_outbox o WHERE o.tenant_id=t.id AND o.branch_id=b.id AND o.status='pending'),
 'processing',(SELECT count(*) FROM app_private.booking_outbox o WHERE o.tenant_id=t.id AND o.branch_id=b.id AND o.status='processing'),
 'expired_leases',(SELECT count(*) FROM app_private.booking_outbox o WHERE o.tenant_id=t.id AND o.branch_id=b.id AND o.status='processing' AND o.lease_until<=now())) INTO result
 FROM app.tenants t JOIN app.branches b ON b.tenant_id=t.id
 LEFT JOIN app_private.notification_channels c ON c.tenant_id=t.id AND c.branch_id=b.id
 WHERE t.id=target_tenant AND b.id=target_branch;
 IF result IS NULL THEN RAISE EXCEPTION 'Invalid notification scope' USING ERRCODE='22023'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION app_private.claim_scoped_booking_notifications(uuid,uuid,integer),app_private.preview_booking_notifications(uuid,uuid) FROM PUBLIC,aismall_app;
GRANT EXECUTE ON FUNCTION app_private.claim_scoped_booking_notifications(uuid,uuid,integer),app_private.preview_booking_notifications(uuid,uuid) TO aismall_notification_worker;
