-- profiles table (extends auth.users)
create table profiles (
  id uuid references auth.users primary key,
  name text not null,
  role text not null check (role in ('employee', 'owner')),
  base_salary integer default 250000,
  created_at timestamptz default now()
);

-- attendance (打刻)
create table attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  created_at timestamptz default now()
);

-- commute (交通費)
create table commute (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  route text not null,
  amount integer not null,
  created_at timestamptz default now()
);

-- shifts (シフト申請)
create table shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- leaves (有給申請)
create table leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  date date not null,
  reason text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- payslips (給料明細)
create table payslips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  year integer not null,
  month integer not null,
  base_salary integer not null,
  commute_total integer default 0,
  deduction integer default 0,
  net_salary integer,
  is_paid boolean default false,
  created_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
alter table attendance enable row level security;
alter table commute enable row level security;
alter table shifts enable row level security;
alter table leaves enable row level security;
alter table payslips enable row level security;

-- profiles RLS
create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "owner sees all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'owner')
);

-- attendance RLS
create policy "own attendance" on attendance for all using (auth.uid() = user_id);
create policy "owner sees all attendance" on attendance for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'owner')
);

-- commute RLS
create policy "own commute" on commute for all using (auth.uid() = user_id);

-- shifts RLS
create policy "own shifts" on shifts for all using (auth.uid() = user_id);
create policy "owner manages shifts" on shifts for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'owner')
);

-- leaves RLS
create policy "own leaves" on leaves for all using (auth.uid() = user_id);
create policy "owner manages leaves" on leaves for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'owner')
);

-- payslips RLS
create policy "own payslips" on payslips for all using (auth.uid() = user_id);
create policy "owner manages payslips" on payslips for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'owner')
);
