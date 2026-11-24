-- Short text of each lesson's techniques and attack forms, for the lesson list.
-- The app picks the official technique and attack names out of it (glossary),
-- so two lessons on the same theme can be told apart. Computed by Postgres,
-- so existing, generated and imported lessons all get it.
create or replace function public.carnet_resume(d jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select string_agg(concat_ws(' | ', e->>'technique', e->>'forme'), ' || ' order by o)
  from jsonb_array_elements(
    case when jsonb_typeof(d->'situations') = 'array' then d->'situations' else '[]'::jsonb end
  ) with ordinality as x(e, o);
$$;

alter table public.aikido_seances
  add column if not exists resume text generated always as (public.carnet_resume(data)) stored;
