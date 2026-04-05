-- Users table for authentication
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on users table
alter table public.users enable row level security;

-- Users can read their own data
create policy "Users can read own data" on public.users
  for select using (auth.uid() = id);

-- Users can update their own data
create policy "Users can update own data" on public.users
  for update using (auth.uid() = id);

-- Admins can read all users
create policy "Admins can read all users" on public.users
  for select using (
    exists (
      select 1 from public.users 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can insert users
create policy "Admins can insert users" on public.users
  for insert with check (
    exists (
      select 1 from public.users 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update users
create policy "Admins can update users" on public.users
  for update using (
    exists (
      select 1 from public.users 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can delete users
create policy "Admins can delete users" on public.users
  for delete using (
    exists (
      select 1 from public.users 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Add user_id to existing tables
alter table public.raw_inputs add column user_id uuid references public.users(id) on delete cascade;
alter table public.people add column user_id uuid references public.users(id) on delete cascade;
alter table public.projects add column user_id uuid references public.users(id) on delete cascade;
alter table public.action_items add column user_id uuid references public.users(id) on delete cascade;
alter table public.weekly_journals add column user_id uuid references public.users(id) on delete cascade;

-- Update unique constraint for weekly_journals to include user_id
alter table public.weekly_journals drop constraint weekly_journals_week_of_key;
alter table public.weekly_journals add constraint weekly_journals_week_of_user_id_key unique (week_of, user_id);

-- Enable RLS on all existing tables
alter table public.raw_inputs enable row level security;
alter table public.people enable row level security;
alter table public.projects enable row level security;
alter table public.mentions enable row level security;
alter table public.action_items enable row level security;
alter table public.weekly_journals enable row level security;

-- RLS policies for raw_inputs
create policy "Users can read own raw_inputs" on public.raw_inputs
  for select using (auth.uid() = user_id);

create policy "Users can insert own raw_inputs" on public.raw_inputs
  for insert with check (auth.uid() = user_id);

create policy "Users can update own raw_inputs" on public.raw_inputs
  for update using (auth.uid() = user_id);

create policy "Users can delete own raw_inputs" on public.raw_inputs
  for delete using (auth.uid() = user_id);

-- RLS policies for people
create policy "Users can read own people" on public.people
  for select using (auth.uid() = user_id);

create policy "Users can insert own people" on public.people
  for insert with check (auth.uid() = user_id);

create policy "Users can update own people" on public.people
  for update using (auth.uid() = user_id);

create policy "Users can delete own people" on public.people
  for delete using (auth.uid() = user_id);

-- RLS policies for projects
create policy "Users can read own projects" on public.projects
  for select using (auth.uid() = user_id);

create policy "Users can insert own projects" on public.projects
  for insert with check (auth.uid() = user_id);

create policy "Users can update own projects" on public.projects
  for update using (auth.uid() = user_id);

create policy "Users can delete own projects" on public.projects
  for delete using (auth.uid() = user_id);

-- RLS policies for mentions
create policy "Users can read own mentions" on public.mentions
  for select using (
    exists (
      select 1 from public.raw_inputs 
      where id = input_id and user_id = auth.uid()
    )
  );

create policy "Users can insert own mentions" on public.mentions
  for insert with check (
    exists (
      select 1 from public.raw_inputs 
      where id = input_id and user_id = auth.uid()
    )
  );

create policy "Users can update own mentions" on public.mentions
  for update using (
    exists (
      select 1 from public.raw_inputs 
      where id = input_id and user_id = auth.uid()
    )
  );

create policy "Users can delete own mentions" on public.mentions
  for delete using (
    exists (
      select 1 from public.raw_inputs 
      where id = input_id and user_id = auth.uid()
    )
  );

-- RLS policies for action_items
create policy "Users can read own action_items" on public.action_items
  for select using (auth.uid() = user_id);

create policy "Users can insert own action_items" on public.action_items
  for insert with check (auth.uid() = user_id);

create policy "Users can update own action_items" on public.action_items
  for update using (auth.uid() = user_id);

create policy "Users can delete own action_items" on public.action_items
  for delete using (auth.uid() = user_id);

-- RLS policies for weekly_journals
create policy "Users can read own weekly_journals" on public.weekly_journals
  for select using (auth.uid() = user_id);

create policy "Users can insert own weekly_journals" on public.weekly_journals
  for insert with check (auth.uid() = user_id);

create policy "Users can update own weekly_journals" on public.weekly_journals
  for update using (auth.uid() = user_id);

create policy "Users can delete own weekly_journals" on public.weekly_journals
  for delete using (auth.uid() = user_id);

-- Update functions to include user_id
create or replace function find_or_create_person(
  p_name text,
  p_context text default null,
  p_user_id uuid default auth.uid()
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
     or lower(v_clean_name) = any(select lower(unnest(aliases)))
     and user_id = p_user_id;
  
  -- If not found, create new
  if v_id is null then
    insert into public.people (name, context, user_id)
    values (v_clean_name, p_context, p_user_id)
    returning id into v_id;
  end if;
  
  -- Update last_mentioned
  update public.people
  set last_mentioned = now()
  where id = v_id;
  
  return v_id;
end;
$$ language plpgsql;

create or replace function find_or_create_project(
  p_name text,
  p_context text default null,
  p_user_id uuid default auth.uid()
)
returns uuid as $$
declare
  v_id uuid;
  v_clean_name text;
begin
  v_clean_name := trim(upper(p_name));
  
  select id into v_id
  from public.projects
  where upper(name) = v_clean_name
    and user_id = p_user_id;
  
  if v_id is null then
    insert into public.projects (name, context, user_id)
    values (v_clean_name, p_context, p_user_id)
    returning id into v_id;
  end if;
  
  return v_id;
end;
$$ language plpgsql;

-- Create trigger to update updated_at on users table
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at
  before update on public.users
  for each row
  execute function update_updated_at_column();