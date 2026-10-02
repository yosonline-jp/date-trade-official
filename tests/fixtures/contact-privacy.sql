\set ON_ERROR_STOP on
begin;
set local role anon;
insert into public.contact(name,email,title,content) values('Visitor','visitor@example.com','Question','Valid question');
do $$begin
 begin perform * from public.contact;raise exception 'Anonymous can read contacts';exception when insufficient_privilege then null;end;
 begin update public.contact set content='Changed';raise exception 'Anonymous can update contacts';exception when insufficient_privilege then null;end;
 begin delete from public.contact;raise exception 'Anonymous can delete contacts';exception when insufficient_privilege then null;end;
 begin insert into public.contact(name,email,title,content) values('Bot','bot@example.com','Spam',repeat('x',5001));raise exception 'Oversized input accepted';exception when insufficient_privilege then null;end;
 begin insert into public.contact(name,email,title,content) values('Bot','invalid','Spam','text');raise exception 'Invalid email accepted';exception when insufficient_privilege then null;end;
end$$;
set local role authenticated;
insert into public.contact(name,email,title,content) values('Member','member@example.com','Question','Valid question');
do $$begin
 begin perform * from public.contact;raise exception 'Member can read contacts';exception when insufficient_privilege then null;end;
end$$;
set local role service_role;
do $$begin
 if (select count(*) from contact)<>3 then raise exception 'Historic rows or submitted messages missing';end if;
end$$;
rollback;
select 'Contact: anonymous/member INSERT, denied SELECT/UPDATE/DELETE, invalid inputs rejected, server read and historical data preservation passed' as result;
