-- NON Second Brain — Supabase schema
-- Run once in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rxalmylnjdvsbiowqari/sql/new

-- Enable vector extension for semantic search
create extension if not exists vector;

-- ── captures ─────────────────────────────────────────────────────────────────
-- Every thought, idea, note, or session reflection captured by Dr Non.
-- Source covers the plan-view NOTE button, voice input (future iOS),
-- Pomodoro session-end reflections, and anything else we route here.

create table if not exists captures (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  text        text not null,
  source      text not null default 'note',
    -- 'note'          — typed in the plan-view NOTE pad
    -- 'voice'         — dictated (future)
    -- 'session_end'   — Pomodoro session reflection
    -- 'reflection'    — end-of-day reflection
    -- 'import'        — batch import
  session_id  uuid,                    -- links to a focus session if applicable
  tags        text[] default '{}',     -- auto-tagged by pipeline
  embedding   vector(1536),            -- OpenAI text-embedding-3-small
  synced_sheet boolean default false,  -- true once appended to Google Sheet
  metadata    jsonb default '{}'       -- arbitrary extra fields
);

-- ── focus_sessions ────────────────────────────────────────────────────────────
-- Each Pomodoro or FRAME session. Mirrors the iOS FocusSession model.

create table if not exists focus_sessions (
  id            uuid primary key default gen_random_uuid(),
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  duration_min  int not null default 25,
  type          text not null default 'pomodoro',
    -- 'pomodoro' | 'frame' | 'deep_work'
  completed     boolean default false,
  reflection    text,                  -- what I learned / felt
  tags          text[] default '{}'
);

-- ── indexes ───────────────────────────────────────────────────────────────────

-- Text search across captures
create index if not exists captures_text_search
  on captures using gin(to_tsvector('english', text));

-- Vector similarity search (cosine distance)
create index if not exists captures_embedding_idx
  on captures using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Time-range queries
create index if not exists captures_created_idx
  on captures (created_at desc);

-- ── helper function: semantic search ─────────────────────────────────────────
-- Called by GET /query?q=... on the Worker.

create or replace function match_captures (
  query_embedding  vector(1536),
  match_threshold  float default 0.7,
  match_count      int   default 10
)
returns table (
  id         uuid,
  created_at timestamptz,
  text       text,
  source     text,
  tags       text[],
  similarity float
)
language sql stable
as $$
  select
    id,
    created_at,
    text,
    source,
    tags,
    1 - (embedding <=> query_embedding) as similarity
  from captures
  where 1 - (embedding <=> query_embedding) > match_threshold
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── Row Level Security (open for service role, anon can only insert) ──────────

alter table captures        enable row level security;
alter table focus_sessions  enable row level security;

-- Service role bypasses RLS automatically.
-- Anon key can insert captures (for the client-side NOTE button) but not read.
create policy "anon can insert captures"
  on captures for insert
  to anon
  with check (true);

-- Anon cannot read captures (only service role / authenticated users)
create policy "no anon read"
  on captures for select
  to anon
  using (false);

-- ── Quick sanity check ────────────────────────────────────────────────────────
select 'Schema created successfully — ' || count(*)::text || ' tables'
from information_schema.tables
where table_schema = 'public'
  and table_name in ('captures', 'focus_sessions');
