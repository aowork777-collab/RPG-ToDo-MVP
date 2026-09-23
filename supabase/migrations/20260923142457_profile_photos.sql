-- Small re-encoded JPEG avatars share the existing profile visibility policy.
alter table public.profiles add column avatar_photo text;

alter table public.profiles add constraint profiles_avatar_photo_format
  check (avatar_photo is null or (
    char_length(avatar_photo) <= 100000 and
    avatar_photo ~ '^data:image/jpeg;base64,/9j/[A-Za-z0-9+/]+={0,2}$'
  ));

grant update (avatar_photo) on public.profiles to authenticated;

comment on column public.profiles.avatar_photo is
  'Optional 256px JPEG thumbnail. Visible only through existing profile RLS; never automatically published from local profile.';
