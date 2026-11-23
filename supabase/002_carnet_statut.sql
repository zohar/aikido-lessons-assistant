-- Lightweight progress check, called by the browser directly (publishable key),
-- so waiting for a lesson costs no n8n execution.
-- Returns only the status of ONE lesson whose id is known; never its content.
create or replace function public.carnet_statut(p_id uuid)
returns table (status text, step text, age_s integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.status, s.step, floor(extract(epoch from (now() - s.updated_at)))::integer
  from public.aikido_seances s
  where s.id = p_id;
$$;

revoke all on function public.carnet_statut(uuid) from public;
grant execute on function public.carnet_statut(uuid) to anon, authenticated;
