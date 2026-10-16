-- Branch operators receive a bounded projection, never raw payloads or lease tokens.
CREATE FUNCTION app_private.booking_notification_status(tenant uuid,branch uuid,filter_status text,page_number integer) RETURNS jsonb
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
  SELECT o.id,o.booking_id,o.booking_version,o.event,o.status,o.attempts,o.last_error,o.created_at,o.available_at,o.finished_at,
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
REVOKE ALL ON FUNCTION app_private.booking_notification_status(uuid,uuid,text,integer) FROM PUBLIC,aismall_notification_worker;
GRANT EXECUTE ON FUNCTION app_private.booking_notification_status(uuid,uuid,text,integer) TO aismall_app;
CREATE INDEX booking_outbox_branch_created ON app_private.booking_outbox(tenant_id,branch_id,created_at DESC,id DESC);
