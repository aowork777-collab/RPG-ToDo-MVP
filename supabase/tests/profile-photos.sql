-- Temporary fixtures are always rolled back; no existing account is changed.
begin;
select set_config('test.photo_owner',gen_random_uuid()::text,true);
select set_config('test.photo_viewer',gen_random_uuid()::text,true);
insert into auth.users(id) values (current_setting('test.photo_owner')::uuid),(current_setting('test.photo_viewer')::uuid);
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.photo_owner'),'role','authenticated')::text,true);
insert into public.profiles(id,display_name,avatar_photo) values (auth.uid(),'Photo fixture','data:image/jpeg;base64,/9j/TEST');
do $$ begin
  assert (select avatar_photo='data:image/jpeg;base64,/9j/TEST' from public.profiles where id=auth.uid()), 'Owner cannot save photo';
  update public.profiles set avatar_photo='data:image/jpeg;base64,/9j/NEXT' where id=auth.uid();
  begin
    update public.profiles set avatar_photo='data:image/svg+xml,<svg/>' where id=auth.uid();
    raise exception 'Non-JPEG accepted';
  exception when check_violation then null; end;
  begin
    update public.profiles set avatar_photo='data:image/jpeg;base64,/9j/'||repeat('A',100001) where id=auth.uid();
    raise exception 'Oversize photo accepted';
  exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.photo_viewer'),'role','authenticated')::text,true);
do $$ begin
  assert (select count(*)=0 from public.profiles where id=current_setting('test.photo_owner')::uuid), 'Private photo leaked';
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.photo_owner'),'role','authenticated')::text,true);
update public.profiles set discoverable=true where id=auth.uid();
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.photo_viewer'),'role','authenticated')::text,true);
do $$ declare changed integer; begin
  assert (select avatar_photo='data:image/jpeg;base64,/9j/NEXT' from public.profiles where id=current_setting('test.photo_owner')::uuid), 'Published photo unavailable';
  update public.profiles set avatar_photo=null where id=current_setting('test.photo_owner')::uuid;
  get diagnostics changed=row_count; assert changed=0, 'Viewer can edit another photo';
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.photo_owner'),'role','authenticated')::text,true);
update public.profiles set avatar_photo=null,discoverable=false where id=auth.uid();
do $$ begin
  assert (select avatar_photo is null from public.profiles where id=auth.uid()), 'Removal failed';
  assert not has_column_privilege('anon','public.profiles','avatar_photo','SELECT'), 'Anonymous photo access';
end $$;
rollback;
