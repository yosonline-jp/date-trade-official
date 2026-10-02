begin;
-- Contact submissions contain personal information. The public form is INSERT-only.
alter table public.contact enable row level security;
revoke select, update, delete, truncate, references, trigger on public.contact from public, anon, authenticated;
grant insert on public.contact to anon, authenticated;
grant select on public.contact to service_role;
do $$ declare p record; seq text; begin
 for p in select policyname from pg_policies where schemaname='public' and tablename='contact' loop
  execute format('drop policy %I on public.contact',p.policyname);
 end loop;
 seq:=pg_get_serial_sequence('public.contact','id');
 if seq is not null then execute format('grant usage on sequence %s to anon, authenticated',seq);end if;
end $$;
create policy contact_submit on public.contact for insert to anon, authenticated with check (
 char_length(btrim(name)) between 1 and 80
 and char_length(email) between 3 and 254 and position('@' in email)>1
 and char_length(btrim(title)) between 2 and 100
 and char_length(btrim(content)) between 2 and 5000
);
notify pgrst,'reload schema';
commit;
