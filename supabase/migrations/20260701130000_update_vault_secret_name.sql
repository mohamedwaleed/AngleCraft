-- The live Stripe secret was inserted into Supabase Vault under the name
-- 'STRIPE_SECRET_KEY'. Update the RPC helper to read that exact key.

create or replace function public.get_secret_by_name(secret_name text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  result text;
begin
  if secret_name not in ('STRIPE_SECRET_KEY') then
    raise exception 'Unauthorized secret name: %', secret_name;
  end if;

  select decrypted_secret into result
  from vault.decrypted_secrets
  where name = secret_name
  limit 1;

  return result;
end;
$$;

revoke all on function public.get_secret_by_name(text) from public, anon, authenticated;
grant execute on function public.get_secret_by_name(text) to service_role;
