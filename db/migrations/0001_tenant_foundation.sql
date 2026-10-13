-- Run as the migration owner, never as the application login.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aismall_app') THEN
    CREATE ROLE aismall_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

CREATE SCHEMA app;
CREATE SCHEMA app_private;
REVOKE ALL ON SCHEMA app, app_private FROM PUBLIC;

CREATE TABLE app.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_issuer text NOT NULL,
  auth_subject text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auth_issuer, auth_subject)
);

CREATE TABLE app.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.staff_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id),
  user_id uuid NOT NULL REFERENCES app.users(id),
  role text NOT NULL CHECK (role IN ('tenant_admin', 'branch_staff')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE app.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  timezone text NOT NULL DEFAULT 'Asia/Seoul',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE app.branch_assignments (
  tenant_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('branch_owner', 'manager', 'staff')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  PRIMARY KEY (tenant_id, membership_id, branch_id),
  FOREIGN KEY (tenant_id, membership_id) REFERENCES app.staff_memberships(tenant_id, id),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES app.branches(tenant_id, id)
);

CREATE TABLE app.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES app.users(id),
  action text NOT NULL CHECK (action = 'branch.renamed'),
  details jsonb NOT NULL CHECK (jsonb_typeof(details) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES app.branches(tenant_id, id)
);

CREATE INDEX staff_memberships_user_idx ON app.staff_memberships(user_id, tenant_id);
CREATE INDEX branch_assignments_branch_idx ON app.branch_assignments(tenant_id, branch_id);
CREATE INDEX audit_events_branch_idx ON app.audit_events(tenant_id, branch_id, created_at DESC);

-- These functions deliberately use SECURITY INVOKER: no privileged RLS bypass.
CREATE FUNCTION app_private.user_id() RETURNS uuid
LANGUAGE sql STABLE SET search_path = pg_catalog
AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

CREATE FUNCTION app_private.tenant_id() RETURNS uuid
LANGUAGE sql STABLE SET search_path = pg_catalog
AS $$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;

ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.users FORCE ROW LEVEL SECURITY;
CREATE POLICY users_self ON app.users FOR SELECT TO aismall_app
  USING (id = app_private.user_id() AND status = 'active');

ALTER TABLE app.staff_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.staff_memberships FORCE ROW LEVEL SECURITY;
-- Bootstrap policies only expose the current user's own active membership.
-- They do not query tenants/branches, avoiding policy recursion.
CREATE POLICY memberships_self ON app.staff_memberships FOR SELECT TO aismall_app
  USING (
    tenant_id = app_private.tenant_id() AND user_id = app_private.user_id() AND status = 'active'
    AND EXISTS (SELECT 1 FROM app.users u WHERE u.id = staff_memberships.user_id)
  );

ALTER TABLE app.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenants_member ON app.tenants FOR SELECT TO aismall_app
  USING (
    id = app_private.tenant_id() AND status = 'active'
    AND EXISTS (SELECT 1 FROM app.staff_memberships m WHERE m.tenant_id = tenants.id)
  );

ALTER TABLE app.branch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.branch_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY assignments_self ON app.branch_assignments FOR SELECT TO aismall_app
  USING (
    tenant_id = app_private.tenant_id() AND status = 'active'
    AND EXISTS (SELECT 1 FROM app.tenants t WHERE t.id = branch_assignments.tenant_id)
    AND EXISTS (SELECT 1 FROM app.staff_memberships m WHERE m.tenant_id = branch_assignments.tenant_id AND m.id = branch_assignments.membership_id)
  );

CREATE FUNCTION app_private.can_access_branch(target_tenant uuid, target_branch uuid, editing boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SET search_path = pg_catalog
AS $$
  SELECT target_tenant = app_private.tenant_id()
    AND EXISTS (SELECT 1 FROM app.tenants t WHERE t.id = target_tenant)
    AND (
      EXISTS (SELECT 1 FROM app.staff_memberships m WHERE m.tenant_id = target_tenant AND m.role = 'tenant_admin')
      OR EXISTS (
        SELECT 1 FROM app.branch_assignments a
        WHERE a.tenant_id = target_tenant AND a.branch_id = target_branch
          AND (NOT editing OR a.role = 'branch_owner')
      )
    )
$$;

ALTER TABLE app.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.branches FORCE ROW LEVEL SECURITY;
CREATE POLICY branches_read ON app.branches FOR SELECT TO aismall_app
  USING (status = 'active' AND app_private.can_access_branch(tenant_id, id));
CREATE POLICY branches_rename ON app.branches FOR UPDATE TO aismall_app
  USING (status = 'active' AND app_private.can_access_branch(tenant_id, id, true))
  WITH CHECK (status = 'active' AND app_private.can_access_branch(tenant_id, id, true));

CREATE FUNCTION app_private.bump_branch_version() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END
$$;
CREATE TRIGGER branch_version BEFORE UPDATE ON app.branches
  FOR EACH ROW EXECUTE FUNCTION app_private.bump_branch_version();

ALTER TABLE app.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_read ON app.audit_events FOR SELECT TO aismall_app
  USING (app_private.can_access_branch(tenant_id, branch_id));
CREATE POLICY audit_insert ON app.audit_events FOR INSERT TO aismall_app
  WITH CHECK (
    actor_user_id = app_private.user_id()
    AND app_private.can_access_branch(tenant_id, branch_id, true)
  );

REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app, app_private TO aismall_app;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO aismall_app;
GRANT UPDATE (name) ON app.branches TO aismall_app;
GRANT INSERT ON app.audit_events TO aismall_app;
GRANT EXECUTE ON FUNCTION app_private.user_id(), app_private.tenant_id(), app_private.can_access_branch(uuid, uuid, boolean) TO aismall_app;

-- No runtime writes to identities, roles, assignments or tenant IDs.
-- Onboarding and invitations need a separately audited provisioning service.
