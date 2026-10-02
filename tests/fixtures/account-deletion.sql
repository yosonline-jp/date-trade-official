\set ON_ERROR_STOP on
begin;
insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into public.users select id from auth.users;
insert into trade_records select row_number() over()::int,id from auth.users;
insert into daily_profit select * from trade_records;
insert into fundamental_analysis select * from trade_records;
insert into watchlist select id from auth.users;
insert into journal_settings select id from auth.users;
insert into journal_reports select id from auth.users;
insert into watchlist_notes select id from auth.users;
insert into stock_comments select id from auth.users;
insert into news select id from auth.users;
insert into technical_analysis select id from auth.users;
insert into follows values('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'),('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111');
insert into storage.objects values
 ('profile','legacy-avatar',null,'11111111-1111-4111-8111-111111111111'),
 ('profile','old-owner','11111111-1111-4111-8111-111111111111',null),
 ('trade-screenshots','11111111-1111-4111-8111-111111111111/unowned.png',null,null),
 ('profile','other-user',null,'22222222-2222-4222-8222-222222222222'),
 ('trade-screenshots','11111111-1111-4111-8111-111111111111/other-owner.png',null,'22222222-2222-4222-8222-222222222222');
set local role authenticated;
do $$begin
 begin perform account_deletion_objects('11111111-1111-4111-8111-111111111111');raise exception 'RPC exposed to authenticated';exception when insufficient_privilege then null;end;
end$$;
set local role anon;
do $$begin
 begin perform account_deletion_objects('11111111-1111-4111-8111-111111111111');raise exception 'RPC exposed to anonymous';exception when insufficient_privilege then null;end;
end$$;
set local role service_role;
do $$begin
 if (select count(*) from account_deletion_objects('11111111-1111-4111-8111-111111111111'))<>3 then raise exception 'Wrong objects selected';end if;
end$$;
reset role;
delete from auth.users where id='11111111-1111-4111-8111-111111111111';
do $$declare tab text; n integer; begin
 foreach tab in array array['users','trade_records','daily_profit','fundamental_analysis','watchlist','journal_settings','journal_reports','watchlist_notes','stock_comments','news','technical_analysis'] loop
  execute format('select count(*) from public.%I',tab) into n;
  if n<>1 then raise exception 'Cascade or other-user preservation failed: %',tab;end if;
 end loop;
 if exists(select 1 from follows) then raise exception 'Follows not removed';end if;
 if (select count(*) from auth.users)<>1 then raise exception 'Other account lost';end if;
end$$;
rollback;
select 'Account cascade, other-user preservation, Storage ownership, and server-only RPC passed' as result;
