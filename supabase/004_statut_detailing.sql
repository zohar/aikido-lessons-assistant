-- « detailing » : detailed instructions are being written for some exercises.
-- The lesson stays readable meanwhile (its data is unchanged until they are saved).
alter table public.aikido_seances drop constraint if exists aikido_seances_status_check;
alter table public.aikido_seances add constraint aikido_seances_status_check
  check (status in ('generating', 'reviewing', 'detailing', 'ready', 'error'));
