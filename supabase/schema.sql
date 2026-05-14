-- ============================================================
-- 勤怠管理システム — Supabase スキーマ
-- Supabase SQL Editor でこのファイルを全選択して実行してください
-- ============================================================

-- --------------------------------------------------------
-- 1. テーブル定義
-- --------------------------------------------------------

-- profiles (auth.users の拡張)
create table if not exists profiles (
  id                 uuid references auth.users on delete cascade primary key,
  name               text not null,
  role               text not null check (role in ('employee', 'owner')),
  base_salary        integer not null default 250000,
  annual_leave_days  integer not null default 20,
  hired_at           date,
  is_active          boolean not null default true,
  created_at         timestamptz default now()
);

-- attendance (打刻)
create table if not exists attendance (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  date        date not null,
  clock_in    timestamptz,
  clock_out   timestamptz,
  break_start timestamptz,
  break_end   timestamptz,
  created_at  timestamptz default now(),
  unique (user_id, date)   -- 1日1レコード
);

-- commute (交通費設定)
create table if not exists commute (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade not null,
  route      text not null,
  amount     integer not null check (amount >= 0),
  created_at timestamptz default now()
);

-- shifts (シフト申請)
create table if not exists shifts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references profiles(id) on delete cascade not null,
  date             date not null,
  start_time       time not null,
  end_time         time not null,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at       timestamptz default now()
);

-- leaves (有給申請)
create table if not exists leaves (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references profiles(id) on delete cascade not null,
  date             date not null,
  reason           text,
  kind             text not null default 'full' check (kind in ('full', 'morning', 'afternoon')),
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at       timestamptz default now()
);

-- payslips (給料明細)
create table if not exists payslips (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references profiles(id) on delete cascade not null,
  year          integer not null,
  month         integer not null check (month between 1 and 12),
  base_salary   integer not null check (base_salary >= 0),
  commute_total integer not null default 0 check (commute_total >= 0),
  deduction     integer not null default 0 check (deduction >= 0),
  net_salary    integer,
  is_paid       boolean not null default false,
  created_at    timestamptz default now(),
  unique (user_id, year, month)  -- 1人につき月1明細
);

-- holidays (公休日カレンダー)
create table if not exists holidays (
  id          uuid primary key default gen_random_uuid(),
  date        date not null unique,
  name        text not null,
  kind        text not null default 'public' check (kind in ('public', 'company')),  -- 祝日 / 会社休日
  created_at  timestamptz default now()
);

-- company_settings (会社設定)
create table if not exists company_settings (
  id                       integer primary key default 1 check (id = 1),
  company_name             text not null default '株式会社サンプル',
  standard_work_hours      numeric(4,2) not null default 8.00,    -- 1日の所定労働時間
  overtime_threshold_hours numeric(4,2) not null default 8.00,    -- 残業判定の閾値
  payroll_cutoff_day       integer not null default 31 check (payroll_cutoff_day between 1 and 31),
  payroll_payday           integer not null default 25 check (payroll_payday between 1 and 31),
  social_insurance_rate    numeric(5,4) not null default 0.1500,   -- 社保率（15%）
  income_tax_rate          numeric(5,4) not null default 0.0500,   -- 所得税率（5%）
  updated_at               timestamptz default now()
);

-- 初期レコードを必ず1件作る
insert into company_settings (id) values (1) on conflict (id) do nothing;

-- --------------------------------------------------------
-- 2. インデックス（パフォーマンス）
-- --------------------------------------------------------

create index if not exists idx_attendance_user_date on attendance (user_id, date desc);
create index if not exists idx_shifts_user_date     on shifts (user_id, date desc);
create index if not exists idx_shifts_status        on shifts (status);
create index if not exists idx_leaves_user_date     on leaves (user_id, date desc);
create index if not exists idx_leaves_status        on leaves (status);
create index if not exists idx_payslips_user        on payslips (user_id, year desc, month desc);
create index if not exists idx_holidays_date        on holidays (date);

-- --------------------------------------------------------
-- 3. ユーザー登録時に profiles を自動作成するトリガー
-- --------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role, base_salary, annual_leave_days, hired_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    coalesce((new.raw_user_meta_data->>'base_salary')::integer, 250000),
    coalesce((new.raw_user_meta_data->>'annual_leave_days')::integer, 20),
    coalesce((new.raw_user_meta_data->>'hired_at')::date, current_date)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --------------------------------------------------------
-- 4. RLS（Row Level Security）
-- --------------------------------------------------------

alter table profiles         enable row level security;
alter table attendance       enable row level security;
alter table commute          enable row level security;
alter table shifts           enable row level security;
alter table leaves           enable row level security;
alter table payslips         enable row level security;
alter table holidays         enable row level security;
alter table company_settings enable row level security;

-- profiles
drop policy if exists "own profile"             on profiles;
drop policy if exists "owner sees all profiles" on profiles;
drop policy if exists "owner manages profiles"  on profiles;

create policy "own profile" on profiles
  for all using (auth.uid() = id);

create policy "owner manages profiles" on profiles
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- attendance
drop policy if exists "own attendance"            on attendance;
drop policy if exists "owner sees all attendance" on attendance;

create policy "own attendance" on attendance
  for all using (auth.uid() = user_id);

create policy "owner sees all attendance" on attendance
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- commute
drop policy if exists "own commute" on commute;

create policy "own commute" on commute
  for all using (auth.uid() = user_id);

-- shifts
drop policy if exists "own shifts"          on shifts;
drop policy if exists "owner manages shifts" on shifts;

create policy "own shifts" on shifts
  for all using (auth.uid() = user_id);

create policy "owner manages shifts" on shifts
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- leaves
drop policy if exists "own leaves"          on leaves;
drop policy if exists "owner manages leaves" on leaves;

create policy "own leaves" on leaves
  for all using (auth.uid() = user_id);

create policy "owner manages leaves" on leaves
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- payslips
drop policy if exists "own payslips"         on payslips;
drop policy if exists "owner manages payslips" on payslips;

create policy "own payslips" on payslips
  for all using (auth.uid() = user_id);

create policy "owner manages payslips" on payslips
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- holidays
drop policy if exists "anyone reads holidays"  on holidays;
drop policy if exists "owner manages holidays" on holidays;

create policy "anyone reads holidays" on holidays
  for select using (auth.uid() is not null);

create policy "owner manages holidays" on holidays
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- company_settings
drop policy if exists "anyone reads settings"  on company_settings;
drop policy if exists "owner manages settings" on company_settings;

create policy "anyone reads settings" on company_settings
  for select using (auth.uid() is not null);

create policy "owner manages settings" on company_settings
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );
