create table public.quests (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null default auth.uid()
                            references auth.users (id) on delete cascade,
    title               text not null check (length(trim(title)) > 0),
    stat_weights        jsonb not null,
    base_exp            integer not null default 20 check (base_exp > 0),
    base_stat_points    integer not null default 2 check (base_stat_points > 0),
    difficulty          text not null default 'normal'
                            check (difficulty in ('easy', 'normal', 'hard')),
    repeats_daily       boolean not null default false,
    archived_at         timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),

    constraint stat_weights_valid check (
        jsonb_typeof(stat_weights) = 'object'
        and stat_weights <> '{}'::jsonb
        and stat_weights - array['STR', 'DEX', 'VIT', 'MND', 'CHA'] = '{}'::jsonb
    )
);

comment on table public.quests is 'Quest definitions written by player.';

create index quests_user_active_idx
    on public.quests (user_id)
    where archived_at is null;

alter table public.quests enable row level security;

create policy "Users can read their own quests"
    on public.quests for select
    to authenticated 
    using ((select auth.uid()) = user_id);

create policy "Users can create their own quests"
    on public.quests for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy "Users can update their own quests"
    on public.quests for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create trigger quests_set_updated_at
    before update on public.quests
    for each row execute function public.set_updated_at();