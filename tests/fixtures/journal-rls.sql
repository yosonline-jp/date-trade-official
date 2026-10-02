\set ON_ERROR_STOP on
begin;
insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.trade_records(user_id,stock_code,stock_name,buy_price,sell_price,quantity,profit,trade_date,trade_type,type,visibility,screenshot_path)
 values(auth.uid(),'7203','Private',100,110,10,100,'2026-10-01','現物','real','private','11111111-1111-4111-8111-111111111111/private.png'),(auth.uid(),'7203','Public',100,110,10,100,'2026-10-01','現物','real','public','11111111-1111-4111-8111-111111111111/public.png');
insert into storage.objects(bucket_id,name) values('trade-screenshots','11111111-1111-4111-8111-111111111111/private.png'),('trade-screenshots','11111111-1111-4111-8111-111111111111/public.png');
insert into public.journal_settings values(auth.uid(),'trades');
insert into public.watchlist_notes values(auth.uid(),'7203','押し目待ち','private note',100);
insert into public.journal_reports values(auth.uid(),'month','2026-10-01','reflection','goal');
insert into public.daily_profit(user_id,date,amount,adjustment_amount) values(auth.uid(),'2026-10-01',500,-10);
do $$begin
 if (select count(*) from trade_records)<>2 then raise exception 'Owner cannot see private trades';end if;
end$$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$declare n integer; begin
 if (select count(*) from trade_records)<>1 then raise exception 'Private trade leaked to another user';end if;
 if (select count(*) from daily_profit)<>0 or (select count(*) from journal_settings)<>0 or (select count(*) from journal_reports)<>0 or (select count(*) from watchlist_notes)<>0 then raise exception 'Private journal metadata leaked';end if;
 if (select count(*) from storage.objects)<>1 then raise exception 'Private image leaked';end if;
 begin insert into trade_records(user_id,stock_code,stock_name,buy_price,sell_price,quantity,profit,trade_date,trade_type,type,screenshot_path) values(auth.uid(),'7203','Cross owner image',100,110,10,100,'2026-10-01','現物','real','11111111-1111-4111-8111-111111111111/private.png');raise exception 'Cross-owner image reference allowed';exception when check_violation then null;end;
 update trade_records set memo='hacked';get diagnostics n=row_count;if n<>0 then raise exception 'Cross-user update allowed';end if;
 begin insert into journal_settings values('11111111-1111-4111-8111-111111111111','manual');raise exception 'Cross-user insert allowed';exception when insufficient_privilege then null;end;
end$$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$begin if (select count(*) from trade_records)<>1 or (select count(*) from storage.objects)<>1 then raise exception 'Anonymous visibility broken';end if;end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$declare result jsonb; payload jsonb; begin
 payload:='[{"stock_code":"6758","stock_name":"Sony","trade_date":"2026-10-01","buy_price":100,"sell_price":120,"quantity":10,"fees":5,"type":"real","trade_type":"現物","visibility":"private","import_key":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]';
 result:=import_journal_trades(payload);if result->>'added'<>'1' then raise exception 'Import failed';end if;
 result:=import_journal_trades(payload);if result->>'skipped'<>'1' then raise exception 'Duplicate import not skipped';end if;
 if (select profit from trade_records where stock_code='6758')<>195 then raise exception 'Import fees not deducted';end if;
 begin
  perform import_journal_trades('[{"stock_code":"6501","stock_name":"Hitachi","trade_date":"2026-10-01","buy_price":100,"sell_price":120,"quantity":10,"fees":0,"type":"real","trade_type":"現物","visibility":"private","import_key":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},{"stock_code":"6502"}]');
  raise exception 'Invalid batch accepted';
 exception when others then if sqlerrm='Invalid batch accepted' then raise;end if;end;
 if exists(select 1 from trade_records where stock_code='6501') then raise exception 'Failed batch was partially saved';end if;
end$$;
rollback;
select 'Journal RLS, storage access, atomic imports, and duplicate handling passed' as result;
