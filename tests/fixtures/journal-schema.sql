create role anon nologin; create role authenticated nologin;
create schema auth; create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.trade_records(id bigserial primary key,user_id uuid not null references auth.users(id),stock_code text not null,stock_name text not null,buy_price numeric not null,sell_price numeric not null,quantity numeric not null,profit numeric not null,trade_date date not null,trade_type text not null,type text not null,memo text);
create table public.daily_profit(id bigserial primary key,user_id uuid not null references auth.users(id),date date not null,amount numeric not null);
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id bigserial primary key,bucket_id text,name text);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
alter table storage.objects enable row level security;
grant usage on schema public,auth,storage to anon,authenticated;
grant select,insert,update,delete on public.trade_records,public.daily_profit,storage.objects to authenticated;
grant select on storage.objects to anon;
grant usage,select on all sequences in schema public,storage to authenticated;

create policy legacy_wildcard_storage on storage.objects for all to anon,authenticated using(true) with check(true);
