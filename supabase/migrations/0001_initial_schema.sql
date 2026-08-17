-- Initial schema for BESS Intelligence & Dispatch Platform

-- 1. bess_assets table
create table public.bess_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  bess_code text not null,
  manufacturer text,
  model text,

  battery_chemistry text,
  module_count integer,
  cells_per_module integer,

  rated_energy_kwh double precision not null check (rated_energy_kwh > 0),
  usable_energy_kwh double precision not null check (usable_energy_kwh > 0),

  rated_power_kw double precision not null check (rated_power_kw > 0),
  max_charge_power_kw double precision not null check (max_charge_power_kw > 0),
  max_discharge_power_kw double precision not null check (max_discharge_power_kw > 0),

  nominal_voltage_v double precision not null,
  min_voltage_v double precision not null,
  max_voltage_v double precision not null,

  max_charge_current_a double precision not null,
  max_discharge_current_a double precision not null,

  min_temperature_c double precision not null,
  max_temperature_c double precision not null,

  round_trip_efficiency double precision not null
    check (round_trip_efficiency > 0 and round_trip_efficiency <= 1),

  soc_min double precision not null default 0.10
    check (soc_min >= 0 and soc_min < 1),
  soc_max double precision not null default 0.90
    check (soc_max > 0 and soc_max <= 1),
  soc_initial double precision not null default 0.50
    check (soc_initial >= 0 and soc_initial <= 1),

  soh_initial double precision not null default 1.00
    check (soh_initial > 0 and soh_initial <= 1),

  nominal_grid_frequency_hz double precision not null default 50.0,
  frequency_deadband_hz double precision not null default 0.05,
  droop_gain_kw_per_hz double precision not null default 50.0,

  degradation_coefficient double precision not null default 0.0001,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(owner_id, bess_code),

  check (usable_energy_kwh <= rated_energy_kwh),
  check (min_voltage_v < nominal_voltage_v),
  check (nominal_voltage_v < max_voltage_v),
  check (min_temperature_c < max_temperature_c),
  check (soc_min < soc_max)
);

-- 2. telemetry_samples table
create table public.telemetry_samples (
  id bigint generated always as identity primary key,
  bess_id uuid not null references public.bess_assets(id) on delete cascade,

  recorded_at timestamptz not null,

  battery_voltage_v double precision not null,
  battery_current_a double precision not null,
  battery_power_kw double precision,

  battery_temperature_c double precision not null,

  grid_frequency_hz double precision not null,
  grid_voltage_v double precision,

  renewable_power_kw double precision,
  load_power_kw double precision,

  source text not null default 'api',
  quality text not null default 'GOOD',

  created_at timestamptz not null default now(),

  unique(bess_id, recorded_at)
);

create index telemetry_bess_time_idx
  on public.telemetry_samples (bess_id, recorded_at desc);

-- 3. battery_states table
create table public.battery_states (
  id bigint generated always as identity primary key,
  bess_id uuid not null references public.bess_assets(id) on delete cascade,
  telemetry_id bigint references public.telemetry_samples(id) on delete set null,

  calculated_at timestamptz not null,

  soc double precision not null,
  soh double precision not null,
  efc double precision not null,

  internal_resistance_ohm double precision,
  usable_capacity_kwh double precision not null,
  available_energy_kwh double precision not null,

  charge_power_available_kw double precision not null,
  discharge_power_available_kw double precision not null,

  cumulative_energy_throughput_kwh double precision not null default 0,

  calculation_version text not null default 'mvp-v1',
  created_at timestamptz not null default now(),

  unique(bess_id, calculated_at),

  check (soc >= 0 and soc <= 1),
  check (soh >= 0 and soh <= 1)
);

create index battery_states_bess_time_idx
  on public.battery_states (bess_id, calculated_at desc);

-- 4. forecasts table
create table public.forecasts (
  id uuid primary key default gen_random_uuid(),
  bess_id uuid not null references public.bess_assets(id) on delete cascade,

  target text not null check (
    target in (
      'GRID_FREQUENCY',
      'RENEWABLE_POWER',
      'LOAD_POWER',
      'SOC'
    )
  ),

  generated_at timestamptz not null default now(),

  horizon_minutes integer not null,
  step_minutes integer not null,

  polynomial_degree integer,
  residual_norm double precision,

  input_window_start timestamptz,
  input_window_end timestamptz,

  model_version text not null default 'poly-qr-v1',
  created_at timestamptz not null default now()
);

-- 5. forecast_points table
create table public.forecast_points (
  id bigint generated always as identity primary key,
  forecast_id uuid not null references public.forecasts(id) on delete cascade,

  predicted_at timestamptz not null,
  predicted_value double precision not null,

  lower_bound double precision,
  upper_bound double precision,

  unique(forecast_id, predicted_at)
);

-- 6. dispatch_decisions table
create table public.dispatch_decisions (
  id uuid primary key default gen_random_uuid(),
  bess_id uuid not null references public.bess_assets(id) on delete cascade,
  battery_state_id bigint references public.battery_states(id) on delete set null,

  decided_at timestamptz not null default now(),

  action text not null check (
    action in (
      'CHARGE',
      'DISCHARGE',
      'HOLD',
      'FREQUENCY_SUPPORT'
    )
  ),

  target_power_kw double precision not null default 0,

  energy_balance_kw double precision,
  frequency_deviation_hz double precision,

  score double precision,
  reason_code text not null,
  reason_text text not null,

  constraints jsonb not null default '{}'::jsonb,
  inputs jsonb not null default '{}'::jsonb,

  engine_version text not null default 'mvp-v1',
  created_at timestamptz not null default now()
);

create index dispatch_decisions_bess_time_idx
  on public.dispatch_decisions (bess_id, decided_at desc);

-- 7. RLS enablement
alter table public.bess_assets enable row level security;
alter table public.telemetry_samples enable row level security;
alter table public.battery_states enable row level security;
alter table public.forecasts enable row level security;
alter table public.forecast_points enable row level security;
alter table public.dispatch_decisions enable row level security;

-- 8. RLS Policies
create policy "owners can read their bess assets"
  on public.bess_assets for select using (auth.uid() = owner_id);

create policy "owners can insert their bess assets"
  on public.bess_assets for insert with check (auth.uid() = owner_id);

create policy "owners can update their bess assets"
  on public.bess_assets for update using (auth.uid() = owner_id);

create policy "owners can delete their bess assets"
  on public.bess_assets for delete using (auth.uid() = owner_id);

-- Child tables policies
create policy "owners can read telemetry"
  on public.telemetry_samples for select using (
    exists (
      select 1 from public.bess_assets b
      where b.id = telemetry_samples.bess_id and b.owner_id = auth.uid()
    )
  );

create policy "owners can write telemetry"
  on public.telemetry_samples for insert with check (
    exists (
      select 1 from public.bess_assets b
      where b.id = telemetry_samples.bess_id and b.owner_id = auth.uid()
    )
  );

create policy "owners can read battery states"
  on public.battery_states for select using (
    exists (
      select 1 from public.bess_assets b
      where b.id = battery_states.bess_id and b.owner_id = auth.uid()
    )
  );

create policy "owners can write battery states"
  on public.battery_states for insert with check (
    exists (
      select 1 from public.bess_assets b
      where b.id = battery_states.bess_id and b.owner_id = auth.uid()
    )
  );

create policy "owners can read forecasts"
  on public.forecasts for select using (
    exists (
      select 1 from public.bess_assets b
      where b.id = forecasts.bess_id and b.owner_id = auth.uid()
    )
  );

create policy "owners can write forecasts"
  on public.forecasts for insert with check (
    exists (
      select 1 from public.bess_assets b
      where b.id = forecasts.bess_id and b.owner_id = auth.uid()
    )
  );

create policy "owners can read forecast points"
  on public.forecast_points for select using (
    exists (
      select 1 from public.forecasts f
      join public.bess_assets b on b.id = f.bess_id
      where f.id = forecast_points.forecast_id and b.owner_id = auth.uid()
    )
  );

create policy "owners can write forecast points"
  on public.forecast_points for insert with check (
    exists (
      select 1 from public.forecasts f
      join public.bess_assets b on b.id = f.bess_id
      where f.id = forecast_points.forecast_id and b.owner_id = auth.uid()
    )
  );

create policy "owners can read dispatch decisions"
  on public.dispatch_decisions for select using (
    exists (
      select 1 from public.bess_assets b
      where b.id = dispatch_decisions.bess_id and b.owner_id = auth.uid()
    )
  );

create policy "owners can write dispatch decisions"
  on public.dispatch_decisions for insert with check (
    exists (
      select 1 from public.bess_assets b
      where b.id = dispatch_decisions.bess_id and b.owner_id = auth.uid()
    )
  );
