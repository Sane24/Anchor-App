-- Anchor — Supabase schema
-- Safe to re-run: everything is guarded with "if not exists" / "drop policy if exists".

-- Design: localStorage stays the source of truth. These tables are a per-user
-- mirror so signing in on another device brings your data with you. Payloads are
-- JSONB because the client shape is still moving (releasedAt, sleepHours and
-- steps all landed in the last week) — a normalized schema would need a
-- migration every time a screen gains a field.

-- RLS is what makes the browser-visible publishable key safe. Without the
-- policies below, anyone who finds the project URL can read every row.

-- One row per user per day: the plan blob { anchors, candidates, rollover }.
create table if not exists public.day_plans (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  date       date        not null,
  plan       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- One row per user per night: { helped, hindered, remember, sleepHours, steps, closedAt }.
create table if not exists public.journal_entries (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  date       date        not null,
  entry      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- Append-only focus sprints. Never edited, so they merge by union on id
-- and need no timestamp.
create table if not exists public.focus_sessions (
  user_id uuid  not null references auth.users (id) on delete cascade,
  id      text  not null,
  session jsonb not null,
  primary key (user_id, id)
);

alter table public.day_plans      enable row level security;
alter table public.journal_entries enable row level security;
alter table public.focus_sessions  enable row level security;

-- Each policy covers select/insert/update/delete: you may only touch your own
-- rows, and may only write rows stamped with your own user id.
drop policy if exists "own day plans" on public.day_plans;
create policy "own day plans" on public.day_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own journal entries" on public.journal_entries;
create policy "own journal entries" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own focus sessions" on public.focus_sessions;
create policy "own focus sessions" on public.focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
