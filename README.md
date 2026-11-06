<div align="center">

# BuildFlow AI

**The AI software factory: describe a business, get a real, working application — not a mockup.**

[![Live Platform](https://img.shields.io/badge/Live-buildandflowai.lovable.app-0F766E?style=for-the-badge&logo=googlechrome&logoColor=white)](https://buildandflowai.lovable.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TanStack Start](https://img.shields.io/badge/TanStack_Start-v1-FF4159?style=for-the-badge)](https://tanstack.com/start)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

</div>

---

## Overview

BuildFlow AI is a platform that turns a plain-English description of a business into **complete, usable software**: a persistent, multi-module application with real CRUD, real database storage, real business logic (inventory, orders, customers, bookings), a public storefront, and a one-click path to leaving the platform entirely via a standalone code export.

It is deliberately built as **two distinct products**:

| | BuildFlow **Platform** | Generated **Application** |
|---|---|---|
| What it is | The factory — AI generator, templates, projects, history, settings | The product — the customer's own software |
| Lives at | `/dashboard`, `/generate`, `/projects`, `/templates`, `/history`, `/settings` | Own runtime at `/app/:projectId` and `/run/:projectId` |
| Owner | BuildFlow | The user who generated it — full CRUD, export, and control |
| Shares data | Never | Only with its owner (strict row-level isolation, verified) |

> **Live:** [buildandflowai.lovable.app](https://buildandflowai.lovable.app) — sign up, describe a business, and open the generated app in one flow.

---

## What It Does

### 1. The Generator
A user describes a business ("I run a mobile phone shop that sells phones and accessories"). The platform's AI maps the description to a **verified application recipe** — never an invented structure — and assembles a complete app from a catalog of **75+ production module types** (products, inventory, orders, customers, leads, deals, bookings, staff, invoices, expenses, loyalty points, and more).

- **54 verified application recipes** (clothing shop, restaurant, CRM, inventory management, appointment booking, bill manager, freelancer/portfolio, agency, salon, and more)
- **8 curated starter templates** with curated prompts on the Templates page
- Tolerant blueprint repair pipeline: malformed AI output is recovered, normalized, and validated before anything reaches the user
- Owner is dropped **straight into the live generated app** — no dashboard detour

### 2. The Generated Application Runtime
Every generated project is an **independent application** at its own routes, not a view inside the BuildFlow admin:

- **Workspace** — `/app/:projectId`: sidebar navigation, real dashboard computed from actual records, one working CRUD page per module
- **App runtime** — `/run/:projectId`: the application shell the owner and, when published, its customers use
- **Public storefront** — `/site/:projectId`: catalog, item detail, cart, and checkout for customer-facing apps (clothing shops, restaurants, product businesses)
- **Full persistence** — every create/edit/delete hits the database with optimistic UI updates, refresh-safe; validated forms; useful empty states; retryable error states that preserve the user's input
- **Public / private visibility** — the owner decides whether the app is accessible to visitors

### 3. Business Logic That Actually Runs
The runtime is workflow-aware, not a generic table editor:

- **Stock intelligence** — orders and sales decrement the correct inventory targets, purchases restock, cancellations/refunds/deletions reverse the effect, and multi-item free-text order lines (`iPhone 15 128GB Black (1), 30W Fast Charger USB-C (2)`) are matched product-by-product across **multi-item orders**
- **Customer relations** — deals and bookings automatically create and link customer/contact records
- **Reports** — computed from the app's real records, never hardcoded demo numbers

### 4. The AI Maintenance Pipeline
The platform can **modify a generated app without breaking it**, through a deterministic pipeline:

```
ANALYZE → PLAN → MODIFY → VALIDATE → TEST → APPLY
```

- Natural-language change requests ("add a discount field", "change currency to INR", "add WhatsApp button", "add appointment cancellation")
- **Project versioning** with owner-scoped history and **automatic rollback** if validation or regression checks fail
- AI-added fields and modules appear live in forms, tables, and reports of the running app

### 5. Code Export — The App Can Leave
A generated application is exportable as a **standalone, production-structured codebase**:

- Next.js (App Router) + TypeScript + Tailwind CSS
- Database migrations with row-level security policies included
- `Dockerfile` + `docker-compose.yml`
- GitHub Actions CI workflow
- Deployment config (Node and Cloudflare Workers targets)
- **Readiness checks** that verify export completeness before download
- A standalone HTML variant and exported data are available separately, and the export UI clearly distinguishes *hosted runtime*, *exported application*, and *exported data*

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BuildFlow AI Platform                         │
│                  (TanStack Start · React 19 · SSR)                   │
│                                                                       │
│  /generate ──► AI Generator ──► Blueprint Repair ──► App Creation    │
│                     │                        │                       │
│              Lovable AI Gateway          Verified recipes            │
│              (structured output)          54 apps · 75+ modules      │
│                                                                       │
│  ┌──────────────────── Generated App Runtime ────────────────────┐   │
│  │  /app/:id (workspace)   /run/:id (runtime)   /site/:id (store) │   │
│  │        │                        │                    │          │   │
│  │  CRUD per module         customer-facing      catalog · cart      │   │
│  │  dashboards · reports    app shell            checkout            │   │
│  └────────────────┬──────────────────────────────────────────────┘   │
│                   │                                                    │
│  Maintenance pipeline: ANALYZE→PLAN→MODIFY→VALIDATE→TEST→APPLY       │
│  Versioning · rollback · regression checks                           │
│                   │                                                    │
│  Export: Next.js codebase + migrations + Docker + CI                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────▼────────────────┐
              │      Lovable Cloud (Postgres)   │
              │  Row-level security on every    │
              │  table · owner-scoped policies  │
              └─────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start v1 (full-stack React 19, file-based routing, server functions) |
| Build tool | Vite 7 |
| Language | TypeScript (strict) |
| UI | Tailwind CSS v4 + shadcn/ui + Radix primitives + lucide-react |
| State & data | TanStack Query, server functions with auth middleware |
| Database | Postgres (Lovable Cloud) with row-level security on every table |
| Auth | Email + password, Google OAuth, per-user session middleware |
| AI | Lovable AI Gateway (structured generation + maintenance pipeline) |
| Hosting | Cloudflare Workers (edge SSR) |
| Testing | Vitest (stock/workflow unit tests) + Playwright (end-to-end verification) |

---

## Project Structure

```
buildflow-ai/
├── src/
│   ├── routes/                     # File-based routes
│   │   ├── index.tsx               # Public landing page
│   │   ├── auth.tsx                # Sign in / sign up / confirm email
│   │   ├── pricing.tsx, about.tsx, contact.tsx, privacy.tsx, terms.tsx
│   │   ├── site.$id.*.tsx          # Public storefronts (catalog/cart/checkout)
│   │   ├── _authenticated/         # Platform (session-gated)
│   │   │   ├── dashboard.tsx       # Platform dashboard
│   │   │   ├── generate.tsx        # AI generator workflow
│   │   │   ├── templates.tsx       # Starter template library
│   │   │   ├── projects.*.tsx      # Projects + project detail
│   │   │   ├── app.$id.tsx         # Generated app workspace
│   │   │   ├── run.$id.*.tsx       # Generated app runtime
│   │   │   ├── maintain.$id.tsx    # AI maintenance pipeline
│   │   │   ├── export.$id.tsx      # Code export + readiness checks
│   │   │   ├── history.tsx, admin.tsx, settings.tsx, onboarding.tsx
│   │   └── sitemap[.]xml.ts        # SEO sitemap (server route)
│   ├── components/
│   │   ├── runtime/                # Generated-app shell, CRUD pages, dashboard, reports
│   │   ├── workspace/              # Record dialogs, assistant, module management
│   │   ├── ui/                     # shadcn/ui primitives
│   │   └── site/                   # Public marketing site parts
│   ├── lib/
│   │   ├── modules.ts              # Module catalog — 75+ module types
│   │   ├── appTypes.ts             # 54 verified application recipes
│   │   ├── templates.ts            # 8 curated starter templates
│   │   ├── appRelations.ts         # Workflow-aware stock & customer relations
│   │   ├── runtime.functions.ts    # Generated-app CRUD server functions
│   │   ├── maintenance.functions.ts# AI maintenance pipeline
│   │   ├── exportProject.ts        # Standalone Next.js codebase generator
│   │   ├── export.ts               # Standalone HTML export
│   │   ├── ai.functions.ts         # Blueprint generation (plan limits enforced)
│   │   ├── plans.ts                # Free / Starter / Pro limits
│   │   └── __tests__/stock.test.ts # Stock accounting tests
│   ├── integrations/
│   │   ├── supabase/               # Generated clients, auth middleware, RLS types
│   │   └── lovable/                # Google sign-in broker
│   ├── routes/__root.tsx           # Root layout + head + auth-state wiring
│   └── start.ts                    # Server middleware registration
├── supabase/
│   ├── migrations/                 # Full schema history (apply in order)
│   └── config.toml
└── README.md
```

---

## Getting Started

### Prerequisites
- **Bun** ≥ 1.1 or Node ≥ 20
- A Lovable Cloud (Postgres) backend and an AI gateway key

### Run locally

```bash
bun install
bun run dev        # http://localhost:8080
```

### Database
Apply every migration in `supabase/migrations/` in chronological order. Every table ships with:

1. `CREATE TABLE`
2. Explicit `GRANT` statements (PostgREST does not grant defaults)
3. `ENABLE ROW LEVEL SECURITY`
4. Owner-scoped `CREATE POLICY`

### Build

```bash
bun run build      # client + worker bundle
bun run start      # local production preview
```

### Environment
Server-only secrets (`SUPABASE_*`, AI gateway key) are read **inside** handlers — Cloudflare Workers inject env per request. Only `VITE_*` values reach the browser; no service credentials are ever in client code (verified).

---

## Security Model

- **Row-level security on every application table** — policies are scoped to the owning user; a user's generated apps, records, exports, and maintenance history are invisible to every other account (verified with a second-account isolation test).
- **No anonymous writes** to app data; signup is email-confirmed.
- **Server-side plan limits** — generation quotas are enforced in the handler, never trusted from the client.
- **Privileged clients bypassing RLS** are used only inside verified handlers, imported dynamically after the caller is authenticated.
- **No secrets in the browser bundle** — secrets live in server env; publishable keys only in `VITE_*`.

---

## Testing

| Suite | What it covers |
|---|---|
| `src/lib/__tests__/stock.test.ts` | Stock accounting: single & multi-item orders, deletion restock, unmatched items, purchase direction |
| Playwright end-to-end | Real user journey: generate → open app → open every module → create/edit/delete → refresh → verify persistence across 8 business types |

```bash
bun test           # unit tests
```

Verified behaviors include: cross-account data isolation, failed-save/delete recovery (errors preserve input, never an infinite retry loop), refresh-safe persistence, real dashboard metrics, and form validation.

---

## Honest Status

Built and verified, deliberately without overclaiming:

| Area | Status |
|---|---|
| Generator → generated app → full CRUD → persistence | Verified end-to-end across multiple business types |
| Multi-item stock accounting | Unit-tested (13 stock tests) and verified live |
| Cross-user data isolation | Verified with a second account |
| Code export | 53-file export built and compiled independently |
| Order email notifications to owners | Blocked pending sender-domain setup |
| Load testing at 20k concurrent customers | **Not verified** — no load test has been run |
| Stripe billing | Not wired (pricing page is a placeholder workflow) |

---

## Deployment

- **Platform:** Cloudflare Workers (edge SSR). `bun run build` produces the client bundle and worker; configure server env in the Worker settings.
- **Database:** managed Postgres; enable point-in-time recovery for production and take periodic logical backups.
- **Exported generated apps:** deploy the exported Next.js codebase anywhere Node runs (Vercel, Cloudflare via OpenNext, Docker) — migrations and CI are included in the export.

---

## License

Proprietary — all rights reserved. See `LICENSE` before any public redistribution.

## Author

**Taha Udaipurwala** — product, architecture, and engineering.

<p align="center">
  <a href="https://buildandflowai.lovable.app">Try BuildFlow AI →</a>
</p>
