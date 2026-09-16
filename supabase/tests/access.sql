-- Run in a SQL test connection. Every fixture and mutation is rolled back.
begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000001','rpg-owner@example.invalid'),
 ('00000000-0000-4000-8000-000000000002','rpg-viewer@example.invalid'),
 ('00000000-0000-4000-8000-000000000003','rpg-editor@example.invalid'),
 ('00000000-0000-4000-8000-000000000004','rpg-outsider@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.profiles(id,display_name) values ('00000000-0000-4000-8000-000000000001','Private owner');
insert into public.cloud_saves(user_id,payload) values ('00000000-0000-4000-8000-000000000001','{"private":true}');
insert into public.boards(id,title) values ('00000000-0000-4000-8000-000000000010','Private board');
insert into public.board_tasks(id,board_id,title) values ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000010','Private task');
insert into public.board_members(board_id,user_id,role) values
 ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','viewer'),
 ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000003','editor');
insert into public.habit_groups(id,tag) values ('00000000-0000-4000-8000-000000000020','__rls_test__');
insert into public.group_members(group_id,user_id) values ('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000001');
insert into public.group_checkins(id,group_id,day,nickname,message) values ('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000020',current_date,'Owner','Today I started');
do $$ begin
  assert (select count(*)=1 from public.board_tasks), 'Owner must read tasks';
  begin insert into public.cheers(checkin_id) values ('00000000-0000-4000-8000-000000000021'); raise exception 'Self-cheer allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
do $$ declare changed integer; begin
  assert (select count(*)=0 from public.boards), 'Outsider saw board';
  assert (select count(*)=0 from public.board_tasks), 'Outsider saw tasks';
  assert (select count(*)=0 from public.cloud_saves), 'Outsider saw backup';
  assert (select count(*)=0 from public.profiles), 'Private profile leaked';
  assert (select count(*)=0 from public.group_checkins), 'Outsider saw group posts';
  update public.board_tasks set completed=true; get diagnostics changed=row_count; assert changed=0, 'Outsider edited';
  begin insert into public.board_members(board_id,user_id,role) values ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000004','editor'); raise exception 'Self-invite allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.cheers(checkin_id) values ('00000000-0000-4000-8000-000000000021'); raise exception 'Non-member cheered'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
  assert (select count(*)=1 from public.boards), 'Invite title should be visible';
  assert (select count(*)=0 from public.board_tasks), 'Unaccepted invite saw tasks';
end $$;
update public.board_members set accepted=true where user_id=(select auth.uid());
do $$ declare changed integer; begin
  assert (select count(*)=1 from public.board_tasks), 'Viewer cannot read';
  update public.board_tasks set completed=true; get diagnostics changed=row_count; assert changed=0, 'Viewer edited tasks';
  begin update public.board_members set role='editor'; raise exception 'Viewer elevated role'; exception when insufficient_privilege then null; end;
  begin update public.boards set owner_id=(select auth.uid()); raise exception 'Viewer stole ownership'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
update public.board_members set accepted=true where user_id=(select auth.uid());
do $$ declare changed integer; begin
  update public.board_tasks set completed=true; get diagnostics changed=row_count; assert changed=1, 'Editor cannot edit';
  begin update public.board_tasks set board_id='00000000-0000-4000-8000-000000000099'; raise exception 'Editor can move private data'; exception when insufficient_privilege then null; end;
end $$;
insert into public.group_members(group_id,user_id) values ('00000000-0000-4000-8000-000000000020',(select auth.uid()));
do $$ begin assert (select count(*)=1 from public.group_checkins), 'Joined member cannot read'; end $$;
insert into public.cheers(checkin_id) values ('00000000-0000-4000-8000-000000000021');
do $$ begin
  begin insert into public.cheers(checkin_id) values ('00000000-0000-4000-8000-000000000021'); raise exception 'Duplicate cheer allowed'; exception when unique_violation then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
delete from public.board_members where user_id='00000000-0000-4000-8000-000000000003';
update public.cloud_saves set payload='{"version":2}' where revision=1;
do $$ begin assert (select revision=2 from public.cloud_saves), 'Cloud revision not incremented'; end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ declare changed integer; begin
  assert (select count(*)=0 from public.board_tasks), 'Revoked member still reads';
  update public.board_tasks set completed=false; get diagnostics changed=row_count; assert changed=0, 'Revoked member still edits';
end $$;
set local role anon;
do $$ begin
  begin perform * from public.board_tasks; raise exception 'Anonymous read allowed'; exception when insufficient_privilege then null; end;
  begin perform * from public.cloud_saves; raise exception 'Anonymous cloud read allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: owner / pending invite / viewer / editor / outsider / revoked / anon / groups / private backup / role escalation / duplicate rewards' as result;
rollback;
