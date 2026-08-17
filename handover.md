# BESS Platform Handover Documentation

This project implements the **Battery Energy Storage System (BESS) Intelligence & Dispatch Platform** (Problem Statement: PS09). It integrates a high-performance C++ mathematical solver with a Node.js Fastify backend API and a premium React dashboard frontend.

---

## 📂 Repository Details
- **Target Remote Repository**: `https://github.com/ShyamPithwa/SIH-INTERNAL-PS09.git`
- **Monorepo Architecture**:
  - `engine/`: Core C++ mathematical solver (Vandermonde, Householder QR factorization, back substitution, Coulomb-counting state estimation, and droop control decision engine).
  - `apps/api/`: Fastify REST API, JWT auth, database repositories/services, and process spawn manager.
  - `apps/web/`: React frontend styled with modern glassmorphic CSS widgets, Recharts graphing libraries, and Supabase Realtime listeners.
  - `packages/shared/`: Shared TypeScript type definitions used by both the frontend and backend.

---

## 🛠️ Errors Solved & System Hardening

### 1. C++ Compiler Compatibility (GCC 6.3.0)
- **Problem**: The system's MinGW compiler (v6.3.0) lacks full C++17 structured bindings (`auto const& [key, val]`), failing compilation.
- **Solution**: Refactored `json_io.cpp` to use standard C++11 map pairs (`for (auto const& pair : output.forecasts)`), ensuring native compilation.

### 2. Node.js 18 Global WebSocket Missing
- **Problem**: Under Node.js 18, `WebSocket` is not globally defined. The `@supabase/supabase-js` client crashes when establishing Realtime connections.
- **Solution**: Installed the npm package `ws` inside the Fastify API workspace and mapped `(global as any).WebSocket = ws` at the very top of `supabase.ts` and the test scripts. This mocks a native global WebSocket constructor.

### 3. ES6 Import Hoisting of Dotenv
- **Problem**: ES6 static imports inside `server.ts` hoist the database setup files before `dotenv.config()` is executed, resulting in empty Supabase credentials.
- **Solution**: Embedded a robust, recursive `.env` file locator at the top of the plugin initialization sequence, loading environment variables immediately upon import.

### 4. Fastify Logger Transport Crashes
- **Problem**: Pino was configured with `pino-pretty` formatting, which was missing from the local workspace dependencies, crashing server boot.
- **Solution**: Refactored the Fastify logger to use native JSON logging (`logger: true`), removing the crash vector and dependencies.

### 5. Port 4000 EADDRINUSE Conflict
- **Problem**: Previous crashes left background Node processes bound to port 4000, blocking the dev server.
- **Solution**: Executed a PowerShell sequence to identify and terminate processes listening on port 4000.

### 6. Supabase Email Confirmation Bypass for Tests
- **Problem**: The remote Supabase instance has "Confirm Email" enabled, blocking automated test signups.
- **Solution**: Configured the integration test `smoke-test.js` to utilize the Service Role Key client (`supabaseAdmin`) to dynamically delete the test user and re-register them with `email_confirm: true` bypassed.

---

## 🚀 Setup & Execution Guide

### 1. Database Migrations
Copy the SQL schema from `supabase/migrations/0001_initial_schema.sql` and execute it directly in the SQL Editor of your **Supabase Web Dashboard**. (Local Supabase CLI DB migrations cannot be run because Docker is missing on this machine).

### 2. Build the C++ Engine
To compile the pure C++ engine executable:
```bash
pnpm build:engine
```
*Note: Compilation optimizations (-O3) have been turned off to drastically reduce compilation times and prevent terminal hangs during development.*

### 3. Start Development Servers
To boot the Fastify backend and Vite web frontend in parallel:
```bash
pnpm dev
```
- **Fastify API**: `http://localhost:4000`
- **Vite Web UI**: `http://localhost:5173`

### 4. Run E2E Integration Tests
To test the complete workflow (registering a BESS, posting telemetry, running C++ state estimation, and saving dispatch decisions):
```bash
cd apps/api
node smoke-test.js
```

### 5. Simulate Telemetry Streams
To stream continuous mock telemetry values to the dashboard chart:
```bash
npx ts-node scripts/generate-demo-data.ts
```
