-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- Raw inputs table (everything you dump)
create table public.raw_inputs (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  source text not null default 'quick' check (source in ('quick', 'voice', 'email')),
  audio_url text,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

-- People table (your personal CRM)
create table public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] not null default '{}',
  context text,
  embedding vector(1536),
  last_mentioned timestamptz,
  created_at timestamptz not null default now()
);

-- Create index for name search
create index people_name_idx on public.people using gin (to_tsvector('english', name));
create index people_embedding_idx on public.people using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Projects table
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active' check (status in ('active', 'done', 'stalled')),
  context text,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index projects_name_idx on public.projects using gin (to_tsvector('english', name));
create index projects_embedding_idx on public.projects using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Mentions table (links inputs to people/projects)
create table public.mentions (
  id uuid primary key default gen_random_uuid(),
  input_id uuid not null references public.raw_inputs(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  snippet text not null,
  week_of date not null,
  created_at timestamptz not null default now(),
  
  constraint mentions_has_entity check (person_id is not null or project_id is not null)
);

create index mentions_input_idx on public.mentions(input_id);
create index mentions_person_idx on public.mentions(person_id);
create index mentions_project_idx on public.mentions(project_id);
create index mentions_week_idx on public.mentions(week_of);

-- Action items table
create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  input_id uuid not null references public.raw_inputs(id) on delete cascade,
  description text not null,
  person_id uuid references public.people(id) on delete set null,
  due_date date,
  completed boolean not null default false,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  created_at timestamptz not null default now()
);

create index action_items_input_idx on public.action_items(input_id);
create index action_items_person_idx on public.action_items(person_id);
create index action_items_completed_idx on public.action_items(completed);
create index action_items_due_date_idx on public.action_items(due_date);

-- Weekly journals table
create table public.weekly_journals (
  id uuid primary key default gen_random_uuid(),
  week_of date not null unique,
  summary text not null,
  generated_at timestamptz not null default now()
);

create index weekly_journals_week_idx on public.weekly_journals(week_of);

-- Function to get the start of the week (Monday)
create or replace function get_week_of(ts timestamptz default now())
returns date as $$
  select date_trunc('week', ts)::date;
$$ language sql immutable;

-- Function to find or create a person by name
create or replace function find_or_create_person(
  p_name text,
  p_context text default null
)
returns uuid as $$
declare
  v_id uuid;
  v_clean_name text;
begin
  -- Clean up name
  v_clean_name := trim(initcap(p_name));
  
  -- Try to find existing person (exact match or alias)
  select id into v_id
  from public.people
  where lower(name) = lower(v_clean_name)
     or lower(v_clean_name) = any(select lower(unnest(aliases)));
  
  -- If not found, create new
  if v_id is null then
    insert into public.people (name, context)
    values (v_clean_name, p_context)
    returning id into v_id;
  end if;
  
  -- Update last_mentioned
  update public.people
  set last_mentioned = now()
  where id = v_id;
  
  return v_id;
end;
$$ language plpgsql;

-- Function to find or create a project by name
create or replace function find_or_create_project(
  p_name text,
  p_context text default null
)
returns uuid as $$
declare
  v_id uuid;
  v_clean_name text;
begin
  v_clean_name := trim(upper(p_name));
  
  select id into v_id
  from public.projects
  where upper(name) = v_clean_name;
  
  if v_id is null then
    insert into public.projects (name, context)
    values (v_clean_name, p_context)
    returning id into v_id;
  end if;
  
  return v_id;
end;
$$ language plpgsql;

-- RLS policies (disabled for single-user MVP, enable later)
-- alter table public.raw_inputs enable row level security;
-- alter table public.people enable row level security;
-- alter table public.projects enable row level security;
-- alter table public.mentions enable row level security;
-- alter table public.action_items enable row level security;
-- alter table public.weekly_journals enable row level security;
