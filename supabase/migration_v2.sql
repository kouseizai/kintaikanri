-- ============================================================
-- 既存DBから新スキーマへのマイグレーション
-- 既に schema.sql の旧版を実行済みの DB に対して、これを実行
-- Supabase SQL Editor で全選択 → 実行
-- ============================================================

-- profiles に新フィールド追加
alter table profiles add column if not exists annual_leave_days integer not null default 20;
alter table profiles add column if not exists hired_at          date;
alter table profiles add column if not exists is_active         boolean not null default true;

-- attendance に休憩フィールド追加
alter table attendance add column if not exists break_start timestamptz;
alter table attendance add column if not exists break_end   timestamptz;

-- shifts に却下理由追加
alter table shifts add column if not exists rejection_reason text;

-- leaves に半休種別と却下理由追加
alter table leaves add column if not exists kind text not null default 'full';
alter table leaves add column if not exists rejection_reason text;

-- leaves.kind に check 制約（既存制約があれば削除して付け直し）
do $$
begin
  if exists (select 1 from information_schema.table_constraints
             where table_name = 'leaves' and constraint_name = 'leaves_kind_check') then
    alter table leaves drop constraint leaves_kind_check;
  end if;
end $$;
alter table leaves add constraint leaves_kind_check check (kind in ('full', 'morning', 'afternoon'));

-- holidays テーブル作成
create table if not exists holidays (
  id          uuid primary key default gen_random_uuid(),
  date        date not null unique,
  name        text not null,
  kind        text not null default 'public' check (kind in ('public', 'company')),
  created_at  timestamptz default now()
);

-- company_settings テーブル作成
create table if not exists company_settings (
  id                       integer primary key default 1 check (id = 1),
  company_name             text not null default '株式会社サンプル',
  standard_work_hours      numeric(4,2) not null default 8.00,
  overtime_threshold_hours numeric(4,2) not null default 8.00,
  payroll_cutoff_day       integer not null default 31 check (payroll_cutoff_day between 1 and 31),
  payroll_payday           integer not null default 25 check (payroll_payday between 1 and 31),
  social_insurance_rate    numeric(5,4) not null default 0.1500,
  income_tax_rate          numeric(5,4) not null default 0.0500,
  updated_at               timestamptz default now()
);

insert into company_settings (id) values (1) on conflict (id) do nothing;

-- インデックス追加
create index if not exists idx_holidays_date on holidays (date);

-- handle_new_user 関数を新フィールド対応に更新
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

-- holidays / company_settings の RLS
alter table holidays         enable row level security;
alter table company_settings enable row level security;

drop policy if exists "anyone reads holidays"  on holidays;
drop policy if exists "owner manages holidays" on holidays;
create policy "anyone reads holidays" on holidays
  for select using (auth.uid() is not null);
create policy "owner manages holidays" on holidays
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

drop policy if exists "anyone reads settings"  on company_settings;
drop policy if exists "owner manages settings" on company_settings;
create policy "anyone reads settings" on company_settings
  for select using (auth.uid() is not null);
create policy "owner manages settings" on company_settings
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- profiles の RLS 強化（オーナーが他従業員を更新できるように）
drop policy if exists "owner manages profiles" on profiles;
create policy "owner manages profiles" on profiles
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- ============================================================
-- 日本の祝日初期データ（2026年）
-- 必要に応じて毎年追加
-- ============================================================
insert into holidays (date, name, kind) values
  ('2026-01-01', '元日',         'public'),
  ('2026-01-12', '成人の日',     'public'),
  ('2026-02-11', '建国記念の日', 'public'),
  ('2026-02-23', '天皇誕生日',   'public'),
  ('2026-03-20', '春分の日',     'public'),
  ('2026-04-29', '昭和の日',     'public'),
  ('2026-05-03', '憲法記念日',   'public'),
  ('2026-05-04', 'みどりの日',   'public'),
  ('2026-05-05', 'こどもの日',   'public'),
  ('2026-05-06', '振替休日',     'public'),
  ('2026-07-20', '海の日',       'public'),
  ('2026-08-11', '山の日',       'public'),
  ('2026-09-21', '敬老の日',     'public'),
  ('2026-09-23', '秋分の日',     'public'),
  ('2026-10-12', 'スポーツの日', 'public'),
  ('2026-11-03', '文化の日',     'public'),
  ('2026-11-23', '勤労感謝の日', 'public')
on conflict (date) do nothing;
