# LAHAP Backend

Backend service and background job worker for **LAHAP** (SME Catering Subscription & Fulfillment Platform). Built with Express 5, TypeScript (ESM), Prisma 8, PostgreSQL, Redis, BullMQ, S3-compatible object storage, Midtrans Snap, and Qwen AI.

---

## Tech Stack

- **Runtime:** Node.js `>=26.8.2` (native `Temporal` API, ESM)
- **Language:** TypeScript 7 (`strict` mode)
- **HTTP Framework:** Express 5 (`helmet`, `cors`, `cookie-parser`, `multer`)
- **Database & ORM:** PostgreSQL + Prisma 8 (`@prisma/orm-postgres`, `pg`)
- **Cache, Pub/Sub & Queues:** Redis (`ioredis`) + BullMQ (`bullmq`)
- **Object Storage:** S3-compatible storage (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **Payment Gateway:** Midtrans Snap API
- **AI Providers:** OpenAI-compatible SDK (`openai`) targeting Qwen VL / Flash models (receipt extraction & stock level estimation)
- **Validation & Auth:** Zod 4, JSON Web Tokens (`jsonwebtoken`), Bcrypt (`bcrypt`)
- **Logging:** Pino (`pino`, `pino-pretty`)
- **Testing:** Vitest 5 + Supertest

---

## Architecture & Directory Structure

The backend follows a **modular monolith** and **ports-and-adapters (hexagonal)** architecture:

```text
backend/
├── prisma.config.ts            # Prisma 8 configuration
├── src/
│   ├── index.ts                # HTTP API server entry point
│   ├── worker.ts               # BullMQ worker & cron scheduler entry point
│   ├── app.ts                  # Express app factory & middleware pipeline
│   ├── config/                 # Zod-validated environment configuration per concern
│   ├── shared/                 # Cross-cutting ports, HTTP helpers, time, schemas, utilities
│   │   ├── auth/               # Role definitions & auth types
│   │   ├── http/               # Auth/role middlewares, error handler, rate limiter, pagination
│   │   ├── media/              # Photo folder constants & signed URL helpers
│   │   ├── ports/              # Shared port interfaces (cache, event-bus, payment, AI, S3, etc.)
│   │   ├── schema/             # Reusable Zod schemas (decimals, coordinates, passwords, etc.)
│   │   ├── time/               # Asia/Jakarta Temporal helpers & Indonesian date formatting
│   │   └── utils/              # Pure utilities (distance, decimal, meal-time, allergy-clash, etc.)
│   ├── infrastructure/         # Concrete adapters implementing shared ports
│   │   ├── cache/redis/        # Redis cache adapter
│   │   ├── database/prisma/    # Prisma contract, migrations, DB client, and seed scripts
│   │   ├── event-bus/redis/    # Redis Pub/Sub event bus for SSE realtime streams
│   │   ├── hasher/bcrypt/      # Bcrypt password hasher
│   │   ├── jwt/                # JWT access & refresh token signer/verifier
│   │   ├── logger/pino/        # Pino structured logger
│   │   ├── object-storage/s3/  # S3 object storage & presigned URL adapter
│   │   ├── payment-gateway/    # Midtrans Snap adapter
│   │   ├── qwen/               # Shared Qwen OpenAI-compatible client
│   │   ├── receipt-extractor/  # Qwen VL receipt OCR adapter
│   │   ├── scheduler/bullmq/   # BullMQ queues, cron schedules & job worker
│   │   └── stock-level-estimator/ # Qwen stock level photo estimator adapter
│   └── modules/                # Domain modules
│       ├── create-modules.ts   # Composition root wiring all domain modules
│       ├── auth/               # Registration, login, token refresh, logout
│       ├── users/              # Customer profile (/me) & Admin user management
│       ├── settings/           # Business profile & system settings
│       ├── files/              # Multipart file upload to S3
│       ├── realtime/           # Server-Sent Events (SSE) stream (/api/realtime/stream)
│       ├── catalog/            # Allergies, packages, menus, and schedules
│       ├── ingredients/        # Stock management, stock history, shopping list, AI photo estimate
│       ├── tiers/              # Membership tiers & automatic tier evaluation
│       ├── promo-codes/        # Promo codes & eligibility validation
│       ├── notifications/      # In-app notifications, broadcasts & announcements
│       ├── orders/             # Subscriptions, checkout, Midtrans webhooks, slots, reports
│       ├── kitchen/            # Daily production (to-cook) aggregation
│       ├── delivery/           # Courier daily deliveries & obstacle reporting
│       └── retention/          # Churned customer detection & WhatsApp follow-up templates
└── tests/
    └── e2e/                    # End-to-end API test suites
```

Each domain module under `src/modules/<module>/` is organized into:

- `domain/` — Entities, value objects, domain errors, and pure business rules
- `ports/` — Module-specific repository and external service interfaces
- `application/` — Service classes orchestrating use cases
- `adapters/` — Prisma repositories and cross-module adapters
- `http/` — Express controllers and routers
- `schema/` — Request/query Zod validation schemas
- `container/` — Module dependency injection wiring

---

## Prerequisites & Environment Setup

### 1. Required Services

Ensure the following services are running locally (or reachable via URL):

- **Node.js** `>=26.8.2`
- **PostgreSQL** (default port `5432`)
- **Redis** (default port `6379`)
- **S3-compatible Object Storage** (e.g., SeaweedFS / MinIO on port `8333`)

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and adjust values as needed:

```bash
cp .env.example .env
```

| Group               | Key Variables                                                                                         | Description                                                                                                             |
| :------------------ | :---------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| **App & HTTP**      | `PORT`, `IS_PRODUCTION`, `CORS_ORIGINS`, `TRUST_PROXY`, `UPLOAD_MAX_BYTES`, `AUTH_*`, `REALTIME_*`    | Server port (default `4000`), CORS origins, upload size limit, auth cookie & rate limit settings, SSE connection limits |
| **Database**        | `DB_URL`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`                                              | PostgreSQL connection string and credentials                                                                            |
| **JWT & Hasher**    | `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`  | Access/refresh token signing parameters and Bcrypt work factor                                                          |
| **AI Providers**    | `RECEIPT_EXTRACTOR_*`, `STOCK_ESTIMATOR_*`                                                            | Qwen API keys, base URLs, models, timeouts, and retry settings                                                          |
| **Object Storage**  | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_SIGNED_URL_EXPIRES_IN` | S3 endpoint, bucket (`receipts`), and presigned URL expiration                                                          |
| **Payment Gateway** | `MIDTRANS_SERVER_KEY`, `MIDTRANS_BASE_URL`, `MIDTRANS_TIMEOUT_MS`, `MIDTRANS_MAX_RETRIES`             | Midtrans Snap API credentials and sandbox/production URL                                                                |
| **Redis**           | `REDIS_URL`, `REDIS_PORT`, `REDIS_KEY_PREFIX`                                                         | Redis connection used for caching, rate limiting, SSE Pub/Sub, and BullMQ                                               |
| **Scheduler**       | `SCHEDULER_TIMEZONE`, `SCHEDULER_*_CRON`, `SLOT_PREPARATION_LEAD_MINUTES`                             | Cron schedules (in `Asia/Jakarta`) and slot preparation lead time                                                       |
| **Logger**          | `LOG_LEVEL`, `LOG_SERVICE_NAME`, `LOG_FILE_PATH`, `LOG_PRETTY`                                        | Pino logging level and formatting                                                                                       |

---

## Database & Seeding

The canonical database schema lives at `src/infrastructure/database/prisma/contract.prisma`.

### Emit Contract & Run Migrations

```bash
# Regenerate Prisma contract artifacts after editing contract.prisma
npm run contract:emit

# Apply migrations to your database
npx prisma migrate deploy
```

### Seed Demo Data

The seed script populates business settings, allergies, users, membership tiers, ingredients, menus, packages, schedules, promo codes, message templates, and sample subscriptions/orders.

> **Note:** Seeding and cleaning seed data are blocked when `IS_PRODUCTION="true"`.

```bash
# Seed demo data (idempotent upsert)
npm run db:seed

# Truncate all domain tables first, then seed fresh data
npm run db:seed -- --reset

# Remove only the deterministic seeded records
npm run db:clean-seed
```

### Seeded User Accounts

All seeded accounts share the password **`password123`** (defined in `src/infrastructure/database/prisma/seed/main.ts` and `src/infrastructure/database/prisma/seed/modules/users/users.data.ts`):

| Role       | Name          | Phone           | Email              | Address / Coordinates                                                                       | Allergies & Notes                                       |
| :--------- | :------------ | :-------------- | :----------------- | :------------------------------------------------------------------------------------------ | :------------------------------------------------------ |
| `ADMIN`    | Admin Lahap   | `6281100000001` | `admin@lahap.test` | —                                                                                           | —                                                       |
| `KITCHEN`  | Dapur Lahap   | `6281100000002` | `dapur@lahap.test` | —                                                                                           | —                                                       |
| `COURIER`  | Joko Kurir    | `6281100000003` | `joko@lahap.test`  | —                                                                                           | —                                                       |
| `COURIER`  | Eko Kurir     | `6281100000004` | `eko@lahap.test`   | —                                                                                           | —                                                       |
| `CUSTOMER` | Rina Putri    | `6281200000001` | `rina@lahap.test`  | Jl. MT Haryono No. 12, Dinoyo, Lowokwaru, Kota Malang (`-7.93930000`, `112.60940000`)       | Allergies: `kacang`                                     |
| `CUSTOMER` | Andi Wijaya   | `6281200000002` | `andi@lahap.test`  | Jl. Danau Toba No. 5, Sawojajar, Kedungkandang, Kota Malang (`-7.97210000`, `112.65800000`) | Allergies: `seafood`<br>Note: _Tidak bisa makan terong_ |
| `CUSTOMER` | Dewi Lestari  | `6281200000003` | —                  | —                                                                                           | —                                                       |
| `CUSTOMER` | Bagus Santoso | `6281200000004` | `bagus@lahap.test` | Jl. Diponegoro No. 20, Sisir, Kota Batu (`-7.87100000`, `112.52600000`)                     | —                                                       |

---

## Running the Application

### Development

```bash
# Start the HTTP API server in watch mode (default http://localhost:4000)
npm run dev

# Start the BullMQ background worker & cron scheduler in watch mode
npm run dev:worker

# Run the worker once without watch mode
npm run worker

# Manually enqueue an immediate heartbeat check job
npm run worker -- --trigger-heartbeat
```

### Production

```bash
# Compile TypeScript to dist/
npm run build

# Start compiled HTTP server
npm start

# Start compiled background worker
npm run start:worker
```

### Background Scheduled Jobs (`src/worker.ts`)

- **`heartbeat`** (`SCHEDULER_HEARTBEAT_CRON`, default `* * * * *`): Periodic worker liveness check recorded in `job_runs`.
- **`expire-pending-payments`** (`SCHEDULER_EXPIRE_PENDING_PAYMENTS_CRON`, default `* * * * *`): Marks overdue `Pending` subscription and delivery-upgrade payments as `Expired`.
- **`prepare-due-slots`** (`SCHEDULER_PREPARE_DUE_SLOTS_CRON`, default `*/15 * * * *`, plus immediate catch-up on worker startup): Advances `Terjadwal` order slots to `Disiapkan` when within `SLOT_PREPARATION_LEAD_MINUTES` of their meal time.
- **`remind-empty-schedules`** (`SCHEDULER_REMIND_EMPTY_SCHEDULES_CRON`, default `0 9 * * *`): Sends an admin notification if any available package has no published schedules in the upcoming 7-day window.

---

## Testing & Code Quality

```bash
# Run unit tests in watch mode (excludes integration & E2E tests)
npm test

# Run unit tests once
npm run test:run

# Run unit tests with coverage report
npm run coverage

# Run integration tests (requires running PostgreSQL, Redis, and S3)
npm run test:integration

# Run end-to-end HTTP tests sequentially
npm run test:e2e

# Typecheck source and test files
npm run typecheck

# Check or apply Prettier formatting
npm run format:check
npm run format
```

---

## API Contract & Design Documentation

- **OpenAPI 3.1 Specification:** [`../docs/api/openapi.json`](../docs/api/openapi.json) (`GET /health` + `/api/*` endpoints)
- **Product Requirements (PRD):** [`../docs/design/PRD.md`](../docs/design/PRD.md)
- **Entity-Relationship Diagram (ERD):** [`../docs/design/ERD.md`](../docs/design/ERD.md)
- **Use Cases:** [`../docs/design/USE_CASES.md`](../docs/design/USE_CASES.md)
- **UML Class Diagram:** [`../docs/design/UML.md`](../docs/design/UML.md)
- **Sitemap:** [`../docs/design/SITEMAP.md`](../docs/design/SITEMAP.md)
