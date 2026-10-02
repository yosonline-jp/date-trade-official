begin;
alter table public.trade_records add column if not exists fees numeric not null default 0 check (fees >= 0);
alter table public.trade_records add column if not exists entry_reason text not null default '';
alter table public.trade_records add column if not exists reflection text not null default '';
alter table public.trade_records add column if not exists tags text[] not null default '{}';
alter table public.trade_records add column if not exists screenshot_path text;
alter table public.trade_records add column if not exists visibility text not null default 'public' check (visibility in ('public','private'));
alter table public.trade_records alter column visibility set default 'private';
alter table public.trade_records add column if not exists import_key text;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='trade_screenshot_owner' and conrelid='public.trade_records'::regclass) then
  alter table public.trade_records add constraint trade_screenshot_owner check(screenshot_path is null or split_part(screenshot_path,'/',1)=user_id::text);
 end if;
end $$;
create unique index if not exists trade_import_unique on public.trade_records(user_id, import_key);
alter table public.daily_profit add column if not exists adjustment_amount numeric not null default 0;
create table if not exists public.journal_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 calendar_source text not null default 'manual' check (calendar_source in ('manual','trades'))
);
create table if not exists public.journal_reports (
 user_id uuid not null references auth.users(id) on delete cascade,
 period text not null check (period in ('week','month')),
 start_date date not null,
 reflection text not null default '', next_goal text not null default '',
 primary key(user_id, period, start_date)
);
create table if not exists public.watchlist_notes (
 user_id uuid not null references auth.users(id) on delete cascade,
 stock_code text not null, category text not null default '', note text not null default '',
 target_price numeric check (target_price > 0), primary key(user_id, stock_code)
);
-- Replace permissive legacy policies so every route, including embedded queries, respects visibility.
do $$ declare row record; tab text; begin
 foreach tab in array array['trade_records','daily_profit','journal_settings','journal_reports','watchlist_notes'] loop
  execute format('alter table public.%I enable row level security', tab);
  for row in select policyname from pg_policies where schemaname='public' and tablename=tab loop
   execute format('drop policy %I on public.%I', row.policyname, tab);
  end loop;
  execute format('create policy owner_insert on public.%I for insert to authenticated with check (user_id = auth.uid())',tab);
  execute format('create policy owner_update on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',tab);
  execute format('create policy owner_delete on public.%I for delete to authenticated using (user_id = auth.uid())',tab);
  if tab='trade_records' then
   execute 'create policy visible_select on public.trade_records for select to anon, authenticated using (visibility = ''public'' or user_id = auth.uid())';
  else
   execute format('create policy owner_select on public.%I for select to authenticated using (user_id = auth.uid())',tab);
  end if;
 end loop;
end $$;
grant select, insert, update, delete on public.journal_settings, public.journal_reports, public.watchlist_notes to authenticated;
grant select on public.trade_records to anon;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('trade-screenshots','trade-screenshots',false,3145728,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists journal_image_select on storage.objects;
drop policy if exists journal_image_insert on storage.objects;
drop policy if exists journal_image_delete on storage.objects;
create policy journal_image_select on storage.objects for select to anon,authenticated using (
 bucket_id='trade-screenshots' and ((storage.foldername(name))[1]=auth.uid()::text or exists (
 select 1 from public.trade_records t where t.screenshot_path=name and t.visibility='public' and t.user_id::text=(storage.foldername(name))[1])));
create policy journal_image_insert on storage.objects for insert to authenticated with check (
 bucket_id='trade-screenshots' and (storage.foldername(name))[1]=auth.uid()::text);
create policy journal_image_delete on storage.objects for delete to authenticated using (
 bucket_id='trade-screenshots' and (storage.foldername(name))[1]=auth.uid()::text);
-- Restrictive policies prevent legacy wildcard storage policies from bypassing this bucket's ownership rules.
drop policy if exists journal_image_guard_select on storage.objects;
drop policy if exists journal_image_guard_insert on storage.objects;
drop policy if exists journal_image_guard_delete on storage.objects;
drop policy if exists journal_image_guard_update on storage.objects;
create policy journal_image_guard_select on storage.objects as restrictive for select to anon,authenticated using (
 bucket_id<>'trade-screenshots' or (storage.foldername(name))[1]=auth.uid()::text or exists (
 select 1 from public.trade_records t where t.screenshot_path=name and t.visibility='public' and t.user_id::text=(storage.foldername(name))[1]));
create policy journal_image_guard_insert on storage.objects as restrictive for insert to authenticated with check (
 bucket_id<>'trade-screenshots' or (storage.foldername(name))[1]=auth.uid()::text);
create policy journal_image_guard_delete on storage.objects as restrictive for delete to authenticated using (
 bucket_id<>'trade-screenshots' or (storage.foldername(name))[1]=auth.uid()::text);
create policy journal_image_guard_update on storage.objects as restrictive for update to authenticated using (
 bucket_id<>'trade-screenshots' or (storage.foldername(name))[1]=auth.uid()::text) with check (
 bucket_id<>'trade-screenshots' or (storage.foldername(name))[1]=auth.uid()::text);
-- Atomic imports with per-user serialization and duplicate checking.
create or replace function public.import_journal_trades(rows jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare r jsonb; added integer:=0; skipped integer:=0; uid uuid:=auth.uid(); begin
 if uid is null then raise exception 'Authentication required'; end if;
 if rows is null or jsonb_typeof(rows)<>'array' or jsonb_array_length(rows)>500 then raise exception 'Invalid batch'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 for r in select value from jsonb_array_elements(rows) loop
  if jsonb_typeof(r)<>'object' or not (r ?& array['stock_code','stock_name','trade_date','buy_price','sell_price','quantity','fees','type','trade_type','visibility','import_key']) or exists(select 1 from jsonb_each(r) where value='null'::jsonb and key=any(array['stock_code','stock_name','trade_date','buy_price','sell_price','quantity','fees','type','trade_type','visibility','import_key'])) then raise exception 'Missing fields'; end if;
  if (r->>'stock_code') !~ '^[0-9A-Z]{4}$' or length(r->>'stock_name') not between 1 and 120 or (r->>'import_key') !~ '^[a-f0-9]{64}$' or length(coalesce(r->>'memo',''))>5000 then raise exception 'Invalid fields'; end if;
  if (r->>'buy_price')::numeric not between 0.00000001 and 1000000000 or (r->>'sell_price')::numeric not between 0.00000001 and 1000000000 or (r->>'quantity')::numeric not between 1 and 1000000000 or trunc((r->>'quantity')::numeric)<>(r->>'quantity')::numeric or (r->>'fees')::numeric not between 0 and 1000000000000 then raise exception 'Invalid values'; end if;
  if r->>'type' not in ('real','demo') or r->>'visibility' not in ('public','private') or r->>'trade_type' not in ('現物','買建','売建') then raise exception 'Invalid trade'; end if;
  if exists(select 1 from trade_records t where t.user_id=uid and (t.import_key=r->>'import_key' or (t.stock_code=r->>'stock_code' and t.trade_date::date=(r->>'trade_date')::date and t.buy_price=(r->>'buy_price')::numeric and t.sell_price=(r->>'sell_price')::numeric and t.quantity=(r->>'quantity')::numeric and t.type=r->>'type' and t.trade_type=r->>'trade_type'))) then
   skipped:=skipped+1;
  else
   insert into trade_records(user_id,stock_code,stock_name,trade_date,buy_price,sell_price,quantity,type,trade_type,fees,profit,memo,visibility,import_key)
   values(uid,r->>'stock_code',r->>'stock_name',(r->>'trade_date')::date,(r->>'buy_price')::numeric,(r->>'sell_price')::numeric,(r->>'quantity')::numeric,r->>'type',r->>'trade_type',(r->>'fees')::numeric,
    round((case when r->>'trade_type'='売建' then (r->>'buy_price')::numeric-(r->>'sell_price')::numeric else (r->>'sell_price')::numeric-(r->>'buy_price')::numeric end)*(r->>'quantity')::numeric-(r->>'fees')::numeric,2),coalesce(r->>'memo',''),r->>'visibility',r->>'import_key');
   added:=added+1;
  end if;
 end loop;
 return jsonb_build_object('added',added,'skipped',skipped);
end $$;
revoke all on function public.import_journal_trades(jsonb) from public;
grant execute on function public.import_journal_trades(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
