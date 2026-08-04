-- =====================================================================
-- THE SECOND SCOOP CLUB — schema, security (RLS), and integrity triggers
-- Run this in Supabase → SQL Editor (paste + Run). Safe to re-run.
-- =====================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ---------------------------------------------------------------- tiers
create table if not exists public.tiers (
  id             text primary key,               -- 'first_scoop' | 'second_scoop' | 'never_enough'
  name           text not null,
  threshold_type text not null default 'scoops'  -- 'scoops' | 'spend' | 'orders'
                 check (threshold_type in ('scoops','spend','orders')),
  threshold_value numeric not null default 0,     -- 0 = entry tier
  benefits       jsonb not null default '[]'::jsonb,
  sort           int  not null default 0
);

-- ------------------------------------------------------- earning rules
-- Editable rates/bonuses. All loyalty values live here, never hard-coded.
create table if not exists public.earning_rules (
  key         text primary key,   -- e.g. 'earn_per_100', 'welcome', 'review', 'birthday', 'first_order'
  value       numeric not null default 0,
  enabled     boolean not null default true,
  description text
);

-- ------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text,
  phone             text,
  birthday          date,
  marketing_consent boolean not null default false,
  created_at        timestamptz not null default now()
);

-- ------------------------------------------------------ loyalty account
create table if not exists public.loyalty_accounts (
  profile_id      uuid primary key references public.profiles(id) on delete cascade,
  tier_id         text references public.tiers(id) default 'first_scoop',
  lifetime_scoops integer not null default 0,   -- sum of positive deltas (never decreases)
  balance_cache   integer not null default 0,   -- validated against the ledger
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------ loyalty ledger (truth)
create table if not exists public.loyalty_transactions (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  delta           integer not null,             -- + earn, - redeem/adjust
  reason_code     text,                          -- 'order','welcome','review','birthday','redeem','refund','admin','first_order'
  description     text,
  order_ref       text,
  source          text default 'system',         -- 'system' | 'admin' | 'apps_script'
  admin_id        uuid,
  balance_after   integer,                        -- set by trigger
  idempotency_key text unique,                    -- prevents double-processing (e.g. 'order:SS-123:earn')
  created_at      timestamptz not null default now()
);
create index if not exists idx_txn_profile on public.loyalty_transactions(profile_id, created_at desc);

-- --------------------------------------------------------------- rewards
create table if not exists public.rewards (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  description        text,
  image              text,
  scoops_cost        integer not null default 0,
  active             boolean not null default true,
  expiry             date,
  rules              jsonb not null default '{}'::jsonb,  -- min_order, online/popup, stackable, product restrictions
  per_customer_limit int,                                 -- null = unlimited
  total_qty          int,                                 -- null = unlimited
  sort               int not null default 0,
  created_at         timestamptz not null default now()
);

-- --------------------------------------------------- reward redemptions
create table if not exists public.reward_redemptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  reward_id   uuid not null references public.rewards(id),
  code        text unique not null,               -- single-use code
  status      text not null default 'active',     -- 'active' | 'used' | 'expired' | 'void'
  order_ref   text,
  txn_id      uuid references public.loyalty_transactions(id),
  redeemed_at timestamptz not null default now(),
  used_at     timestamptz
);

-- --------------------------------------------------- order links (bridge)
-- Maps external order numbers (from the Google Sheet) to a member.
create table if not exists public.order_links (
  order_ref  text primary key,
  profile_id uuid references public.profiles(id) on delete set null,
  amount     numeric not null default 0,
  region     text,
  status     text default 'paid',
  awarded    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------- admin + audit
create table if not exists public.app_admins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.admin_audit_logs (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid,
  action         text,
  target_profile uuid,
  before         jsonb,
  after          jsonb,
  reason         text,
  created_at     timestamptz not null default now()
);

-- ---------------------------- forward-compat stubs (Phase 2+, unused in V1)
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.profiles(id) on delete cascade,
  referred_id uuid references public.profiles(id) on delete set null,
  code text, status text default 'pending', reward_txn_id uuid, created_at timestamptz default now()
);
create table if not exists public.streaks (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  current int default 0, longest int default 0, last_month text, updated_at timestamptz default now()
);
create table if not exists public.milestones (
  id text primary key, name text, reward_type text, reward_value numeric, badge text, active boolean default true
);
create table if not exists public.milestone_awards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  milestone_id text references public.milestones(id), awarded_at timestamptz default now(),
  unique (profile_id, milestone_id)
);
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text, kind text, multiplier numeric default 2, starts_at timestamptz, ends_at timestamptz, active boolean default false
);

-- =====================================================================
-- FUNCTIONS + TRIGGERS
-- =====================================================================

-- is the given user an admin?
create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.app_admins where profile_id = uid);
$$;

-- keep balance_cache / lifetime / balance_after correct atomically on every ledger insert
create or replace function public.apply_transaction()
returns trigger language plpgsql security definer as $$
declare cur integer;
begin
  select balance_cache into cur from public.loyalty_accounts where profile_id = new.profile_id for update;
  if cur is null then cur := 0; insert into public.loyalty_accounts(profile_id) values (new.profile_id)
    on conflict (profile_id) do nothing; end if;
  new.balance_after := cur + new.delta;
  update public.loyalty_accounts
     set balance_cache   = cur + new.delta,
         lifetime_scoops = lifetime_scoops + greatest(new.delta, 0),
         updated_at      = now()
   where profile_id = new.profile_id;
  return new;
end $$;
drop trigger if exists trg_apply_transaction on public.loyalty_transactions;
create trigger trg_apply_transaction before insert on public.loyalty_transactions
  for each row execute function public.apply_transaction();

-- re-evaluate a member's tier from thresholds (called after balance changes)
create or replace function public.recalc_tier(pid uuid)
returns void language plpgsql security definer as $$
declare acct record; new_tier text;
begin
  select * into acct from public.loyalty_accounts where profile_id = pid;
  if acct is null then return; end if;
  select id into new_tier from public.tiers
   where (threshold_type = 'scoops' and threshold_value <= acct.lifetime_scoops)
      or  threshold_type <> 'scoops'   -- spend/orders handled by functions later; scoops in V1
   order by threshold_value desc limit 1;
  if new_tier is not null and new_tier <> coalesce(acct.tier_id,'') then
    update public.loyalty_accounts set tier_id = new_tier where profile_id = pid;
  end if;
end $$;

-- on new auth user → create profile + loyalty account + welcome bonus (idempotent)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare welcome int;
begin
  insert into public.profiles (id, full_name, phone, birthday, marketing_consent)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    (nullif(new.raw_user_meta_data->>'birthday',''))::date,
    coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false)
  ) on conflict (id) do nothing;

  insert into public.loyalty_accounts (profile_id, tier_id) values (new.id, 'first_scoop')
  on conflict (profile_id) do nothing;

  select value into welcome from public.earning_rules where key = 'welcome' and enabled;
  if welcome is not null and welcome > 0 then
    insert into public.loyalty_transactions (profile_id, delta, reason_code, description, idempotency_key)
    values (new.id, welcome::int, 'welcome', 'Welcome to The Second Scoop Club', 'welcome:'||new.id)
    on conflict (idempotency_key) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists trg_new_user on auth.users;
create trigger trg_new_user after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- ROW-LEVEL SECURITY  (customers see only their own rows)
-- =====================================================================
alter table public.profiles              enable row level security;
alter table public.loyalty_accounts       enable row level security;
alter table public.loyalty_transactions   enable row level security;
alter table public.reward_redemptions     enable row level security;
alter table public.order_links            enable row level security;
alter table public.rewards                enable row level security;
alter table public.tiers                  enable row level security;
alter table public.earning_rules          enable row level security;
alter table public.admin_audit_logs       enable row level security;
alter table public.app_admins             enable row level security;

-- profiles: a user reads/updates only their own; inserts only their own row
drop policy if exists p_profiles_self on public.profiles;
create policy p_profiles_self on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists p_profiles_admin on public.profiles;
create policy p_profiles_admin on public.profiles for select using (public.is_admin(auth.uid()));

-- loyalty account + ledger + redemptions + order links: read own (or admin). Writes = service role only (bypasses RLS).
drop policy if exists p_acct_self on public.loyalty_accounts;
create policy p_acct_self on public.loyalty_accounts for select using (auth.uid() = profile_id or public.is_admin(auth.uid()));
drop policy if exists p_txn_self on public.loyalty_transactions;
create policy p_txn_self on public.loyalty_transactions for select using (auth.uid() = profile_id or public.is_admin(auth.uid()));
drop policy if exists p_redeem_self on public.reward_redemptions;
create policy p_redeem_self on public.reward_redemptions for select using (auth.uid() = profile_id or public.is_admin(auth.uid()));
drop policy if exists p_orderlink_self on public.order_links;
create policy p_orderlink_self on public.order_links for select using (auth.uid() = profile_id or public.is_admin(auth.uid()));

-- rewards / tiers / earning rules: public read (needed for the landing page + catalogue). Admin writes via service role.
drop policy if exists p_rewards_read on public.rewards;      create policy p_rewards_read on public.rewards for select using (true);
drop policy if exists p_tiers_read on public.tiers;          create policy p_tiers_read on public.tiers for select using (true);
drop policy if exists p_rules_read on public.earning_rules;  create policy p_rules_read on public.earning_rules for select using (true);

-- admin tables: admins only
drop policy if exists p_audit_admin on public.admin_audit_logs;
create policy p_audit_admin on public.admin_audit_logs for select using (public.is_admin(auth.uid()));
drop policy if exists p_admins_self on public.app_admins;
create policy p_admins_self on public.app_admins for select using (auth.uid() = profile_id or public.is_admin(auth.uid()));

-- NOTE: privileged writes (award/reverse Scoops, redeem, admin adjust) are done by the
-- Netlify functions using the SERVICE ROLE key, which bypasses RLS. The browser never writes the ledger.
