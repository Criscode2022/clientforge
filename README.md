# ClientForge

**Production-ready client, project & invoice operating system** for freelancers and small agencies.

| Layer | Stack |
| --- | --- |
| Frontend | **Angular 19** · standalone components · **Tailwind CSS** · Chart.js |
| Backend | **NestJS 11** · JWT auth · class-validator · REST API |
| Database | **Neon Postgres** in production · **PGLite** embedded fallback for local/demo |
| Deploy | Docker image (API serves Angular SPA) · monorepo ready for Vercel/Railway |

---

## Why ClientForge

Freelancers juggle CRMs, spreadsheets, and invoice tools. ClientForge unifies:

- **Clients** — status pipeline (lead → active → archived), notes, revenue per client
- **Projects** — budgets, hourly rates, due dates, delivery status
- **Invoices** — line items, tax, draft/sent/paid/overdue lifecycle
- **Expenses** — billable vs operating costs
- **Dashboard** — paid YTD, outstanding, overdue, revenue charts, top clients, pipeline

Demo workspace is seeded automatically on first boot.

| | |
| --- | --- |
| Email | `demo@clientforge.app` |
| Password | `demo1234` |

---

## Repository layout

```text
apps/
  api/     NestJS REST API + Neon/PGLite data layer
  web/     Angular SPA + Tailwind
scripts/
  api-smoke.mjs   End-to-end API smoke tests
Dockerfile        Production image (SPA served by Nest)
docker-compose.yml
```

---

## Quick start (local)

### Prerequisites

- Node.js **20+**
- Optional: a [Neon](https://neon.tech) project for real Postgres

```bash
git clone https://github.com/Criscode2022/clientforge.git
cd clientforge
npm install
```

### Development (two processes)

```bash
# Terminal A — API (default http://localhost:3001)
cd apps/api && PORT=3001 npm run start:dev

# Terminal B — Angular (http://localhost:8080, proxies /api → 3001)
cd apps/web && npx ng serve --host 0.0.0.0 --port 8080 --proxy-config proxy.conf.json
```

Or from the monorepo root:

```bash
npm run dev
```

Open the app, sign in with the demo account, explore the dashboard.

### Production build (single process)

```bash
npm run build
PORT=8080 npm run start:prod --workspace=api
```

### Docker

```bash
export DATABASE_URL="postgresql://..."   # optional
export JWT_SECRET="your-secret"
docker compose up --build
```

---

## Neon setup

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the pooled connection string
3. Set `DATABASE_URL` in your host (Railway, Render, Fly, Docker, etc.)
4. On boot, ClientForge runs the SQL schema and seeds the demo user **only if the users table is empty**

Without `DATABASE_URL`, the API uses **PGLite** (in-memory Postgres-compatible engine) so demos never block on credentials.

---

## API surface

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | — | Liveness + DB mode |
| POST | `/api/auth/register` | — | Create workspace |
| POST | `/api/auth/login` | — | JWT login |
| GET | `/api/auth/me` | JWT | Current user |
| CRUD | `/api/clients` | JWT | Client CRM |
| CRUD | `/api/projects` | JWT | Project pipeline |
| CRUD | `/api/invoices` | JWT | Invoices + line items |
| CRUD | `/api/expenses` | JWT | Expenses |
| GET | `/api/dashboard` | JWT | Analytics payload |

All data is **scoped to the authenticated user** (`user_id` on every query).

---

## Tests

With the API running on port 3001:

```bash
node scripts/api-smoke.mjs http://127.0.0.1:3001
```

Covers health, login, dashboard, list endpoints, and client create/update/delete.

---

## Environment

See [`.env.example`](./.env.example):

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | No* | Neon connection string (*required for durable prod data) |
| `JWT_SECRET` | Yes (prod) | Sign access tokens |
| `PORT` | No | Default `8080` in prod, `3001` in dev API |
| `HOST` | No | Default `0.0.0.0` |

---

## Deploy checklist

1. Provision Neon → set `DATABASE_URL`
2. Set a strong `JWT_SECRET`
3. Build & run Docker image **or** deploy `apps/api` with `apps/web/dist` co-located
4. Hit `/api/health` → expect `"db":"neon"`
5. Login with demo credentials or register a fresh account

---

## License

MIT — built for real freelance workflows.
