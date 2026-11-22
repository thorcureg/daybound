# Daybound

A personal life RPG: real-life tasks become quests. See [Daybound Build Plan.md](Daybound%20Build%20Plan.md) for the full plan.

## Layout

| Path | What it is |
| --- | --- |
| `apps/web` | React + Vite + Tailwind client (3D comes in Phase 5) |
| `packages/rules` | Shared game rules as pure TypeScript: leveling, rewards, decay, day boundaries |
| `supabase/migrations` | Database tables, row-level security, Postgres functions |
| `supabase/functions` | Edge Functions (from Phase 1 on) |

## Requirements

- Node 24+
- Docker Desktop, only for running Supabase locally (`npm run db:start`)

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install everything |
| `npm run dev` | Start the web client at http://localhost:5173 |
| `npm run dev:all` | Start local Supabase, then the web client |
| `npm test` | Run the rules unit tests |
| `npm run check` | Typecheck, test, and build (what CI runs) |
| `npm run db:reset` | Rebuild the local database from migrations |

## Rules of the codebase

1. Game rules live in `packages/rules`, never in the AI and never only in the client.
2. The client cannot write rewards: EXP and stat changes go through server functions.
3. Every table has a `user_id` and row-level security from its first migration.
4. Rules files use explicit `.ts` import extensions so Supabase Edge Functions (Deno) can import them as-is.
