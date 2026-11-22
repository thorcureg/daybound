-- Phase 0: player profiles.
-- One row per auth user. Holds the day-boundary settings the rules package uses.

create table public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  display_name   text,
  timezone       text not null default 'Asia/Manila',
  rollover_hour  smallint not null default 4 check (rollover_hour between 0 and 23),
  rest_from      date,
  rest_until     date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint rest_range check (rest_until is null or rest_from is null or rest_until >= rest_from)
);

comment on table public.profiles is 'Per-user settings: timezone, day rollover hour, rest mode.';

-- Row-level security is on from the first migration (multi-user ready).
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Users may edit their own settings. Reward tables added later will have no
-- client write policies; only server functions write EXP and stats.
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Keep updated_at current.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
