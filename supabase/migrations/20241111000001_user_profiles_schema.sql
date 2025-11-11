-- User profiles schema for job application data
-- Supports both manual entry and CV parsing

-- Main user profile
create table public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  
  -- Personal Information (Required)
  first_name text not null,
  last_name text not null,
  phone text,
  city text,
  country text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  
  -- Professional Summary
  years_of_experience integer,
  current_position text,
  current_company text,
  profile_summary text,
  
  -- Job Preferences
  desired_job_titles text[],
  preferred_locations text[],
  work_preference text, -- 'remote', 'hybrid', 'onsite', 'any'
  
  -- Profile completion tracking
  is_profile_complete boolean default false,
  profile_source text default 'manual', -- 'manual' or 'cv_upload'
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Work experiences
create table public.work_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  company text not null,
  location text,
  start_date text, -- Flexible format from CV parsing
  end_date text,
  is_current boolean default false,
  description text,
  display_order integer default 0,
  created_at timestamp with time zone default now()
);

-- Education
create table public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  degree text not null,
  major text,
  institution text not null,
  graduation_year text,
  start_year text,
  description text,
  display_order integer default 0,
  created_at timestamp with time zone default now()
);

-- Skills (parsed from CV or manually added)
create table public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text, -- 'programming', 'frameworks', 'tools', 'languages', 'soft_skills'
  skill_name text not null,
  proficiency text,
  created_at timestamp with time zone default now(),
  constraint unique_user_skill unique (user_id, skill_name)
);

-- Languages
create table public.user_languages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  language text not null,
  proficiency text not null,
  created_at timestamp with time zone default now(),
  constraint unique_user_language unique (user_id, language)
);

-- Projects
create table public.user_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  technologies text[],
  url text,
  display_order integer default 0,
  created_at timestamp with time zone default now()
);

-- Documents (CV storage)
create table public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  document_type text not null default 'cv',
  file_name text not null,
  file_path text not null, -- Supabase Storage path
  file_size integer,
  is_default boolean default false,
  parsed_at timestamp with time zone, -- When CV was parsed by AI
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.user_profiles enable row level security;
alter table public.work_experiences enable row level security;
alter table public.education enable row level security;
alter table public.user_skills enable row level security;
alter table public.user_languages enable row level security;
alter table public.user_projects enable row level security;
alter table public.user_documents enable row level security;

-- RLS Policies: Users can only access their own data
create policy "Users can manage own profile"
  on public.user_profiles for all
  using (auth.uid() = user_id);

create policy "Users can manage own experiences"
  on public.work_experiences for all
  using (auth.uid() = user_id);

create policy "Users can manage own education"
  on public.education for all
  using (auth.uid() = user_id);

create policy "Users can manage own skills"
  on public.user_skills for all
  using (auth.uid() = user_id);

create policy "Users can manage own languages"
  on public.user_languages for all
  using (auth.uid() = user_id);

create policy "Users can manage own projects"
  on public.user_projects for all
  using (auth.uid() = user_id);

create policy "Users can manage own documents"
  on public.user_documents for all
  using (auth.uid() = user_id);

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for user_profiles
create trigger set_updated_at
  before update on public.user_profiles
  for each row
  execute function public.handle_updated_at();
