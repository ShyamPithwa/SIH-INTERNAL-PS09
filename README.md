<div align="center">

# 🔋 BESS Intelligence & Dispatch Platform
### SIH 2024 — Internal Problem Statement PS09

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![C++17](https://img.shields.io/badge/C++-17-00599C?logo=c%2B%2B)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)

**A production-grade Battery Energy Storage System (BESS) monitoring, state estimation, and constrained dispatch optimization platform built for Smart India Hackathon 2024.**

</div>

---

## 📋 Problem Statement

> **PS09 — BESS Intelligence & Dispatch Optimization**  
> Design and implement a software platform that ingests real-time telemetry from grid-connected Battery Energy Storage Systems, computes accurate State of Charge (SOC) and State of Health (SOH) estimates using mathematical models, and generates optimal charge/discharge dispatch decisions while respecting hardware safety constraints and grid frequency stability requirements.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│         (Vite + TypeScript + Recharts + Supabase Realtime)      │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API + Realtime Subscriptions
┌────────────────────────▼────────────────────────────────────────┐
│                    Fastify REST API                             │
│              (Node.js + TypeScript + Zod + JWT)                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Analysis Job Orchestrator                  │   │
│   └───────────────────────┬─────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────┘
                            │ stdin/stdout JSON IPC
┌───────────────────────────▼─────────────────────────────────────┐
│               C++ Mathematical Engine (bess_engine.exe)         │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Vandermonde │  │  Householder │  │   Back Substitution  │   │
│  │   Matrix    │→ │ QR Factor.   │→ │   Polynomial Fit     │   │
│  └─────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Coulomb    │  │  Degradation │  │    Droop Control &   │   │
│  │  Counting   │  │  SOH Model   │  │   Dispatch Decision  │   │
│  └─────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                Supabase (PostgreSQL + Auth + Realtime)          │
│    bess_assets │ telemetry_samples │ battery_states │           │
│    dispatch_decisions │ forecasts  │ forecast_points           │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🔢 C++ Mathematical Engine
- **Polynomial Regression via Householder QR Factorization** — least-squares curve fitting on renewable generation and load demand time-series
- **Vandermonde Matrix Construction** — normalized time-axis basis for stable polynomial fitting
- **Back Substitution Solver** — O(n²) triangular system solver for polynomial coefficients
- **Coulomb-Counting SOC Estimation** — integrates current over time with temperature and SOH corrections
- **Cycle-based SOH Degradation** — models capacity fade using configurable degradation coefficients
- **Internal Resistance Estimation** — tracks battery impedance growth with cycling
- **Droop Control Frequency Stabilization** — responds to grid frequency deviations with proportional power corrections
- **Prioritized Safety Gate Dispatch** — suspends operations on voltage/temperature boundary violations

### ⚡ Real-Time Backend
- **Fastify REST API** with full JWT authentication via Supabase Auth
- **Automatic Analysis Pipeline** — every telemetry ingest triggers the C++ engine via child process IPC
- **Zod Schema Validation** — strict input/output validation at every API boundary
- **Repository Pattern** — clean separation between domain logic and database access

### 📊 React Dashboard
- **Live Realtime Updates** via Supabase Postgres Change subscriptions
- **SOC/SOH KPI Cards** — sourced from C++ engine state estimation (not hardcoded)
- **Engine Dispatch Card** — shows actual CHARGE / DISCHARGE / HOLD decision with reason text
- **Recharts Area/Line charts** — Renewable vs Load power, Grid frequency, SOC history
- **Protected Routes** with Supabase session-based authentication
- **Premium glassmorphic UI** with dark theme, gradient typography, and micro-animations

---

## 🗂️ Monorepo Structure

```
SIH-INTERNAL-PS09/
├── engine/                     # C++ Mathematical Engine
│   ├── include/
│   │   ├── matrix.h            # Matrix operations (multiply, transpose, identity)
│   │   ├── nla_functions.h     # Numerical linear algebra (norm, dot product)
│   │   ├── factorizations.h    # Householder QR factorization
│   │   ├── polynomial_regression.h  # Vandermonde + least-squares solver
│   │   ├── state_estimation.h  # Coulomb-counting SOC, SOH degradation
│   │   ├── performance_estimation.h # Power derating, available energy
│   │   ├── grid_analysis.h     # Droop control, frequency deviation
│   │   ├── decision_engine.h   # Dispatch decision logic
│   │   ├── json_io.h           # nlohmann/json stdin/stdout interface
│   │   └── domain.h            # Shared domain structs
│   └── src/                    # C++ implementation files
│
├── apps/
│   ├── api/                    # Fastify REST API (Node.js + TypeScript)
│   │   └── src/
│   │       ├── plugins/        # Auth (JWT) + Supabase client
│   │       ├── routes/         # BESS, Telemetry, State, Decisions, Forecasts
│   │       ├── services/       # Business logic layer
│   │       ├── repositories/   # Database access layer
│   │       ├── schemas/        # Zod validation schemas
│   │       └── jobs/           # Analysis job orchestrator
│   │
│   └── web/                    # React Frontend (Vite + TypeScript)
│       └── src/
│           ├── pages/          # LoginPage, DashboardPage, ConfigurationPage
│           ├── hooks/          # useBess, useTelemetry, useDecision, useBatteryState
│           └── lib/            # Supabase client, API helper
│
├── packages/
│   └── shared/                 # Shared TypeScript types (BessAsset, TelemetrySample, etc.)
│
├── supabase/
│   └── migrations/             # PostgreSQL schema (tables, indexes, RLS policies)
│
├── scripts/
│   ├── build-engine.js         # C++ compilation script (GCC/MinGW)
│   ├── generate-demo-data.ts   # Simulated telemetry stream generator
│   └── create-user.js          # Admin user provisioning script
│
├── start.bat                   # One-click server start (Windows)
├── build-engine.bat            # One-click C++ engine build (Windows)
└── test.bat                    # One-click E2E smoke test (Windows)
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Backend runtime |
| pnpm | 8+ | Package manager |
| GCC/MinGW | 6.3+ | C++ compiler |
| Git | Any | Version control |

### 1. Clone the Repository

```bash
git clone https://github.com/ShyamPithwa/SIH-INTERNAL-PS09.git
cd SIH-INTERNAL-PS09
```

### 2. Install Dependencies

```bash
pnpm install
```
*(On Windows, prefix every `pnpm` command with `powershell -ExecutionPolicy Bypass -Command`)*

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase project credentials (URL + Service Role Key).  
Also copy `apps/web/.env` with Vite-specific vars:

```bash
cp apps/web/.env.example apps/web/.env   # or manually create with VITE_ vars
```

### 4. Apply Database Schema

Copy the contents of `supabase/migrations/0001_initial_schema.sql` and execute it in your **Supabase SQL Editor** (Dashboard → SQL Editor → New Query).

### 5. Build the C++ Engine

**Windows:**
```cmd
build-engine.bat
```
**Linux/Mac:**
```bash
node scripts/build-engine.js
```

### 6. Create a User Account

```bash
# Windows
powershell -ExecutionPolicy Bypass -Command "cd apps/api; node ../../scripts/create-user.js"
```

### 7. Start the Platform

**Windows (easiest):**
```cmd
start.bat
```
**Any OS:**
```bash
pnpm dev
```

| Service | URL |
|---------|-----|
| 🌐 React Dashboard | http://localhost:5173 |
| ⚙️ Fastify API | http://localhost:4000 |

---

## 🧪 Testing

### E2E Integration Smoke Test
Tests the full pipeline: authentication → BESS registration → telemetry ingestion → C++ engine execution → state and decision persistence.

**Windows:**
```cmd
test.bat
```
**Any OS:**
```bash
cd apps/api
node smoke-test.js
```

**Expected output:**
```
=======================================
   BESS PLATFORM INTEGRATION TEST     
=======================================
✅ Authentication successful!
✅ BESS asset created
✅ Telemetry ingested
✅ C++ engine verified:
     SOC: 45.01% | SOH: 100.00% | Action: CHARGE | Power: -40 kW
=======================================
      SMOKE TEST COMPLETED SUCCESSFULLY!
=======================================
```

### Live Telemetry Simulation
Streams continuous mock telemetry to watch the dashboard update in real-time:

```bash
npx ts-node scripts/generate-demo-data.ts
```

---

## 🔌 API Reference

All endpoints require `Authorization: Bearer <supabase-jwt>` unless noted.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check *(no auth)* |
| `POST` | `/api/v1/bess` | Register a new BESS asset |
| `GET` | `/api/v1/bess` | List your BESS assets |
| `GET` | `/api/v1/bess/:id` | Get asset details |
| `PATCH` | `/api/v1/bess/:id` | Update asset configuration |
| `DELETE` | `/api/v1/bess/:id` | Remove asset |
| `POST` | `/api/v1/bess/:id/telemetry` | Ingest telemetry sample → triggers C++ analysis |
| `POST` | `/api/v1/bess/:id/telemetry/batch` | Ingest batch of telemetry |
| `GET` | `/api/v1/bess/:id/telemetry` | Get telemetry history |
| `GET` | `/api/v1/bess/:id/telemetry/latest` | Get latest sample |
| `GET` | `/api/v1/bess/:id/state/latest` | Get latest C++ state estimation |
| `POST` | `/api/v1/bess/:id/analyze` | Manually trigger C++ dispatch analysis |
| `GET` | `/api/v1/bess/:id/decisions/latest` | Get latest dispatch decision |
| `GET` | `/api/v1/bess/:id/decisions` | Get decisions history |
| `GET` | `/api/v1/bess/:id/forecasts` | Get polynomial forecasts |

---

## 🧮 Mathematical Models

### State of Charge — Coulomb Counting
```
SOC(t) = SOC(t-1) + (I × Δt) / (C_usable × SOH)
```
- Temperature correction factor applied for Li-ion kinetics
- Clamped to `[SOC_min, SOC_max]` per asset configuration

### State of Health — Cycle Degradation
```
SOH(t) = SOH(t-1) - (|ΔE| / C_rated) × degradation_coefficient
```
- EFC (Equivalent Full Cycles) tracked cumulatively
- Usable capacity updated: `C_usable = C_rated × SOH`

### Polynomial Forecast — Householder QR
```
A = V^T V (Vandermonde normal equations)
A = QR   (Householder reflectors)
coeffs = R⁻¹ Q^T b  (back substitution)
```
- Degree 1–4 polynomial selected by minimum residual norm
- Forecast horizon: 12 steps × 5 min = 60 minutes ahead

### Droop Control
```
P_droop = -K_droop × (f_grid - f_nominal)
```
Active only when `|f_grid - f_nominal| > deadband_Hz`

### Dispatch Priority Logic
```
1. SUSPENDED   — if temperature or voltage out of bounds
2. HOLD        — if SOC at boundary limits
3. CHARGE      — if renewable surplus > 0 (grid export available)
4. DISCHARGE   — if load deficit > 0 (grid support needed)
5. HOLD        — default (frequency within deadband)
```

---

## 🛡️ Security

- All API endpoints protected with Supabase JWT verification
- Row-Level Security (RLS) on database tables — users can only access their own assets
- Service Role Key never exposed to frontend (backend-only)
- `.env` files excluded from Git via `.gitignore`
- Frontend uses only the public Anon Key

---

## 👥 Team

| Member | Role |
|--------|------|
| **Rishil** | Full-stack development, C++ engine, system architecture |
| **Shyam Pithwa** | Backend API, database schema, integration testing |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built for Smart India Hackathon 2024**  
*Transforming battery intelligence with mathematical precision*

</div>
