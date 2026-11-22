# Daybound: Build Plan

*Draft for review. Updated with the decisions from section 14. Placeholder numbers are still open for tuning.*

**Daybound** is a web-first 3D life RPG built with React and React Three Fiber on top of Supabase. It ships as an installable web app (PWA) for Android and iPhone. The quest loop has to be fun with no art before any 3D work starts. AI comes in later to write quests and NPC dialogue, while all game rules stay in plain code.

## 1. Goal and scope

The goal is a personal RPG where real-life tasks become quests, so daily routines feel like progress in a game worth opening.

**Version 1 is single-player:** one account (yours), but the data is built so more players can join later without a migration.

**Version 1 includes:**

- One character with 5 stats (STR, DEX, VIT, MND, CHA), a level, and EXP
- A quest board with repeating quests (hourly, daily, weekly, monthly) and event quests
- Quest tiers that scale with your stat levels
- Difficulty tiers the player picks, with Easy keeping the streak alive
- Soft NPC nudges plus slow stat decay, with a rest mode
- A node list of goals and ideas that the AI uses to suggest quests
- A 3D village with tappable buildings and NPC dialogue, built with our own models
- Online access, installable on Android and iPhone

**Version 1 leaves out:**

- Free-roam walking through the village (planned for later)
- Other players' accounts, multiplayer, guilds, and social features
- App Store and Google Play releases (planned for later)
- Automatic quest completion from calendars, commits, or tickets

**Success looks like:** you use it every day for four weeks without it feeling like a chore.

## 2. Design decisions

| Area | Decision |
| --- | --- |
| Name | Daybound |
| Players | Only you in v1; every table carries a `user_id` so others can join later |
| Stats | STR, DEX (agility + dexterity), VIT, MND (INT + WIS), CHA |
| Rewards | EXP and stat points; one quest can feed several stats with weights (for example 70% STR, 30% VIT) |
| Build | Decides which quests are offered and how much they pay; never forces harder quests |
| Quest sizing | Quests match your current stat level: a low stat gets small, achievable quests |
| Stat unlocks | Quest tiers first (v1), then NPC services (Phases 4–5), then gear slots (Phase 7) |
| Difficulty | Chosen by the player: Easy, Normal, Hard |
| Neglect | NPC nudge first, then slow decay with a grace period, a floor, and a rest mode |
| Progression | Achievements, plus unlockable gear that boosts EXP |
| NPCs | One per stat, plus Guildmaster, Elder, Merchant, and an optional Scribe |
| Time | Timestamps stored in UTC; each user has a timezone (default `Asia/Manila`) and a day-rollover hour (default 4 AM) |
| Honesty | Self-reported. Cheating only cheats yourself, so there are no anti-cheat checks in v1 |
| Backend | Supabase (Postgres, Auth, Edge Functions) |
| Art | Our own models: low-poly built in code and Blender, with Claude's help |
| Camera | Fixed-camera diorama first, free-roam later |
| Platforms | Installable web app now; store apps later through Capacitor |
| AI | Writes quest text and NPC lines from your goal nodes; never sets rewards |
| Budget | Free until Phase 6, then a few dollars of Claude API credit |

## 3. Tech stack

The stack matches what you already know, with 3D as the main new skill.

| Layer | Choice | Why |
| --- | --- | --- |
| Client | React + TypeScript + Vite | One codebase for web, Android, and iPhone |
| Styling and UI | Tailwind, Framer Motion | Fast custom game UI and animations |
| 3D | React Three Fiber + drei (Three.js) | The standard way to do 3D in React, light on the web |
| Node graph | React Flow | Ready-made draggable graph |
| Client state | Zustand + TanStack Query | Small and simple for game and server state |
| Backend | Supabase | Database, auth, and server functions without running a server |
| Database | PostgreSQL (in Supabase) | Fits stats, schedules, and the node graph |
| Auth | Supabase Auth | No hand-rolled password handling |
| Server logic | Supabase Edge Functions (TypeScript) + Postgres functions | Quest completion, decay, and AI calls run here, not on the device |
| AI | Claude API, called from an Edge Function only | Keeps the key off devices and lets the server validate output |
| Local development | Supabase CLI (runs a local Supabase stack in Docker) | Same setup locally and in production |
| Phones | PWA first, Capacitor later | Test by link, go native when you want store releases |
| Hosting | Client on Netlify, Vercel, or Cloudflare Pages; Supabase hosted project | Both have free tiers |

**Alternatives considered:** a custom Node + Express API (more control, more work to host and secure), Godot (strong game tooling but weaker for web and your React skills), Babylon.js (more built in, smaller community), Unity (too heavy for the web).

## 4. Architecture

The server is the referee: the client shows the game, but the database and Edge Functions decide what counts.

**Project layout (one repository, `daybound`):**

- `apps/web`: the React and 3D client
- `supabase/migrations`: database tables, row-level security policies, and Postgres functions
- `supabase/functions`: Edge Functions (quest completion, AI drafts, recap)
- `packages/rules`: shared game rules (EXP, levels, decay, difficulty, quest sizing), written as pure TypeScript functions

The client imports `packages/rules` to preview rewards, and the Edge Functions import the same package to apply them. One copy of the rules, easy to unit test.

**Core principles:**

1. **Rules in code, flavor in AI.** EXP, stats, decay, and rewards never come from the model.
2. **The client cannot write rewards.** Row-level security lets the client read its own data, but EXP and stat changes are written only by Edge Functions or Postgres functions.
3. **An append-only ledger.** Every EXP or stat change is saved as an event. Current stats are calculated from the ledger, so bugs can be fixed by recalculating.
4. **Decay calculated on read.** When the app opens, it works out how much decay has happened. No background job is needed for this.
5. **Each quest instance completes once.** Completion is idempotent, so a double tap or a retry can never pay twice.
6. **Offline-tolerant.** The client queues completions and syncs them when the connection returns.
7. **Multi-user ready.** Every row belongs to a `user_id`, and row-level security is on from the first migration.

**Flow for AI quest suggestions:**

1. You pin one or more nodes as focus.
2. An Edge Function sends the focused nodes and your build summary to the model.
3. The model returns quest drafts in a strict structure (title, story text, suggested stats, suggested difficulty).
4. The function validates the structure, then the rules package assigns the EXP and stat rewards.
5. You see the drafts and accept or dismiss them.

## 5. Data model

A first pass at the tables, to be refined in Phase 2. Every table except shared definitions has a `user_id` and row-level security.

| Table | What it holds |
| --- | --- |
| profiles | Linked to Supabase `auth.users`: timezone (default `Asia/Manila`), day-rollover hour, rest mode dates |
| characters | Name, level, lifetime EXP, appearance, equipped items |
| stat\_values | Per stat: lifetime value, peak value, last activity date |
| quest\_templates | Reusable quests: title, stat weights, schedule rule, base EXP, tier |
| quest\_instances | A specific offered or accepted quest: status, tier, difficulty, due time, completed time, optional note |
| xp\_events | The ledger: what changed, by how much, why, and when |
| nodes | Goals and ideas: text, type, linked stat, focus flag |
| node\_links | Connections between nodes |
| npcs | Name, role, stat, personality sheet, dialogue lines (shared definitions) |
| achievements and user\_achievements | Definitions and unlocked dates |
| items and inventory | Gear, its effect, and what you own |
| settings | Notification, sound, and accessibility choices |

## 6. Game rules

The numbers below are placeholders to tune during playtesting, not final values.

| Rule | Starting proposal |
| --- | --- |
| EXP to next level | 100 × level^1.5, rounded |
| Difficulty multiplier | Easy 0.5×, Normal 1×, Hard 1.5× |
| Quest tier | Set by the stat's current value; higher tiers ask for more work and pay more |
| Daily offer | 3 quests at your current tiers, plus 1 weighted toward your build |
| Special quest | Small daily chance of a bonus quest for a stat you trained most in the last 7 days |
| Decay grace period | 14 days without activity in a stat |
| Decay rate | 2% of the current value per week after the grace period |
| Decay floor | 50% of the stat's peak value |
| Comeback bonus | 1.5× stat gain for the first 3 quests after a lapse |
| Gear boosts | Capped total EXP bonus, so leveling cannot become trivial |
| Streaks | Easy quests keep the streak; rest mode freezes it |
| Day boundary | A "day" runs from the rollover hour to the next rollover hour in the user's timezone |

**Settled:**

- **Stat unlocks:** stats unlock quest tiers (v1), NPC services (with the NPCs in Phases 4–5), and gear slots (with items in Phase 7).
- **Quest selection:** offers follow your build and your recent activity. A low stat only asks for work at that level. A stat you've been prioritizing can trigger a special quest.
- **Time:** timestamps are stored in UTC; daily, weekly, and monthly resets use the user's timezone and rollover hour. In v1 that is Manila time at 4 AM.
- **Honest completion:** self-reported with no checks. The reward is only satisfying if you really did it. An optional one-line note on completion gives the Scribe recap something to work with.

**Still to decide in Phase 2:**

- The exact stat thresholds for each quest tier
- How many tiers each stat has in v1

## 7. AI design

AI is an add-on layer that can be turned off without breaking the game.

**Where it is used:**

- Turning focused nodes into quest drafts
- Writing NPC dialogue and nudges from short personality sheets
- Turning a typed sentence ("presentation on Friday") into an event quest
- The weekly Scribe recap

**Guardrails:**

- The API key lives in Supabase Edge Function secrets only.
- The model must return a strict structure, and the function rejects anything that does not match.
- The model suggests; the rules package decides rewards.
- Per-user daily request limits and caching keep costs predictable.
- If the AI is down or over budget, the game falls back to hand-written template quests and stock NPC lines.
- Node text is treated as untrusted input to the model, so a stray instruction inside a note cannot change the rules.

**Privacy:** nodes may contain health, mood, and work details. Send the minimum needed, show what is sent, and allow deleting nodes and history. Check the current data-handling terms of the API before launch.

**Model and cost:** start with Claude Haiku 5.5 ($0.10 per million input tokens, $0.50 per million output tokens at the time of writing). A quest draft or NPC line is roughly 1,500 tokens in and 500 out, about $0.0004 per call. At 50 calls a day, that is about $0.60 a month. Recheck prices when Phase 6 starts.

**Billing note:** a Claude Pro subscription does not include API usage. The API is billed separately through the Anthropic Console with prepaid credits.

## 8. 3D and RPG feel

Most of the RPG feel comes from UI, sound, and feedback; the 3D village is the stage.

**Approach:**

- **Fixed-camera diorama.** A small village with a limited camera tilt, tappable buildings, and NPCs standing in place. Free-roam comes after version 1.
- **Normal React UI over the 3D scene.** Quest log, dialogue, character sheet, inventory, and the node graph stay in the page, so text is sharp and works well on phones.
- **Render only when needed.** Pause or slow the 3D scene when a menu covers it, to save battery.

**Feel checklist:**

- Dialogue box with portrait, name plate, and typewriter text
- Floating "+EXP" numbers, level-up screen, loot pop-ups, and achievement banners
- Short sound effects for accepting and completing quests, with optional ambient music
- Stat bars and a character sheet that look like a game, not a form

**Art: our own models**

- **Low-poly, stylized look** for speed and phone performance.
- **Built in code first:** houses, trees, props, and simple NPCs made from basic shapes in React Three Fiber. This is the fastest route and the easiest for Claude to help with.
- **Blender for character:** Claude can write Blender Python scripts that generate base models, which you then refine by hand. Learning basic Blender is worth a few weekends.
- **Export as glTF** with compressed meshes and textures.
- If you ever mix in free assets, check each license and keep a credits list.

**Performance targets to verify early:** smooth frame rate on a mid-range Android phone, a small first download, and no overheating after ten minutes of use. Set the exact numbers in Phase 5, after measuring on a real device.

## 9. Mobile and platforms

The game runs in the browser first. Store apps come later, when you want other people to download it.

- **PWA (now):** installable on both Android and iPhone. On iPhone, web push notifications generally need the app installed to the home screen, and they are less reliable than native.
- **Notifications matter** for the nudges. If they prove too weak as a PWA, that is a reason to move to Capacitor sooner.
- **Capacitor (later):** wraps the same code as a native app with better push support. Apple charges a yearly developer fee and Google a one-time fee; check current prices before committing.
- **Store review:** apps that are only a thin web wrapper can be rejected, so native features such as push and offline play help.
- **Offline:** cache the app and queue quest completions for later sync.
- **Dates and times:** UTC storage plus each user's timezone and rollover hour, so "daily" quests reset when the player's day actually ends, wherever they live.

## 10. Roadmap

Each phase has a gate, so you only move on once it is true.

| Phase | Goal | Done when |
| --- | --- | --- |
| 0. Setup | Repo, Supabase project and local CLI, basic CI, shared rules package | You can run the whole stack locally with one command |
| 1. Core loop | Character, 5 stats, level, EXP, manual quest board, plain text UI, no AI, no 3D | You complete real quests on your phone for two weeks and still want to |
| 2. Rules | Quest tiers, repeat schedules, difficulty, multi-stat rewards, decay, nudges, rest mode, ledger | Rules pass unit tests and feel fair in daily use |
| 3. PWA and sync | Supabase Auth login, deployment, installable app, offline queue | Installed on Android and iPhone, works with a bad connection |
| 4. RPG UI | Dialogue boxes, character sheet, inventory, sounds, feedback animations | The game feels like an RPG even with no 3D |
| 5. 3D village | Fixed-camera diorama from our own models, tappable buildings, NPCs and their services, performance pass | Smooth on a mid-range phone, and a small first download |
| 6. Nodes and AI | Node list, focus pins, AI quest drafts, NPC dialogue, fallbacks and limits | AI drafts are useful and the game still works with AI off |
| 7. Content | Achievements, gear and gear slots, event quests, Scribe recap, node graph view | A month of play without running out of things to do |
| 8. Native and sharing | Capacitor build, push notifications, accounts for other players, store submission | When you want other people to download Daybound |

Phases 1 to 3 give you a usable app. Everything after that is improvement.

## 11. Budget

| Item | Cost |
| --- | --- |
| Supabase | Free tier. Free projects pause after a period of inactivity, which daily use avoids |
| Client hosting | Free tier on Netlify, Vercel, or Cloudflare Pages |
| Claude API | Not needed until Phase 6; then roughly under $1 a month at the usage above. Not covered by Claude Pro |
| Domain (optional) | Roughly $10–15 a year |
| App stores (Phase 8) | Apple yearly fee, Google one-time fee |

## 12. Risks and things to consider

- **3D scope creep.** The village can swallow weeks, especially with our own models. Keep the diorama small and the camera fixed until the loop is proven.
- **Novelty fade.** The biggest risk to any quest app. Reward comebacks, keep rest days safe, and add a short weekly review.
- **Performance on phones.** Test on a real mid-range Android early. Heat and battery drain are easy to miss on a laptop.
- **Reset and timezone bugs.** Daily and weekly resets are easy to get wrong. Test with Manila and at least two other timezones, even in v1.
- **Duplicate rewards.** Idempotent completion and the ledger protect against retries and double taps.
- **Supabase limits.** Watch the free-tier quotas and the inactivity pause. Keep migrations in the repo so the project can be recreated.
- **AI cost and reliability.** Limits, caching, and a no-AI fallback keep both under control.
- **Privacy and security.** Row-level security on every table, rate limits on Edge Functions, backups, and an export-and-delete option for personal data. This matters most once other people join.
- **Name availability.** Check app stores, domains, and existing games for "Daybound" before you build anything public around the name.
- **Accessibility.** Include a sound-off option, reduced motion, readable text sizes, and color choices that do not rely on color alone.
- **Backups.** Check what the Supabase plan backs up, export the database yourself regularly, and test a restore at least once.
- **Your time.** Plan around a full-time job: small, finishable steps beat big rewrites.

## 13. Testing and quality

- Unit tests for the rules package (EXP, levels, quest tiers, difficulty, decay, streaks)
- Tests for schedule, rollover hour, and timezone edge cases
- Tests that row-level security blocks the client from writing rewards directly
- Seed data so you can try any stage of the game quickly
- Manual play on at least one Android phone and one iPhone before each phase gate
- A short playtest log: what felt good, what felt like a chore

## 14. Decisions made

| Question | Decision |
| --- | --- |
| Only you, or friends too? | Only you for v1; data built for more players later |
| Diorama or free-roam? | Fixed-camera diorama first, free-roam later |
| Express or Supabase? | Supabase |
| Where does the art come from? | Our own models, built with Claude's help |
| Monthly budget? | Free for now; a few dollars of API credit from Phase 6 |
| Store apps? | Installable web app for now; store apps later so others can download it |
| Working name? | Daybound |

## 15. What to check when reviewing

- Does the phase order match how you want to build it?
- Are there features you expected in version 1 that are placed later?
- Do the placeholder numbers in section 6 feel roughly right, even if not final?
- Is anything here bigger than you want to take on?
