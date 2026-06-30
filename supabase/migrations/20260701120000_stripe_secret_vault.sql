-- Enable Supabase Vault for encrypted secrets and expose a restricted helper
-- function for Next.js server code to read the Stripe secret key.
-- The actual STRIPE_SECRET_KEY must be inserted separately via SQL:
--   select vault.create_secret('sk_live_...', 'stripe_secret_key');
-- For local development, keep STRIPE_SECRET_KEY in .env.development (gitignored).

-- Restricted RPC: returns the decrypted value for an allow-listed secret name.
-- Only the service_role key (used by lib/supabase/server.ts) is granted execute.
create or replace function public.get_secret_by_name(secret_name text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  result text;
begin
  if secret_name not in ('stripe_secret_key') then
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
