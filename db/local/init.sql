-- Local development only. These credentials must never be used for hosting.
CREATE ROLE aismall_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
CREATE ROLE aismall_runtime LOGIN PASSWORD 'aismall_local_only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT aismall_app TO aismall_runtime;
