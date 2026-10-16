-- Private request ledger. Authorization is rechecked even when replaying a completed request.
CREATE TABLE app_private.registration_requests(
 tenant_id uuid NOT NULL,branch_id uuid NOT NULL,request_id uuid NOT NULL,
 operation text NOT NULL CHECK(operation IN ('customer','program','session')),
 payload jsonb NOT NULL,result_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,branch_id,request_id),
 FOREIGN KEY(tenant_id,branch_id) REFERENCES app.branches(tenant_id,id)
);
REVOKE ALL ON app_private.registration_requests FROM PUBLIC,aismall_app;
CREATE FUNCTION app_private.register_booking_entity(tenant uuid,branch uuid,request uuid,operation text,payload jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous app_private.registration_requests; result uuid;
BEGIN
 PERFORM app_private.require_booking_operator(tenant,branch);
 IF request IS NULL OR operation IS NULL OR operation NOT IN ('customer','program','session') OR payload IS NULL OR jsonb_typeof(payload)<>'object'
 THEN RAISE EXCEPTION 'Invalid registration' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(tenant::text||branch::text||request::text,0));
 SELECT * INTO previous FROM app_private.registration_requests WHERE tenant_id=tenant AND branch_id=branch AND request_id=request;
 IF FOUND THEN
  IF previous.operation<>operation OR previous.payload<>payload THEN RAISE EXCEPTION 'Registration request conflict' USING ERRCODE='P0003'; END IF;
  RETURN previous.result_id;
 END IF;
 IF operation='customer' THEN result:=app_private.create_customer(tenant,branch,payload->>'name');
 ELSIF operation='program' THEN result:=app_private.create_program(tenant,branch,payload->>'name');
 ELSE result:=app_private.create_session(tenant,branch,(payload->>'program')::uuid,(payload->>'starts')::timestamptz,(payload->>'ends')::timestamptz,(payload->>'capacity')::integer);
 END IF;
 INSERT INTO app_private.registration_requests(tenant_id,branch_id,request_id,operation,payload,result_id)
 VALUES(tenant,branch,request,operation,payload,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION app_private.register_booking_entity(uuid,uuid,uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.register_booking_entity(uuid,uuid,uuid,text,jsonb) TO aismall_app;
