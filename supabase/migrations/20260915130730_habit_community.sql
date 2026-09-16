-- Private by default. No service key is used by the browser.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  avatar text not null default '🌱' check (char_length(avatar) <= 16),
  goal text not null default '' check (char_length(goal) <= 140),
  tags text[] not null default '{}' check (cardinality(tags) <= 5),
  discoverable boolean not null default false,
  created_at timestamptz not null default now()
);
create index profiles_tags_idx on public.profiles using gin(tags) where discoverable;
create table public.cloud_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 3000000),
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
create function private.bump_revision() returns trigger language plpgsql set search_path = '' as $$
begin new.revision := old.revision + 1; new.updated_at := now(); return new; end;
$$;
create trigger cloud_revision before update on public.cloud_saves for each row execute function private.bump_revision();
create table public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  created_at timestamptz not null default now()
);
create index boards_owner_idx on public.boards(owner_id);
create table public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer','editor')),
  accepted boolean not null default false,
  primary key (board_id,user_id)
);
create index board_members_user_idx on public.board_members(user_id,board_id);
create table public.board_tasks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  completed boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index board_tasks_board_idx on public.board_tasks(board_id,created_at);
create index board_tasks_author_idx on public.board_tasks(created_by);
create function private.owns_board(bid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.boards b where b.id=bid and b.owner_id=(select auth.uid()));
$$;
create function private.board_access(bid uuid, writing boolean default false, pending boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (private.owns_board(bid) or exists(
    select 1 from public.board_members m where m.board_id=bid and m.user_id=(select auth.uid())
      and (m.accepted or pending) and (not writing or m.role='editor')
  ));
$$;

create table public.habit_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tag text not null unique check (char_length(tag) between 1 and 20),
  description text not null default '' check (char_length(description) <= 140),
  weekly_goal integer not null default 20 check (weekly_goal between 1 and 1000),
  created_at timestamptz not null default now()
);
create index habit_groups_owner_idx on public.habit_groups(owner_id);
create table public.group_members (
  group_id uuid not null references public.habit_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(group_id,user_id)
);
create index group_members_user_idx on public.group_members(user_id,group_id);
create table public.group_checkins (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.habit_groups(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  nickname text not null check(char_length(nickname) between 1 and 30),
  message text not null check(char_length(message) between 1 and 200),
  created_at timestamptz not null default now(),
  unique(group_id,user_id,day)
);
create index group_checkins_date_idx on public.group_checkins(group_id,day desc);
create index group_checkins_user_idx on public.group_checkins(user_id);
create table public.cheers (
  checkin_id uuid not null references public.group_checkins(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key(checkin_id,user_id)
);
create index cheers_user_idx on public.cheers(user_id);
create function private.in_group(gid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.group_members m where m.group_id=gid and m.user_id=(select auth.uid()));
$$;
create function private.owns_group(gid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.habit_groups g where g.id=gid and g.owner_id=(select auth.uid()));
$$;
create function private.can_cheer(cid uuid, writing boolean default false) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.group_checkins p where p.id=cid and private.in_group(p.group_id) and (not writing or p.user_id<>(select auth.uid())));
$$;

alter table public.profiles enable row level security;
alter table public.cloud_saves enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.board_tasks enable row level security;
alter table public.habit_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_checkins enable row level security;
alter table public.cheers enable row level security;
revoke all on public.profiles,public.cloud_saves,public.boards,public.board_members,public.board_tasks,public.habit_groups,public.group_members,public.group_checkins,public.cheers from anon,authenticated;
grant select,insert,delete on public.profiles,public.cloud_saves,public.boards,public.board_members,public.board_tasks,public.habit_groups,public.group_members,public.group_checkins,public.cheers to authenticated;
grant update(display_name,avatar,goal,tags,discoverable) on public.profiles to authenticated;
grant update(payload) on public.cloud_saves to authenticated;
grant update(title) on public.boards to authenticated;
grant update(accepted) on public.board_members to authenticated;
grant update(title,completed) on public.board_tasks to authenticated;
grant update(description,weekly_goal) on public.habit_groups to authenticated;
revoke all on function private.bump_revision(),private.owns_board(uuid),private.board_access(uuid,boolean,boolean),private.in_group(uuid),private.owns_group(uuid),private.can_cheer(uuid,boolean) from public;
grant execute on function private.owns_board(uuid),private.board_access(uuid,boolean,boolean),private.in_group(uuid),private.owns_group(uuid),private.can_cheer(uuid,boolean) to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (id=(select auth.uid()) or discoverable);
create policy profiles_add on public.profiles for insert to authenticated with check (id=(select auth.uid()));
create policy profiles_edit on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy profiles_remove on public.profiles for delete to authenticated using (id=(select auth.uid()));
create policy cloud_own on public.cloud_saves for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy boards_read on public.boards for select to authenticated using (owner_id=(select auth.uid()) or private.board_access(id,false,true));
create policy boards_add on public.boards for insert to authenticated with check (owner_id=(select auth.uid()));
create policy boards_edit on public.boards for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy boards_remove on public.boards for delete to authenticated using (owner_id=(select auth.uid()));
create policy membership_read on public.board_members for select to authenticated using (user_id=(select auth.uid()) or private.owns_board(board_id));
create policy membership_invite on public.board_members for insert to authenticated with check (private.owns_board(board_id) and user_id<>(select auth.uid()) and not accepted);
create policy membership_accept on public.board_members for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy membership_remove on public.board_members for delete to authenticated using (user_id=(select auth.uid()) or private.owns_board(board_id));
create policy shared_tasks_read on public.board_tasks for select to authenticated using (private.board_access(board_id));
create policy shared_tasks_add on public.board_tasks for insert to authenticated with check (private.board_access(board_id,true) and created_by=(select auth.uid()));
create policy shared_tasks_edit on public.board_tasks for update to authenticated using (private.board_access(board_id,true)) with check (private.board_access(board_id,true));
create policy shared_tasks_remove on public.board_tasks for delete to authenticated using (private.board_access(board_id,true));
create policy groups_read on public.habit_groups for select to authenticated using (true);
create policy groups_add on public.habit_groups for insert to authenticated with check (owner_id=(select auth.uid()));
create policy groups_edit on public.habit_groups for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy groups_remove on public.habit_groups for delete to authenticated using (owner_id=(select auth.uid()));
create policy group_members_read on public.group_members for select to authenticated using (user_id=(select auth.uid()) or private.in_group(group_id));
create policy group_members_join on public.group_members for insert to authenticated with check (user_id=(select auth.uid()));
create policy group_members_leave on public.group_members for delete to authenticated using (user_id=(select auth.uid()));
create policy checkins_read on public.group_checkins for select to authenticated using (private.in_group(group_id));
create policy checkins_add on public.group_checkins for insert to authenticated with check (private.in_group(group_id) and user_id=(select auth.uid()) and day between (now() at time zone 'UTC')::date - 1 and (now() at time zone 'UTC')::date + 1);
create policy checkins_remove on public.group_checkins for delete to authenticated using (user_id=(select auth.uid()) or private.owns_group(group_id));
create policy cheers_read on public.cheers for select to authenticated using (private.can_cheer(checkin_id));
create policy cheers_add on public.cheers for insert to authenticated with check (user_id=(select auth.uid()) and private.can_cheer(checkin_id,true));
create policy cheers_remove on public.cheers for delete to authenticated using (user_id=(select auth.uid()));
