begin;
-- Auth deletion is a single transaction for all application rows.
alter table public.trade_records drop constraint if exists trade_records_user_id_fkey;
alter table public.trade_records add constraint trade_records_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.daily_profit drop constraint if exists daily_profit_user_id_fkey;
alter table public.daily_profit add constraint daily_profit_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.fundamental_analysis drop constraint if exists fundamental_analysis_user_id_fkey;
alter table public.fundamental_analysis add constraint fundamental_analysis_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- Only the trusted server may enumerate objects for account deletion.
-- Read Storage metadata; actual deletion MUST use the Storage API.
create or replace function public.account_deletion_objects(target_user_id uuid)
returns table(bucket_id text, name text)
language sql stable security definer set search_path = '' as $$
  select o.bucket_id, o.name from storage.objects o
  where o.owner_id = target_user_id::text
    or (o.owner_id is null and o.owner = target_user_id)
    or (o.bucket_id = 'trade-screenshots'
        and split_part(o.name, '/', 1) = target_user_id::text
        and o.owner_id is null and o.owner is null)
  order by o.bucket_id, o.name
  limit 100;
$$;
revoke all on function public.account_deletion_objects(uuid) from public, anon, authenticated;
grant execute on function public.account_deletion_objects(uuid) to service_role;
notify pgrst, 'reload schema';
commit;
