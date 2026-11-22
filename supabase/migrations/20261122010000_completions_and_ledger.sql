alter table public.quests
    add constraint quests_id_user_id_key unique (id, user_id);

create table public.quest_completions (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references auth.users (id) on delete cascade,
    quest_id            uuid not null,
    game_day            date not null, 
    difficulty          text not null check (difficulty in ('easy', 'normal', 'hard')),
    note                text check (note is null or length(note) <= 280),
    completed_at        timestamptz not null default now(),
    constraint quest_completions_quest_fk
        foreign key (quest_id, user_id)
        references public.quests (id, user_id)
        on delete cascade,

    constraint quest_completions_once_per_day unique (quest_id, game_day)
);

comment on table public.quest_completions is 'One row per quest completed per game day. Written only by the server';

create index quest_completions_user_day_idx
    on public.quest_completions (user_id, game_day);

create table public.xp_events (
    id                   bigint generated always as identity primary key,
    user_id              uuid not null references auth.users (id) on delete cascade,           
    completion_id        uuid references public.quest_completions (id) on delete cascade,          
    reason               text not null
                            check (reason in ('quest_completed', 'decay', 'adjustment')),
    exp                  integer not null default 0,
    str                  integer not null default 0,
    dex                  integer not null default 0,
    vit                  integer not null default 0,
    mnd                  integer not null default 0,
    cha                  integer not null default 0,
    created_at           timestamptz not null default now(),
    constraint xp_events_one_per_completion unique (completion_id),

    constraint xp_events_completion_matches_reason
        check((reason = 'quest_completed') = (completion_id is not null))
    
);

comment on table public.xp_events is 'Append-only ledger of EXP and stat changes. Written only by the server.';

create index xp_events_user_idx on public.xp_events (user_id);

create function public.prevent_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    raise exception 'Table % is append only', tg_table_name;
end;
$$;

create trigger xp_events_no_update
    before update on public.xp_events
    for each row execute function public.prevent_update();

alter table public.quest_completions enable row level security;
alter table public.xp_events enable row level security;

create policy "Users can read their own completions"
    on public.quest_completions for select 
    to authenticated 
    using ((select auth.uid()) = user_id);

create policy "Users can read their own xp events"
    on public.xp_events for select 
    to authenticated 
    using ((select auth.uid()) = user_id);

revoke insert, update, delete, truncate on public.quest_completions from anon, authenticated;
revoke insert, update, delete, truncate on public.xp_events from anon, authenticated;

create view public.character_stats
    with (security_invoker = true)
as
select 
    user_id,
    sum(exp)::integer as lifetime_exp,
    sum(str)::integer as str,
    sum(dex)::integer as dex,
    sum(vit)::integer as vit,
    sum(mnd)::integer as mnd,
    sum(cha)::integer as cha
from public.xp_events
group by user_id;

comment on view public.character_stats is 'Lifetime EXP and stats per user, summed from xp_events.';
