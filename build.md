# BESS Intelligence & Dispatch Platform — `build.md`

> Implementation blueprint for a Battery Energy Storage System (BESS) monitoring, state-estimation, forecasting, and constrained dispatch application.
>
> **Target stack:** Supabase + Node.js + C++ numerical engine + React/TypeScript frontend.
>
> **Core numerical method:** Polynomial least-squares approximation using a Vandermonde matrix solved with Householder QR factorization, adapted from the referenced C++ repository.
>
> This file is intentionally implementation-oriented. A coding agent should be able to build the MVP feature-by-feature from this document without inventing major architecture decisions.

---

## 0. What we are building

Build a web application that:

1. Stores the fixed configuration of one or more BESS assets.
2. Ingests time-series measurements from the battery and grid.
3. Derives internal battery state such as:
   - State of Charge (`SOC`)
   - State of Health (`SOH`)
   - Equivalent Full Cycles (`EFC`)
   - internal resistance
   - usable capacity
   - available energy
   - available charge/discharge power
4. Analyses:
   - renewable generation
   - load demand
   - grid frequency
   - renewable/load energy balance
5. Forecasts future values using polynomial least-squares regression.
6. Produces a constrained operational decision:
   - `CHARGE`
   - `DISCHARGE`
   - `HOLD`
   - optionally `FREQUENCY_SUPPORT`
7. Stores every forecast, derived state, and decision so the result is auditable.
8. Displays the current BESS state, charts, forecasts, and recommended action in a dashboard.

The MVP is a **decision-support / simulation system**, not direct safety-critical battery control. It must never bypass the real BMS/PCS safety layer.

---

# 1. Source-derived system model

The project materials describe a strict pipeline:

```text
Raw Measurements
    ↓
Battery State
    ↓
Battery Capability
    ↓
Grid Condition
    ↓
Future Forecast
    ↓
Optimal / Constrained Action
```

The six-stage operational interpretation is:

```text
BESS Calibration / Rated Parameters
              +
Environmental / Grid Data
              ↓
 ┌────────────┼────────────┐
 ↓            ↓            ↓
State      Performance    Grid
Estimation Estimation    Analysis
 └────────────┼────────────┘
              ↓
          Prediction
              ↓
      Decision / Optimization
              ↓
Charge / Discharge / Hold
              ↓
Grid Support / Energy Trading
```

For this implementation, the "optimization" stage in MVP should be a deterministic constraint-satisfaction and scoring engine. A more sophisticated linear-programming or market-optimization module can be added later without changing the data model.

---

# 2. Technical architecture

## 2.1 Final MVP stack

```text
┌─────────────────────────────────────────────────────────────┐
│ Frontend                                                    │
│ React + TypeScript + Vite                                   │
│ Tailwind CSS + shadcn/ui + Recharts                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Node.js API                                                 │
│ TypeScript + Fastify                                        │
│ Zod validation                                              │
│ Supabase JS client                                          │
│ Job orchestration                                           │
└───────────────┬───────────────────────────────┬─────────────┘
                │                               │
                │ SQL / Realtime                │ child_process
                ▼                               ▼
┌──────────────────────────────┐    ┌─────────────────────────┐
│ Supabase                     │    │ C++ Mathematical Engine │
│ PostgreSQL                   │    │                         │
│ Auth                         │    │ State estimation        │
│ Realtime                     │    │ Performance estimation  │
│ Storage (optional)           │    │ Polynomial forecasting  │
│ Row Level Security           │    │ Constraint engine       │
└──────────────────────────────┘    └─────────────────────────┘
```

## 2.2 Why this adaptation

The supplied software blueprint shows a database + Node.js API + C++ mathematical engine + frontend architecture.

For this project:

- replace the blueprint's MongoDB data store with **Supabase Postgres**
- keep **Node.js** as the API/orchestration layer
- keep **C++** as the mathematical/numerical engine
- expose all numerical functionality through one stable JSON-based adapter
- use the C++ least-squares implementation for forecasting instead of rewriting the algorithm in JavaScript

Do not let the React frontend invoke the C++ engine directly.

---

# 3. Repository structure

Create a monorepo with the following layout:

```text
bess-platform/
├─ build.md
├─ README.md
├─ .gitignore
├─ .env.example
├─ package.json
├─ pnpm-workspace.yaml
│
├─ apps/
│  ├─ api/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ src/
│  │  │  ├─ app.ts
│  │  │  ├─ server.ts
│  │  │  ├─ config/
│  │  │  │  └─ env.ts
│  │  │  ├─ plugins/
│  │  │  │  ├─ supabase.ts
│  │  │  │  └─ auth.ts
│  │  │  ├─ routes/
│  │  │  │  ├─ health.routes.ts
│  │  │  │  ├─ bess.routes.ts
│  │  │  │  ├─ telemetry.routes.ts
│  │  │  │  ├─ state.routes.ts
│  │  │  │  ├─ forecasts.routes.ts
│  │  │  │  └─ decisions.routes.ts
│  │  │  ├─ services/
│  │  │  │  ├─ bess.service.ts
│  │  │  │  ├─ telemetry.service.ts
│  │  │  │  ├─ state.service.ts
│  │  │  │  ├─ forecast.service.ts
│  │  │  │  ├─ decision.service.ts
│  │  │  │  └─ engine.service.ts
│  │  │  ├─ repositories/
│  │  │  │  ├─ bess.repository.ts
│  │  │  │  ├─ telemetry.repository.ts
│  │  │  │  ├─ state.repository.ts
│  │  │  │  ├─ forecast.repository.ts
│  │  │  │  └─ decision.repository.ts
│  │  │  ├─ schemas/
│  │  │  │  ├─ bess.schema.ts
│  │  │  │  ├─ telemetry.schema.ts
│  │  │  │  └─ query.schema.ts
│  │  │  ├─ jobs/
│  │  │  │  └─ analysis.job.ts
│  │  │  └─ types/
│  │  │     └─ domain.ts
│  │  └─ test/
│  │
│  └─ web/
│     ├─ package.json
│     ├─ vite.config.ts
│     ├─ src/
│     │  ├─ main.tsx
│     │  ├─ App.tsx
│     │  ├─ lib/
│     │  │  ├─ api.ts
│     │  │  └─ supabase.ts
│     │  ├─ hooks/
│     │  │  ├─ useBess.ts
│     │  │  ├─ useTelemetry.ts
│     │  │  └─ useRealtimeTelemetry.ts
│     │  ├─ pages/
│     │  │  ├─ LoginPage.tsx
│     │  │  ├─ DashboardPage.tsx
│     │  │  ├─ AssetPage.tsx
│     │  │  ├─ ConfigurationPage.tsx
│     │  │  └─ HistoryPage.tsx
│     │  └─ components/
│     │     ├─ layout/
│     │     ├─ kpi/
│     │     ├─ charts/
│     │     ├─ decision/
│     │     └─ forms/
│     └─ test/
│
├─ engine/
│  ├─ CMakeLists.txt
│  ├─ src/
│  │  ├─ main.cpp
│  │  ├─ matrix.cpp
│  │  ├─ nla_functions.cpp
│  │  ├─ factorizations.cpp
│  │  ├─ polynomial_regression.cpp
│  │  ├─ state_estimation.cpp
│  │  ├─ performance_estimation.cpp
│  │  ├─ grid_analysis.cpp
│  │  ├─ decision_engine.cpp
│  │  └─ json_io.cpp
│  ├─ include/
│  │  ├─ matrix.h
│  │  ├─ nla_functions.h
│  │  ├─ factorizations.h
│  │  ├─ polynomial_regression.h
│  │  ├─ state_estimation.h
│  │  ├─ performance_estimation.h
│  │  ├─ grid_analysis.h
│  │  ├─ decision_engine.h
│  │  └─ domain.h
│  └─ test/
│
├─ packages/
│  └─ shared/
│     ├─ package.json
│     └─ src/
│        ├─ types.ts
│        └─ constants.ts
│
├─ supabase/
│  ├─ migrations/
│  │  └─ 0001_initial_schema.sql
│  ├─ seed.sql
│  └─ config.toml
│
├─ scripts/
│  ├─ generate-demo-data.ts
│  └─ smoke-test.ts
│
└─ docker/
   └─ api.Dockerfile
```

---

# 4. Domain model

## 4.1 Type A — live state variables

These are the current operating conditions.

| Variable | Symbol | Unit | Meaning |
|---|---:|---:|---|
| State of Charge | `SOC` | % | Available stored energy |
| State of Health | `SOH` | % | Battery degradation / health |
| Battery Voltage | `V` | V | Electrical state |
| Battery Current | `I` | A | Charge/discharge current |
| Battery Power | `P_B` | kW | Current BESS power |
| Temperature | `T` | °C | Thermal operating condition |
| Grid Frequency | `f` | Hz | Grid stability indicator |
| Grid Voltage | `V_g` | V | Grid electrical condition |
| Available Energy | `E_available` | kWh | Energy currently available |

Recommended convention:

```text
P_B > 0  => DISCHARGING / exporting from battery
P_B < 0  => CHARGING / importing into battery
P_B = 0  => IDLE
```

Use this sign convention everywhere.

## 4.2 Fixed BESS configuration

### Identification

```text
BESS ID
Manufacturer
Model
```

### Battery

```text
Battery chemistry
Number of modules
Cells per module
```

### Capacity

```text
Rated energy capacity (kWh/MWh)
Usable energy capacity (kWh/MWh)
```

### Power

```text
Rated power (kW/MW)
Maximum charge power
Maximum discharge power
```

### Voltage

```text
Nominal voltage
Maximum voltage
Minimum voltage
```

### Current

```text
Maximum charge current
Maximum discharge current
```

### Thermal

```text
Rated operating temperature minimum
Rated operating temperature maximum
```

### Efficiency

```text
Rated round-trip efficiency
```

### Additional calibration parameters required by the mathematical layer

```text
SOC_min
SOC_max
SOC_initial
SOH_initial
nominal_grid_frequency_hz
frequency_deadband_hz
droop_gain_kw_per_hz
degradation_coefficient
```

---

# 5. Supabase database schema

Use Postgres types deliberately. Store engineering values as `double precision` unless exact decimal behavior is required.

## 5.1 `bess_assets`

```sql
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
```

## 5.2 `telemetry_samples`

This is the raw time-series table.

```sql
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
```

Indexes:

```sql
create index telemetry_bess_time_idx
  on public.telemetry_samples (bess_id, recorded_at desc);
```

## 5.3 `battery_states`

Derived state at each analysis time.

```sql
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
```

Index:

```sql
create index battery_states_bess_time_idx
  on public.battery_states (bess_id, calculated_at desc);
```

## 5.4 `forecasts`

One row per generated forecast series.

```sql
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
```

## 5.5 `forecast_points`

```sql
create table public.forecast_points (
  id bigint generated always as identity primary key,
  forecast_id uuid not null references public.forecasts(id) on delete cascade,

  predicted_at timestamptz not null,
  predicted_value double precision not null,

  lower_bound double precision,
  upper_bound double precision,

  unique(forecast_id, predicted_at)
);
```

The MVP polynomial algorithm does not inherently provide confidence intervals. Leave `lower_bound` and `upper_bound` nullable until a later statistical extension is implemented.

## 5.6 `dispatch_decisions`

```sql
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
```

Index:

```sql
create index dispatch_decisions_bess_time_idx
  on public.dispatch_decisions (bess_id, decided_at desc);
```

---

# 6. Supabase security

Enable Row Level Security on all user-owned tables.

```sql
alter table public.bess_assets enable row level security;
alter table public.telemetry_samples enable row level security;
alter table public.battery_states enable row level security;
alter table public.forecasts enable row level security;
alter table public.forecast_points enable row level security;
alter table public.dispatch_decisions enable row level security;
```

For `bess_assets`, ownership is direct through `owner_id`.

For child tables, authorize access through the linked `bess_assets.owner_id`.

Example policy for asset reading:

```sql
create policy "owners can read their bess assets"
on public.bess_assets
for select
using (auth.uid() = owner_id);
```

Example child-table pattern:

```sql
create policy "owners can read telemetry"
on public.telemetry_samples
for select
using (
  exists (
    select 1
    from public.bess_assets b
    where b.id = telemetry_samples.bess_id
      and b.owner_id = auth.uid()
  )
);
```

Repeat this pattern for all child tables.

### Service-role rule

The Node.js backend may use `SUPABASE_SERVICE_ROLE_KEY` for internal writes.

Never expose the service-role key to the browser.

---

# 7. Supabase Realtime

Enable Realtime on:

```text
telemetry_samples
battery_states
dispatch_decisions
```

Frontend subscriptions:

```text
telemetry insert
    => update live electrical cards + charts

battery_states insert
    => update SOC, SOH, EFC, available energy, power limits

dispatch_decisions insert
    => update recommended action card
```

Do not make the frontend recompute battery state.

---

# 8. Node.js API

Use:

```text
Node.js 22+
TypeScript
Fastify
Zod
@supabase/supabase-js
pino
```

## 8.1 Environment variables

`.env.example`

```bash
NODE_ENV=development
PORT=4000

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ENGINE_BINARY_PATH=../../engine/build/bess_engine
ENGINE_TIMEOUT_MS=5000

CORS_ORIGIN=http://localhost:5173
```

## 8.2 API principles

1. Validate every request with Zod.
2. Never trust BESS IDs from the client without checking ownership.
3. Store raw telemetry first.
4. The analysis process is deterministic from stored telemetry + BESS configuration.
5. Numerical engine failures must not corrupt existing state.
6. Every decision must store its inputs and explanation.
7. Return engineering units explicitly in API docs.

---

# 9. API endpoints

Prefix everything with:

```text
/api/v1
```

## 9.1 Health

```http
GET /api/v1/health
```

Response:

```json
{
  "status": "ok",
  "api": "ok",
  "database": "ok",
  "engine": "ok"
}
```

## 9.2 BESS configuration

```http
POST   /api/v1/bess
GET    /api/v1/bess
GET    /api/v1/bess/:id
PATCH  /api/v1/bess/:id
DELETE /api/v1/bess/:id
```

## 9.3 Telemetry

```http
POST /api/v1/bess/:id/telemetry
POST /api/v1/bess/:id/telemetry/batch

GET /api/v1/bess/:id/telemetry
GET /api/v1/bess/:id/telemetry/latest
```

Query support:

```text
from
to
limit
```

Example telemetry payload:

```json
{
  "recordedAt": "2026-08-18T00:00:00Z",
  "batteryVoltageV": 720,
  "batteryCurrentA": -60,
  "batteryPowerKw": -43.2,
  "batteryTemperatureC": 28.4,
  "gridFrequencyHz": 49.94,
  "gridVoltageV": 415,
  "renewablePowerKw": 110,
  "loadPowerKw": 75
}
```

## 9.4 State

```http
GET  /api/v1/bess/:id/state/latest
GET  /api/v1/bess/:id/state/history
POST /api/v1/bess/:id/analyze
```

`POST /analyze` runs the complete C++ pipeline against the latest data and persists all derived outputs.

## 9.5 Forecasts

```http
POST /api/v1/bess/:id/forecasts
GET  /api/v1/bess/:id/forecasts/latest
GET  /api/v1/bess/:id/forecasts/:forecastId
```

Example request:

```json
{
  "targets": [
    "GRID_FREQUENCY",
    "RENEWABLE_POWER",
    "LOAD_POWER"
  ],
  "historyPoints": 60,
  "horizonMinutes": 60,
  "stepMinutes": 5,
  "maxDegree": 5,
  "tolerance": 0.01
}
```

## 9.6 Decisions

```http
POST /api/v1/bess/:id/decision
GET  /api/v1/bess/:id/decisions/latest
GET  /api/v1/bess/:id/decisions
```

---

# 10. Analysis transaction flow

For a single telemetry sample:

```text
1. API receives telemetry
2. Validate request
3. Persist telemetry_samples row
4. Fetch:
   - BESS configuration
   - latest previous battery_state
   - required recent telemetry history
5. Build engine JSON input
6. Execute C++ engine
7. Parse JSON output
8. Validate engine response
9. Persist:
   - battery_states
   - forecasts + forecast_points
   - dispatch_decisions
10. Return aggregate response
11. Supabase Realtime pushes changes to dashboard
```

Do not delete the raw telemetry if engine execution fails.

An engine failure should return something like:

```json
{
  "telemetryAccepted": true,
  "analysisCompleted": false,
  "error": {
    "code": "ENGINE_FAILURE",
    "message": "..."
  }
}
```

---

# 11. C++ engine contract

Compile one binary:

```text
bess_engine
```

The initial integration should use **stdin JSON → stdout JSON**.

Advantages:

- no C++ web server required
- easy to test
- isolates crashes
- easy to replace later with FFI/gRPC
- Node owns authentication/database concerns

Invocation:

```bash
echo '{"operation":"analyze", ...}' | ./bess_engine
```

The engine writes **JSON only** to stdout.

Debug logs go to stderr.

---

# 12. C++ input format

Example:

```json
{
  "operation": "analyze",
  "version": "1",
  "asset": {
    "ratedEnergyKwh": 500,
    "usableEnergyKwh": 450,
    "ratedPowerKw": 250,
    "maxChargePowerKw": 200,
    "maxDischargePowerKw": 200,
    "nominalVoltageV": 720,
    "minVoltageV": 620,
    "maxVoltageV": 820,
    "maxChargeCurrentA": 300,
    "maxDischargeCurrentA": 300,
    "minTemperatureC": 0,
    "maxTemperatureC": 50,
    "roundTripEfficiency": 0.92,
    "socMin": 0.10,
    "socMax": 0.90,
    "nominalGridFrequencyHz": 50.0,
    "frequencyDeadbandHz": 0.05,
    "droopGainKwPerHz": 100,
    "degradationCoefficient": 0.0001
  },
  "previousState": {
    "soc": 0.75,
    "soh": 0.98,
    "efc": 120.5,
    "cumulativeEnergyThroughputKwh": 120500
  },
  "telemetry": {
    "recordedAt": "2026-08-18T00:00:00Z",
    "batteryVoltageV": 720,
    "batteryCurrentA": -60,
    "batteryPowerKw": -43.2,
    "batteryTemperatureC": 28.4,
    "gridFrequencyHz": 49.94,
    "gridVoltageV": 415,
    "renewablePowerKw": 110,
    "loadPowerKw": 75
  },
  "history": [
    {
      "t": 0,
      "gridFrequencyHz": 50.01,
      "renewablePowerKw": 70,
      "loadPowerKw": 80
    }
  ],
  "forecast": {
    "enabled": true,
    "maxDegree": 5,
    "tolerance": 0.01,
    "horizonSteps": 12,
    "stepSeconds": 300
  }
}
```

---

# 13. C++ output format

```json
{
  "ok": true,
  "state": {
    "soc": 0.756,
    "soh": 0.979,
    "efc": 120.55,
    "internalResistanceOhm": 0.018,
    "usableCapacityKwh": 440.55,
    "availableEnergyKwh": 332.85,
    "chargePowerAvailableKw": 145.0,
    "dischargePowerAvailableKw": 180.0,
    "cumulativeEnergyThroughputKwh": 120550
  },
  "grid": {
    "energyBalanceKw": 35,
    "frequencyDeviationHz": -0.06,
    "frequencySupportRequestKw": 6
  },
  "forecasts": {
    "gridFrequency": {
      "degree": 2,
      "residualNorm": 0.0014,
      "values": [49.95, 49.96, 49.97]
    },
    "renewablePower": {
      "degree": 3,
      "residualNorm": 4.1,
      "values": [115, 121, 124]
    },
    "loadPower": {
      "degree": 2,
      "residualNorm": 2.8,
      "values": [78, 81, 83]
    }
  },
  "decision": {
    "action": "CHARGE",
    "targetPowerKw": -35,
    "score": 0.82,
    "reasonCode": "RENEWABLE_SURPLUS",
    "reasonText": "Renewable generation exceeds load and SOC is below the configured upper bound.",
    "constraints": {
      "socAllowed": true,
      "temperatureAllowed": true,
      "voltageAllowed": true,
      "powerClipped": false
    }
  }
}
```

---

# 14. State estimation

## 14.1 SOC using Coulomb counting

Use previous SOC plus current over elapsed time.

A consistent sign-aware formula under the chosen convention is:

```text
I > 0  => discharge
I < 0  => charge
```

Let:

```text
C_Ah = ratedEnergyWh / nominalVoltageV
```

Then:

```text
deltaSOC = -(I_A * deltaTimeHours * eta_current) / C_Ah
SOC_new  = clamp(SOC_prev + deltaSOC, 0, 1)
```

If using power instead of current:

```text
deltaEnergyKwh = -P_B_kw * deltaTimeHours
SOC_new = SOC_prev + deltaEnergyKwh / usableCapacityKwh
```

Prefer current-based Coulomb counting because the supplied mathematical framework explicitly uses it.

Apply efficiency directionally:

```text
charge:
    effective current = abs(I) * eta_charge

discharge:
    effective current = I / eta_discharge
```

For MVP:

```text
eta_charge = sqrt(round_trip_efficiency)
eta_discharge = sqrt(round_trip_efficiency)
```

## 14.2 Internal resistance

Where a meaningful voltage/current step exists:

```text
R_int = abs(deltaV / deltaI)
```

Do not calculate when:

```text
abs(deltaI) < current_delta_threshold
```

Use a configurable threshold, e.g. `5 A`.

Smooth noisy estimates with a rolling median or EMA before displaying.

## 14.3 Cumulative energy throughput

For every step:

```text
throughputIncrementKwh = abs(P_B_kw) * deltaTimeHours
```

Then:

```text
cumulativeEnergyThroughput += throughputIncrementKwh
```

## 14.4 Equivalent Full Cycles

Use:

```text
EFC = cumulativeEnergyThroughputKwh / (2 * ratedEnergyKwh)
```

This corresponds to one equivalent full cycle for a full charge plus full discharge.

## 14.5 State of Health

MVP simplified linear degradation:

```text
SOH = clamp(
  SOH_initial - degradationCoefficient * EFC,
  0,
  1
)
```

This is intentionally simplified and replaceable.

Do not market this value as a certified remaining-useful-life estimate.

## 14.6 Usable capacity

```text
usableCapacityCurrentKwh =
    configuredUsableEnergyKwh * SOH
```

## 14.7 Available energy

The blueprint treats available energy as less than usable capacity.

For dischargeable energy above minimum SOC:

```text
availableEnergyKwh =
    max(0, (SOC - SOC_min) * usableCapacityCurrentKwh)
```

For UI, also calculate charge headroom:

```text
chargeHeadroomKwh =
    max(0, (SOC_max - SOC) * usableCapacityCurrentKwh)
```

---

# 15. Performance estimation

The mathematical layer must prevent any command beyond BESS constraints.

## 15.1 Charge power capability

Start with:

```text
chargeLimit = maxChargePowerKw
```

Further limit by current:

```text
currentLimitedChargeKw =
    batteryVoltageV * maxChargeCurrentA / 1000
```

Further limit by SOC:

```text
if SOC >= SOC_max:
    chargeLimit = 0
```

Further limit by temperature:

```text
if T <= minTemperatureC or T >= maxTemperatureC:
    chargeLimit = 0
```

MVP result:

```text
chargePowerAvailableKw =
    min(
      maxChargePowerKw,
      currentLimitedChargeKw,
      socChargeLimitKw,
      thermalChargeLimitKw
    )
```

## 15.2 Discharge power capability

```text
currentLimitedDischargeKw =
    batteryVoltageV * maxDischargeCurrentA / 1000
```

If:

```text
SOC <= SOC_min
```

then:

```text
dischargePowerAvailableKw = 0
```

Else:

```text
dischargePowerAvailableKw =
    min(
      maxDischargePowerKw,
      currentLimitedDischargeKw,
      socDischargeLimitKw,
      thermalDischargeLimitKw
    )
```

## 15.3 Thermal derating

MVP can use hard cutoff first.

Optional next improvement:

- full capability within central temperature band
- linearly derate near min/max temperature limits

Never extrapolate beyond configured thermal limits.

---

# 16. Grid analysis

## 16.1 Renewable-load balance

```text
P_balance = P_renewable - P_load
```

Interpretation:

```text
P_balance > 0
    renewable surplus
    candidate CHARGE

P_balance < 0
    energy deficit
    candidate DISCHARGE

P_balance ≈ 0
    candidate HOLD
```

This signal alone does **not** guarantee action.

It must be cross-checked against SOC, SOH, temperature, voltage, and available power.

## 16.2 Frequency deviation

```text
deltaF = gridFrequencyHz - nominalGridFrequencyHz
```

Deadband:

```text
if abs(deltaF) <= frequencyDeadbandHz:
    frequencySupportRequestKw = 0
```

Outside deadband:

```text
P_support = -K * deltaF
```

Interpretation:

```text
frequency low  => deltaF < 0 => P_support > 0 => discharge
frequency high => deltaF > 0 => P_support < 0 => charge
```

Then constrain:

```text
P_support_constrained =
    clip(
      P_support,
      -chargePowerAvailableKw,
      dischargePowerAvailableKw
    )
```

---

# 17. Polynomial forecasting algorithm

Use the referenced C++ method as the forecasting implementation.

The algorithm should:

1. receive `(x_i, y_i)` data points
2. construct a Vandermonde matrix
3. solve a polynomial least-squares problem
4. use Householder QR factorization
5. solve the resulting upper-triangular system through back substitution
6. compute the residual norm
7. increase polynomial degree iteratively
8. stop when:
   - residual tolerance is reached, or
   - `maxDegree` is reached
9. return:
   - selected degree
   - coefficients
   - residual norm
   - future predicted values

## 17.1 Reuse from the reference repository

Port or vendor the conceptual pieces:

```text
Matrix class
Vandermonde generation
Householder QR factorization
Back substitution
Residual calculation
Degree iteration
```

Refactor them into reusable engine modules instead of keeping file-based `test.txt` input.

### Do not keep this behavior

```text
read test.txt
print polynomial to console
exit
```

### Replace with

```text
JSON input
in-memory vectors
structured forecast result
JSON output
```

## 17.2 Forecast x-values

Never use Unix timestamps directly as polynomial `x`.

Normalize time:

```text
x = seconds_since_window_start / step_seconds
```

Typical history:

```text
x = 0, 1, 2, ..., N-1
```

Future:

```text
x = N, N+1, ..., N+horizonSteps-1
```

This improves numerical conditioning.

## 17.3 Maximum degree safety

Do not allow arbitrary degrees.

MVP:

```text
min degree = 1
max degree = min(requestedMaxDegree, 5, N - 1)
```

Default:

```text
maxDegree = 3
```

A degree-5 polynomial is acceptable only when enough history exists.

## 17.4 Forecast targets

### Grid frequency

Input:

```text
time -> gridFrequencyHz
```

Output:

```text
future grid frequency
```

### Renewable generation

Input:

```text
time -> renewablePowerKw
```

Output:

```text
future renewable power
```

Clip negative forecast values:

```text
predictedRenewableKw = max(0, prediction)
```

### Load demand

Input:

```text
time -> loadPowerKw
```

Output:

```text
future load
```

Clip negative forecast values:

```text
predictedLoadKw = max(0, prediction)
```

### Future SOC

Do not fit SOC blindly unless useful.

Prefer calculating future SOC explicitly from expected charging/discharging:

```text
SOC_future =
    SOC_now
    + expectedNetStoredEnergyKwh
      / usableCapacityCurrentKwh
```

The project source explicitly frames future SOC as an explicit calculation from expected charging behavior; preserve that in MVP.

---

# 18. Decision engine

The goal is deterministic, explainable behavior.

## 18.1 Decision priority

Use this order:

```text
1. Safety / constraint violation
2. Frequency support
3. Renewable surplus / deficit
4. Forecast-aware preparation
5. Hold
```

## 18.2 Hard constraint gate

Before any action:

```text
if telemetry invalid:
    HOLD

if temperature outside allowed range:
    HOLD

if voltage outside allowed range:
    HOLD

if SOC >= SOC_max:
    prohibit CHARGE

if SOC <= SOC_min:
    prohibit DISCHARGE
```

## 18.3 Frequency-support decision

If:

```text
abs(deltaF) > frequencyDeadbandHz
```

and constrained support power is non-zero:

```text
action = FREQUENCY_SUPPORT
targetPowerKw = P_support_constrained
```

Store a sub-mode if useful:

```text
supportDirection = CHARGE | DISCHARGE
```

## 18.4 Renewable surplus decision

If:

```text
P_balance > balanceDeadbandKw
AND SOC < SOC_max
AND chargePowerAvailableKw > 0
```

then:

```text
action = CHARGE
targetPowerKw =
    -min(P_balance, chargePowerAvailableKw)
```

## 18.5 Energy deficit decision

If:

```text
P_balance < -balanceDeadbandKw
AND SOC > SOC_min
AND dischargePowerAvailableKw > 0
```

then:

```text
action = DISCHARGE
targetPowerKw =
    min(abs(P_balance), dischargePowerAvailableKw)
```

## 18.6 Hold decision

Else:

```text
action = HOLD
targetPowerKw = 0
```

## 18.7 Forecast-aware extension

After the deterministic MVP works, add a simple look-ahead score.

Example inputs:

```text
predicted renewable surplus
predicted load
predicted grid frequency
future SOC
```

Example heuristics:

- preserve SOC if a large deficit is forecast soon
- create charge headroom if renewable surplus is forecast soon
- avoid unnecessary cycling if current imbalance is small

The first implementation should keep these as explainable scoring terms, not black-box ML.

---

# 19. Decision reason codes

Use stable machine-readable codes.

```text
SAFETY_TEMPERATURE
SAFETY_VOLTAGE
SOC_AT_MAX
SOC_AT_MIN

FREQUENCY_LOW
FREQUENCY_HIGH

RENEWABLE_SURPLUS
ENERGY_DEFICIT

FORECASTED_SURPLUS
FORECASTED_DEFICIT

BALANCED_SYSTEM
INSUFFICIENT_DATA
ENGINE_ERROR
```

Always include human-readable `reasonText`.

Example:

```text
Action:
CHARGE

Reason code:
RENEWABLE_SURPLUS

Reason:
Renewable generation exceeds load by 42.6 kW. SOC is 61.2%, below the 90% maximum, and 80 kW of charge capability is available.

Target:
-42.6 kW
```

---

# 20. Frontend

Use:

```text
React
TypeScript
Vite
Tailwind
shadcn/ui
Recharts
TanStack Query
React Hook Form
Zod
Supabase Auth
```

## 20.1 Pages

### `/login`

- email/password login
- Supabase Auth

### `/dashboard`

Show selected asset.

### `/assets/:id`

Detailed asset dashboard.

### `/assets/:id/configuration`

Edit fixed BESS parameters.

### `/assets/:id/history`

Historical telemetry, state, forecast, and decisions.

---

# 21. Dashboard layout

The supplied UI wireframe suggests KPI cards plus two primary charts.

## 21.1 KPI row

Show:

```text
SOC (%)
SOH (%)
Available Energy (kWh)
Charge Limit (kW)
Discharge Limit (kW)
Temperature (°C)
Equivalent Cycles
Equivalent Age / optional derived metric
```

For MVP, "Equivalent Age" may be omitted unless a defensible formula is explicitly defined.

## 21.2 Primary chart: Renewable generation vs load

Two time series:

```text
renewablePowerKw
loadPowerKw
```

Also optionally shade:

```text
surplus = renewable > load
deficit = renewable < load
```

## 21.3 Primary chart: Grid frequency and BESS response

Left axis:

```text
gridFrequencyHz
```

Right axis:

```text
batteryPowerKw
```

Include a reference line:

```text
nominalGridFrequencyHz
```

## 21.4 Additional chart: SOC history

SOC is a KPI **and** a time series.

Show:

```text
SOC history
SOC_min
SOC_max
```

## 21.5 Decision card

Large visual card:

```text
Recommended Action
CHARGE / DISCHARGE / HOLD / FREQUENCY SUPPORT

Target Power
Reason
Constraint status
Decision timestamp
```

Never display the action without its reason.

---

# 22. Configuration form

Build sections that directly match the input categories.

## Identification

- BESS ID
- Manufacturer
- Model

## Battery

- Chemistry
- Number of modules
- Cells per module

## Capacity

- Rated energy capacity
- Usable energy capacity

## Power

- Rated power
- Max charge power
- Max discharge power

## Voltage

- Nominal voltage
- Min voltage
- Max voltage

## Current

- Max charge current
- Max discharge current

## Thermal

- Min operating temperature
- Max operating temperature

## Efficiency

- Round-trip efficiency

## Controls / Calibration

- SOC min
- SOC max
- Initial SOC
- Initial SOH
- Nominal frequency
- Frequency deadband
- Droop gain
- Degradation coefficient

Validation errors must include the engineering unit.

---

# 23. Demo-data simulator

The project needs realistic data before physical sensors exist.

Create:

```text
scripts/generate-demo-data.ts
```

Generate one sample every configurable interval.

Use:

```text
renewable:
  smooth daytime-like trend + oscillation + noise

load:
  baseline + slow oscillation + small noise

grid frequency:
  nominal ± small random deviation
  occasional disturbance event

temperature:
  ambient baseline + load-related rise

battery current/power:
  follow previous decision in simulation mode
```

The simulator must post through the actual API instead of inserting directly into Supabase.

This validates the real ingestion path.

---

# 24. Automatic analysis job

Support two modes.

## Mode A — immediate

On every new telemetry POST:

```text
store telemetry
run analysis
store results
return
```

Use this first.

## Mode B — scheduled

Later, a worker can run:

```text
every 1 minute
```

and process any unanalysed telemetry.

Do not implement Redis/BullMQ in MVP unless required by load.

---

# 25. Engine service implementation in Node.js

Pseudo-code:

```ts
import { spawn } from "node:child_process";

export async function runEngine(input: EngineInput): Promise<EngineOutput> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.ENGINE_BINARY_PATH!, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Engine timeout"));
    }, Number(process.env.ENGINE_TIMEOUT_MS ?? 5000));

    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });

    child.on("close", code => {
      clearTimeout(timeout);

      if (code !== 0) {
        reject(new Error(`Engine exited ${code}: ${stderr}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(`Invalid engine JSON: ${stdout}`));
      }
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}
```

Validate `EngineOutput` with Zod before persistence.

---

# 26. C++ engine implementation phases

## Phase 1 — extract numerical code

From the polynomial regression repository, isolate:

```text
Matrix
Householder QR
back substitution
Vandermonde construction
residual norm
polynomial coefficients
automatic degree selection
```

Remove console-specific behavior from numerical functions.

## Phase 2 — add reusable polynomial API

Target interface:

```cpp
struct PolynomialFitResult {
    int degree;
    std::vector<double> coefficients;
    double residualNorm;
};

PolynomialFitResult fitPolynomialLeastSquares(
    const std::vector<double>& x,
    const std::vector<double>& y,
    int maxDegree,
    double tolerance
);

double evaluatePolynomial(
    const std::vector<double>& coefficients,
    double x
);
```

## Phase 3 — implement BESS model

Add:

```cpp
BatteryState estimateState(...);
PerformanceLimits estimatePerformance(...);
GridState analyzeGrid(...);
ForecastBundle generateForecasts(...);
Decision makeDecision(...);
```

## Phase 4 — add JSON adapter

Use one JSON library such as:

```text
nlohmann/json
```

The original least-squares numerical implementation can still remain free of external linear-algebra libraries.

The JSON library is transport infrastructure, not a numerical dependency.

---

# 27. Numerical tests

## Matrix tests

- construction
- indexing
- transpose
- multiplication
- vector dimensions
- invalid dimensions

## QR tests

For:

```text
A = Q * R
```

assert:

```text
QᵀQ ≈ I
Q * R ≈ A
```

## Polynomial tests

Use exact polynomial:

```text
y = 1 + x + x² + x³
```

Expected:

```text
degree = 3
coefficients ≈ [1, 1, 1, 1]
very small residual
```

Also test:

- linear data
- noisy data
- constant data
- too few points
- duplicate/degenerate x values
- high requested degree
- tolerance not reached

## State tests

Test:

- charge increases SOC
- discharge decreases SOC
- SOC clamps at 0/1
- EFC increases with throughput
- SOH does not exceed 1
- available energy is zero at `SOC_min`

## Decision tests

Test:

```text
surplus + SOC room => CHARGE
deficit + energy available => DISCHARGE
low frequency => positive frequency support
high frequency => negative frequency support
SOC max => no charge
SOC min => no discharge
overtemperature => HOLD
balanced => HOLD
```

---

# 28. API tests

Use:

```text
Vitest
Fastify.inject()
```

Must cover:

- create BESS
- invalid configuration
- unauthorized asset access
- telemetry insert
- batch telemetry
- latest telemetry
- analyze endpoint
- engine failure
- forecast history
- decision history

Mock engine process for most route tests.

Have at least one integration test use the real compiled engine.

---

# 29. Data quality rules

Reject telemetry when:

```text
recordedAt missing
NaN / infinity
voltage <= 0
frequency <= 0
temperature physically absurd
```

Allow out-of-configuration-limit values to be **stored** if they are legitimate sensor readings.

Why?

Because a safety violation is meaningful data.

Example:

```text
configured max temperature = 50°C
sensor reports 54°C
```

Do not reject it for being outside the configuration.

Store it and let the decision engine produce:

```text
HOLD
SAFETY_TEMPERATURE
```

---

# 30. Missing-data rules

Required for state analysis:

```text
recordedAt
batteryVoltageV
batteryCurrentA
batteryTemperatureC
gridFrequencyHz
```

Optional:

```text
batteryPowerKw
gridVoltageV
renewablePowerKw
loadPowerKw
```

If `batteryPowerKw` missing:

```text
P_B = V * I / 1000
```

with the chosen sign convention.

If renewable/load missing:

- state estimation can still run
- grid energy-balance decision cannot run
- frequency support may still run
- otherwise HOLD with `INSUFFICIENT_DATA`

---

# 31. Time handling

Use UTC everywhere in storage.

Frontend displays local time.

Telemetry must be monotonically analysed by timestamp for correct Coulomb counting.

If an old sample arrives late:

- store it
- do not automatically use it as the new current state
- mark it as historical/backfill
- optionally implement recomputation later

MVP can reject out-of-order real-time analysis while preserving the raw record.

---

# 32. Units

Internally use only:

```text
Power       kW
Energy      kWh
Voltage     V
Current     A
Temperature °C
Frequency   Hz
Time        seconds / hours where explicitly named
SOC         0..1 internally
SOH         0..1 internally
Efficiency  0..1 internally
```

Frontend converts SOC/SOH to percentages.

Do not mix:

```text
50
```

and:

```text
0.50
```

for SOC in backend code.

Backend contract is always `0..1`.

---

# 33. Observability

Node logs must include:

```text
requestId
bessId
telemetryId
engineDurationMs
engineVersion
decisionAction
targetPowerKw
```

Do not log:

```text
Supabase tokens
service role key
full auth headers
```

C++ stderr may contain:

```text
operation
point count
selected degree
residual norm
calculation warnings
```

---

# 34. Error model

Use stable API error codes.

```json
{
  "error": {
    "code": "INVALID_TELEMETRY",
    "message": "batteryVoltageV must be greater than 0",
    "details": {}
  }
}
```

Codes:

```text
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
INVALID_CONFIGURATION
INVALID_TELEMETRY
INSUFFICIENT_HISTORY
ENGINE_TIMEOUT
ENGINE_FAILURE
ENGINE_INVALID_RESPONSE
DATABASE_ERROR
```

---

# 35. Authentication

Use Supabase Auth.

Frontend:

```text
sign in
store Supabase session
send access token to Node API
```

Node API:

```text
Authorization: Bearer <jwt>
```

Validate the user using Supabase.

Every BESS access must be owner-scoped.

Do not trust frontend RLS alone because backend uses service role for internal writes.

---

# 36. MVP visual behavior

Recommended dashboard top section:

```text
┌────────┬────────┬────────────┬──────────┐
│ SOC    │ SOH    │ Available  │ Temp     │
│ 85.2%  │ 97.8%  │ 340.5 kWh  │ 25.4 °C  │
└────────┴────────┴────────────┴──────────┘

┌────────────┬────────────┬──────────────┬─────────┐
│ Charge Lim │ Disch Lim  │ Eq. Cycles   │ Action  │
│ 100 kW     │ 100 kW     │ 120.0        │ CHARGE  │
└────────────┴────────────┴──────────────┴─────────┘
```

Charts:

```text
[ Renewable Generation vs Load Demand ]

[ Grid Frequency + BESS Response ]

[ SOC History ]
```

Bottom:

```text
[ Current Decision ]
Reason
Constraints
Forecast summary
```

---

# 37. Seed/demo asset

Use a seed record like:

```json
{
  "bessCode": "BESS-DEMO-001",
  "manufacturer": "Demo Energy",
  "model": "MVP-500",
  "batteryChemistry": "Li-ion",
  "moduleCount": 10,
  "cellsPerModule": 96,
  "ratedEnergyKwh": 500,
  "usableEnergyKwh": 450,
  "ratedPowerKw": 250,
  "maxChargePowerKw": 200,
  "maxDischargePowerKw": 200,
  "nominalVoltageV": 720,
  "minVoltageV": 620,
  "maxVoltageV": 820,
  "maxChargeCurrentA": 300,
  "maxDischargeCurrentA": 300,
  "minTemperatureC": 0,
  "maxTemperatureC": 50,
  "roundTripEfficiency": 0.92,
  "socMin": 0.10,
  "socMax": 0.90,
  "socInitial": 0.50,
  "sohInitial": 1.00,
  "nominalGridFrequencyHz": 50,
  "frequencyDeadbandHz": 0.05,
  "droopGainKwPerHz": 100,
  "degradationCoefficient": 0.0001
}
```

These values are demo values only, not source-prescribed hardware ratings.

---

# 38. Development commands

Root `package.json` should provide:

```json
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "dev:api": "pnpm --filter api dev",
    "dev:web": "pnpm --filter web dev",
    "build": "pnpm build:engine && pnpm -r build",
    "build:engine": "cmake -S engine -B engine/build && cmake --build engine/build",
    "test": "pnpm test:engine && pnpm -r test",
    "test:engine": "ctest --test-dir engine/build --output-on-failure",
    "demo:data": "tsx scripts/generate-demo-data.ts"
  }
}
```

---

# 39. Local setup

## Prerequisites

```text
Node.js 22+
pnpm
CMake
C++17 compiler
Supabase CLI
Docker
```

## Bootstrap

```bash
pnpm install

supabase start
supabase db reset

pnpm build:engine

cp .env.example .env

pnpm dev
```

Expected:

```text
Frontend: http://localhost:5173
API:      http://localhost:4000
Supabase: local CLI-provided URLs
```

---

# 40. Build order for a coding agent

Follow this exact order.

## Milestone 1 — scaffold

- [ ] Create monorepo.
- [ ] Configure pnpm workspaces.
- [ ] Create React/Vite TypeScript frontend.
- [ ] Create Fastify TypeScript API.
- [ ] Create `engine/` CMake project.
- [ ] Add root scripts.
- [ ] Add `.env.example`.
- [ ] Add formatter/linter.

**Done when:** web + API + C++ hello-world all build.

## Milestone 2 — Supabase

- [ ] Add migration with all tables.
- [ ] Add indexes.
- [ ] Add RLS.
- [ ] Add policies.
- [ ] Add seed asset.
- [ ] Add Supabase client to API.
- [ ] Add Supabase auth to web.

**Done when:** authenticated user can create/read one BESS asset.

## Milestone 3 — configuration

- [ ] Implement BESS CRUD API.
- [ ] Build configuration form.
- [ ] Add server-side Zod validation.
- [ ] Display configured asset.

**Done when:** configuration persists correctly.

## Milestone 4 — telemetry

- [ ] Create telemetry schema.
- [ ] Implement single insert endpoint.
- [ ] Implement batch endpoint.
- [ ] Implement latest/history reads.
- [ ] Create demo-data generator.
- [ ] Build live telemetry cards.
- [ ] Build basic telemetry charts.

**Done when:** dashboard moves with simulated data.

## Milestone 5 — C++ polynomial engine

- [ ] Bring over Matrix implementation.
- [ ] Bring over Householder QR.
- [ ] Bring over back substitution.
- [ ] Bring over Vandermonde construction.
- [ ] Bring over residual calculation.
- [ ] Refactor into `fitPolynomialLeastSquares`.
- [ ] Add numerical tests.
- [ ] Add polynomial forecast tests.

**Done when:** engine fits known polynomial datasets from in-memory vectors.

## Milestone 6 — JSON engine

- [ ] Add JSON stdin parser.
- [ ] Add structured stdout.
- [ ] Add engine operation routing.
- [ ] Add Node `engine.service.ts`.
- [ ] Add timeout handling.
- [ ] Add Zod validation of engine response.

**Done when:** Node can call C++ and receive a typed JSON result.

## Milestone 7 — battery state

- [ ] Implement Coulomb-counting SOC.
- [ ] Implement throughput.
- [ ] Implement EFC.
- [ ] Implement simplified SOH.
- [ ] Implement usable capacity.
- [ ] Implement available energy.
- [ ] Implement internal resistance estimate.
- [ ] Persist `battery_states`.

**Done when:** simulated charge/discharge creates physically consistent state trends.

## Milestone 8 — constraints

- [ ] Compute available charge power.
- [ ] Compute available discharge power.
- [ ] Add SOC constraint.
- [ ] Add current constraint.
- [ ] Add temperature constraint.
- [ ] Add voltage safety gate.
- [ ] Add tests.

**Done when:** unsafe requests are constrained to HOLD/zero capability.

## Milestone 9 — grid analysis

- [ ] Implement renewable-load balance.
- [ ] Implement frequency deviation.
- [ ] Implement frequency droop response.
- [ ] Constrain response to available power.

**Done when:** grid events generate correct candidate signals.

## Milestone 10 — forecasting

- [ ] Load historical telemetry window.
- [ ] Normalize time.
- [ ] Forecast grid frequency.
- [ ] Forecast renewable power.
- [ ] Forecast load power.
- [ ] Persist model degree + residual.
- [ ] Persist forecast points.
- [ ] Add forecast lines to charts.

**Done when:** dashboard shows observed + future curves.

## Milestone 11 — decisions

- [ ] Implement hard constraint gate.
- [ ] Implement frequency-support priority.
- [ ] Implement renewable surplus charging.
- [ ] Implement deficit discharging.
- [ ] Implement HOLD.
- [ ] Store reason code.
- [ ] Store reason text.
- [ ] Store decision inputs/constraints.
- [ ] Build decision card.

**Done when:** every telemetry cycle produces an explainable persisted decision.

## Milestone 12 — realtime

- [ ] Subscribe to telemetry.
- [ ] Subscribe to battery state.
- [ ] Subscribe to decisions.
- [ ] Update query caches cleanly.
- [ ] Handle reconnect.

**Done when:** dashboard updates without refresh.

## Milestone 13 — hardening

- [ ] API tests.
- [ ] Engine tests.
- [ ] Integration tests.
- [ ] Auth tests.
- [ ] Engine timeout test.
- [ ] Invalid telemetry test.
- [ ] Out-of-order telemetry behavior.
- [ ] Error UI.
- [ ] Loading/empty states.
- [ ] Responsive layout.

**Done when:** one-command local test/build passes.

---

# 41. Acceptance scenarios

## Scenario A — renewable surplus

Given:

```text
SOC = 50%
renewable = 120 kW
load = 70 kW
available charge capability = 100 kW
frequency normal
```

Expected:

```text
balance = +50 kW
action = CHARGE
target = -50 kW
```

## Scenario B — deficit

Given:

```text
SOC = 70%
renewable = 20 kW
load = 90 kW
available discharge capability = 100 kW
frequency normal
```

Expected:

```text
balance = -70 kW
action = DISCHARGE
target = +70 kW
```

## Scenario C — SOC max

Given:

```text
SOC >= SOC_max
renewable surplus
```

Expected:

```text
do not charge
action = HOLD
reason = SOC_AT_MAX
```

unless a distinct higher-priority safe action exists.

## Scenario D — low frequency

Given:

```text
nominal frequency = 50.0 Hz
actual = 49.90 Hz
deadband = 0.05 Hz
K = 100 kW/Hz
```

Then:

```text
deltaF = -0.10 Hz
P_support = +10 kW
```

Expected:

```text
FREQUENCY_SUPPORT
target = +10 kW
```

provided battery constraints allow it.

## Scenario E — overtemperature

Given:

```text
temperature > max configured temperature
```

Expected:

```text
HOLD
target = 0
reason = SAFETY_TEMPERATURE
```

## Scenario F — polynomial test

Given points generated by:

```text
P(x) = 1 + x + x² + x³ + x⁴ + x⁵
```

and adequate tolerance/max degree:

Expected:

```text
degree = 5
very small residual
coefficients ≈ [1,1,1,1,1,1]
```

---

# 42. Definition of done for MVP

The MVP is complete when a user can:

1. sign in
2. create/configure a BESS asset
3. stream or simulate telemetry
4. see live:
   - SOC
   - SOH
   - available energy
   - charge/discharge capability
   - temperature
   - EFC
5. see:
   - renewable vs load chart
   - grid frequency vs BESS response chart
   - SOC history
6. generate and view polynomial forecasts
7. see an explainable decision:
   - CHARGE
   - DISCHARGE
   - HOLD
   - FREQUENCY_SUPPORT
8. inspect historical decisions
9. trace each decision back to:
   - telemetry
   - battery state
   - constraints
   - forecasts
10. run all API and numerical tests successfully

---

# 43. Explicit non-goals for MVP

Do not implement yet:

```text
direct PCS/BMS control
Modbus/OPC-UA hardware drivers
market bidding APIs
real money energy trading
Kalman filter SOC estimator
equivalent circuit electrochemical model
machine-learning forecast model
reinforcement learning
remaining-useful-life certification
multi-BESS fleet optimization
distributed job infrastructure
```

These are future-state features.

---

# 44. Future upgrades

The source blueprint explicitly anticipates an architecture where individual mathematical components can be replaced.

Recommended progression:

## State estimation

MVP:

```text
Coulomb counting
```

Future:

```text
Kalman filter
state observer
```

## Degradation

MVP:

```text
EFC + simplified linear SOH
I²R loss awareness
```

Future:

```text
equivalent circuit model
temperature/C-rate aging model
remaining useful life
```

## Forecasting

MVP:

```text
polynomial least squares / numerical forecasting
```

Future:

```text
ARIMA
advanced time series
ML
```

## Decision engine

MVP:

```text
constraint rules + deterministic scoring
```

Future:

```text
linear programming
market-aware optimization
model predictive control
reinforcement learning
```

The interfaces in this build must make these replacements possible without changing the frontend contract.

---

# 45. Coding-agent rules

When vibecoding this repository, follow these rules.

1. **Do not skip milestones.**
2. **Do not fake the C++ engine with JavaScript.**
3. **Do not silently change sign conventions.**
4. **Do not expose Supabase service-role credentials to the frontend.**
5. **Do not calculate authoritative SOC/SOH in React.**
6. **Do not let forecasts bypass physical constraints.**
7. **Do not let a renewable surplus automatically imply charge.**
8. **Do not let a deficit automatically imply discharge.**
9. **Persist reasons for every decision.**
10. **Keep numerical functions pure where possible.**
11. **Separate transport JSON from numerical logic.**
12. **Add a test before refactoring critical numerical code.**
13. **Use UTC internally.**
14. **Use SOC/SOH as `0..1` internally.**
15. **Use kW/kWh consistently.**
16. **Treat the BESS action as a recommendation, not a safety-certified command.**
17. **If a formula is ambiguous, add an explicit assumption in code comments and tests rather than hiding it.**
18. **Make every algorithmic module independently replaceable.**

---

# 46. Suggested first coding prompt

Use this as the first prompt to a coding agent:

```text
Read build.md completely before writing code.

Implement Milestones 1 and 2 only.

Create the monorepo structure exactly as specified, using:
- pnpm workspaces
- React + TypeScript + Vite for apps/web
- Fastify + TypeScript for apps/api
- CMake + C++17 for engine
- Supabase local development

Create the initial Supabase migration with all tables, constraints, indexes, RLS and ownership policies defined in build.md.

Add root build/dev/test scripts and .env.example.

Do not implement business logic, forecasting, SOC calculations or decision logic yet.

At the end:
1. show the resulting repository tree,
2. list all commands needed to run it,
3. run the available builds/tests,
4. report any failures without hiding them.
```

Then continue milestone-by-milestone.

---

# 47. Suggested second coding prompt

```text
Read build.md and inspect the repository.

Implement Milestones 3 and 4 only:
- BESS configuration CRUD
- Zod validation
- ownership checks
- telemetry ingestion
- telemetry history/latest
- demo-data generator
- basic dashboard KPI placeholders and telemetry charts

Do not implement state estimation or forecasting yet.

Run tests and show changed files.
```

---

# 48. Suggested C++ coding prompt

```text
Read build.md, especially sections 11-17 and 26-27.

Implement Milestone 5.

Use the polynomial least-squares repository referenced by the project as the conceptual algorithm source:
- Vandermonde matrix
- Householder QR factorization
- upper triangular back substitution
- residual norm
- iterative degree selection

Refactor the implementation into a reusable in-memory C++ API.

Do not read test.txt in production code.
Do not invoke external numerical linear algebra libraries.
Do add deterministic numerical tests.

Target:
PolynomialFitResult fitPolynomialLeastSquares(x, y, maxDegree, tolerance)

At the end, run CMake build and CTest and report exact results.
```

---

# 49. Final product mental model

The system should always be explainable as:

```text
SENSORS
  ↓
What is happening now?

STATE ESTIMATION
  ↓
What condition is the battery actually in?

PERFORMANCE ESTIMATION
  ↓
What is it physically allowed to do?

GRID ANALYSIS
  ↓
What does the external system currently need?

FORECASTING
  ↓
What is likely to happen next?

CONSTRAINT-AWARE DECISION
  ↓
What is the best permitted action right now?

DATABASE + DASHBOARD
  ↓
Can a human inspect and understand every step?
```

If the codebase stops preserving this dependency chain, the architecture is drifting.

---

# 50. Source-to-build mapping

This implementation uses the project materials as follows:

- **Energy-storage problem context:** ESS buffers intermittent renewable generation, supports real-time balancing, peak shaving, grid resilience, and renewable utilization.
- **BESS mathematical architecture:** raw sensor data → state estimation → performance estimation → grid analysis → prediction → constrained decision.
- **State equations:** Coulomb-counting SOC, internal resistance from voltage/current change, EFC/throughput-based degradation.
- **Performance constraints:** SOC, thermal, rated power/current constraints and efficiency/loss awareness.
- **Grid analysis:** renewable-load balance and frequency droop support.
- **Prediction:** numerical forecasting of grid frequency, renewable generation, load demand, and explicit future-SOC calculation.
- **Original software stack concept:** database + Node.js + C++ core + frontend.
- **Project adaptation:** Supabase Postgres is used instead of MongoDB.
- **Forecast implementation:** polynomial least-squares using Householder QR from the referenced C++ repository.

Any value that appears only in the demo seed is an implementation example, not a hardware fact from the project materials.
