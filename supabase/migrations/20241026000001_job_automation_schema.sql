-- Platform connections (LinkedIn, Indeed, etc.)
-- Tracks which platforms user has connected and session status
create table public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null, -- 'linkedin', 'indeed', 'glassdoor'
  is_connected boolean default false,
  connected_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  constraint platform_connections_user_platform_key unique (user_id, platform)
);

-- Job applications tracking
create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null,
  job_url text not null,
  job_title text,
  company_name text,
  status text default 'pending', -- 'pending', 'submitted', 'failed'
  applied_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.platform_connections enable row level security;
alter table public.job_applications enable row level security;

-- RLS Policies: Users can only access their own data
create policy "Users can manage own platform connections"
  on public.platform_connections for all
  using (auth.uid() = user_id);

create policy "Users can manage own job applications"
  on public.job_applications for all
  using (auth.uid() = user_id);
