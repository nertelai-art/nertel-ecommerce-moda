-- Keep future objects closed even when the destination project uses broad defaults.
revoke create on schema public from public, anon, authenticated;
revoke all on schema private from public, anon, authenticated, service_role;
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema private revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema private revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema private revoke all on sequences from anon, authenticated, service_role;
