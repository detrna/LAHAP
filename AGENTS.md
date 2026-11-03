# LAHAP Platform — Agent Guidelines & Architectural Memory

> **System Name:** LAHAP (SME Catering Subscription & Fulfillment Platform)
> **Source Documents:** [`docs/design/PRD.md`](docs/design/PRD.md), [`docs/design/ERD.md`](docs/design/ERD.md), [`docs/design/USE_CASES.md`](docs/design/USE_CASES.md), [`docs/design/UML.md`](docs/design/UML.md), [`docs/design/SITEMAP.md`](docs/design/SITEMAP.md), [`docs/api/openapi.json`](docs/api/openapi.json) _(`openapi.json` is the full API contract (2026-11-02): 110 operations, 112 schemas, matching `contract.prisma` and the decisions below. It's imported into Apidog project 1407823; the Apidog MCP is read-only. Update the spec whenever an endpoint or entity changes. Edit the JSON directly (there's no generator). Every operation and schema carries `x-apidog-folder`, which Apidog uses to place it on import: operations use their tag with `/` (`Admin/Users`), schemas use a domain folder (`Common`, `Enums`, `Users`, `Orders`, …)_

**Precedence when sources disagree:** the **official PRD** (PDF "GTNIC -1", written by the PM; not yet in the repo) > `docs/design/PRD.md` (a derived markdown version) > ERD > UML/USE_CASES/SITEMAP. The developer wrote the ERD, UML, USE_CASES and SITEMAP. The official PRD's UC-xx acceptance criteria are the detailed spec. As of 2026-11-02 the PM is still revising the **refund flow** and **receipt OCR**, so don't build either beyond what exists without checking first. For the **physical schema**, `backend/src/infrastructure/database/prisma/contract.prisma` is canonical. ERD §6 holds a verbatim copy of it, and UML §7 just links there. **When you change `contract.prisma`, update ERD §2–§7 and UML §2–§4 in the same change** (last synced 2026-11-02). Where the code already diverges from the docs, or the docs contradict each other, see [Open Decisions](#open-decisions--known-inconsistencies) and ask instead of picking silently.

## Key Mathematical Formulas

1. **Daily Production (ToCook):**
   $$\text{TotalPortions}(P, M, D, W) = \sum [\text{order.slot} \mid \text{Success} \land \neg\text{Skipped}]$$
   $$\text{IngredientRequirement}(B, D, W) = \sum_M (\text{TotalPortions}(M) \times \text{QuantityPerPortion}(B, M))$$
2. **Stock Shortage:**
   $$\text{NeedsPurchase}(B) = \max(0, \text{WeeklyRequirement}(B) - \text{CurrentStock}(B))$$
3. **Allergen Clash:**
   $$\text{IsClash} = (\text{UserAllergies} \cap \text{MenuAllergenTags}) \ne \emptyset$$
4. **Order Total (BR-17/18):** `Total = slots × price − tierDiscount − promoDiscount + deliveredSlots × feePerSlot`. Tier is applied first, then promo on the reduced food subtotal. If `promoCode.allowStackWithTier = false`, apply only `max(tier, promo)`. Delivery fees are **never** discounted. **Snapshot the whole breakdown on `Subscription` at checkout** (decided 2026-11-02): `pricePerPortion`, `foodSubtotal`, `tierId` + `tierDiscount`, `promoDiscount`, `deliveryFeePerSlot`, `deliveryFeeTotal`, and `totalPrice` (must equal `foodSubtotal − tierDiscount − promoDiscount + deliveryFeeTotal`). Income reports (UC-31) sum these from `Success` orders, and skips never change them (BR-11).
5. **Delivery Fee (BR-15):** `km = ceil(getDistanceInKm(business, orderPin))`; fee = `0` if `km ≤ freeRadius`, else `(km − freeRadius) × pricePerKm`. Beyond max distance, hide the delivery option (do not reject). The kitchen location is on `Business`. Each parameter resolves as `package.<param> ?? business.<param>`. Snapshot the fee into the order at checkout, because rate changes only apply to new orders (BR-16). `getDistanceInKm` in `backend/src/shared/utils/distance/` returns **unrounded** km, so callers apply `ceil`.
6. **Churn (BR-28):** has a `Success` history ∧ no active order ∧ `MAX(endDate) < today − 14 days`.
7. **Cut-off (BR-09):** order and cancel allowed until 23:59:59 the day before the first service day, in `Asia/Jakarta`.

## Repository Map

- `backend/`: the only implemented app (Express 5 + TypeScript ESM). Infrastructure adapters and HTTP middleware exist. The only domain module is the `users` skeleton, and it has no endpoints or routes mounted yet (`app.ts` serves only `/health`).
- `frontend/`: placeholder. Its README still describes the old receipt-digitizer scope and is stale. The planned stack is Next.js App Router (see SITEMAP §5).
- `docs/design/`: design specs in Indonesian (Markdown only). `docs/api/openapi.json`: the API contract.

## Backend Conventions

### Layout (ports & adapters)

| Concern | Location & naming |
| :--- | :--- |
| Port (interface) | `src/shared/ports/<name>/<name>.ts` exporting an interface + I/O types, with `export * from "./errors.js"` at the top |
| Port errors | `src/shared/ports/<name>/errors.ts` |
| Adapter | `src/infrastructure/<port-name>/<vendor>/<vendor>.ts`, class `<Vendor><PortName> implements <PortName>` (e.g. `MidtransPaymentGateway`, `QwenStockLevelEstimator`). Async setup uses a `load<Thing>()` factory |
| Shared vendor client | `src/infrastructure/<vendor>/` (e.g. `infrastructure/qwen/` shared by both Qwen adapters) |
| Config | `src/config/<name>.ts` exports `<name>EnvSchema` (Zod), `type <Name>Env`, a `readonly` `<Name>Config` interface with **UPPER_SNAKE** keys, `to<Name>Config(env)`, `load<Name>Config(env)` |
| Wiring | Register new config in `config/index.ts` (`Config`, `envSchema`, `loadConfig`), new adapters in `infrastructure/index.ts` (`Adapters`, `createAdapters`). `Adapters` holds adapter instances typed by their ports, and is distinct from the `infrastructure/` folder, which also holds non-port code (`db.ts`, migrations, BullMQ). `db` is deliberately **not** in `Adapters`, so only repository adapters can reach it, and new env vars in `backend/.env.example` |
| Pure helpers | `src/shared/utils/<name>/` with their own `errors.ts` |
| Domain modules | `src/modules/<module>/` (decided 2026-11-03, plural names), **one folder per layer, with a class file + one file per method** (Go-style receivers; see the block below the table): `controller/<module>.controller.ts`: class `<X>Controller` (HTTP only: validated input → service → `createSuccessResponse`), with handlers in `controller/<action>.ts`. `service/<module>.service.ts`: class `<X>Service` (use cases and business rules; UML anemic domain, so the logic lives here), with methods in `service/<action>.ts`. `service/interfaces/<module>.repository.ts`: the repository **port the service owns** (interface `<X>Repository` + record types, re-exports the domain errors). `repository/prisma/<module>-repository.ts`: class `Prisma<X>Repository implements <X>Repository`, with methods in `repository/prisma/<action>.ts`. `domain/`: `errors.ts` (single file) and `<entity>.domain.ts` (domain types and pure rules). `routes/<module>.routes.ts` (single file): `create<X>Router({ controller, tokenProvider })`, where each endpoint chains authenticate → authorize(`x-roles`) → validate → `controller.<handler>`. `schema/<module>.schemas.ts`: Zod request schemas mirroring `openapi.json`. `container/<module>.container.ts`: class `<X>Container({ db, adapters, …otherServices })` (`ModuleDeps` in `src/modules/module-deps.ts`) builds repository → service → controller → router, exposes `service` + `router`, wiring only. The container is the only place that sees the whole `adapters` object: it hands services and routers **individual ports** (`new UsersService(repo, adapters.hasher)`), never `adapters` itself. **Dependency rule:** `service/` and `domain/` never import `repository/prisma/`, Prisma, Express or `infrastructure/`. Only the container (the composition root) imports the adapter, and the adapter imports the port (outer → inner). Tests sit next to each method file. **Interfaces only at boundaries:** the repository port, plus **cross-module** dependencies, which are declared by the *consuming* module in `service/interfaces/` (e.g. orders declares `TierDiscountProvider`, and `LoyaltyService` satisfies it structurally). No interface between controller and service; tests mock the class type (`Pick<UsersService, "getById">`), which works because dependencies are `readonly`, not `private`. `app.ts` creates containers in dependency order, passes **services** (never repositories) across modules, creates shared singletons (e.g. the SSE hub) once and passes them in, and mounts each `router` on the `/api` router. Shared calculations (fees, pricing, cut-off) go in `src/shared/utils/`. Modules: `auth`, `users`, `catalog`, `orders`, `payments`, `kitchen`, `delivery`, `notifications`, `retention`, `settings`, `loyalty`; `users` is scaffolded. |

**Receiver-style methods** (the pattern was type-checked and run end to end on 2026-11-03):

```ts
// service/get-by-id.ts: the method, with an explicit receiver, like Go's (s *UsersService)
import type { UsersService } from "./users.service.js"; // type-only, so there is no runtime import cycle
export async function getById(this: UsersService, id: string): Promise<UserView> { /* this.usersRepository … */ }

// service/users.service.ts: the class lists its method set
export class UsersService {
    constructor(readonly usersRepository: UsersRepository) {} // readonly, not private: method files sit outside the class
    getById = getById;                                         // services/repositories: plain assignment
}

// controller/users.controller.ts: handlers are passed to Express detached, so bind them
export class UsersController {
    constructor(readonly usersService: UsersService) {}
    getUserById = getUserById.bind(this);
}
```

### Errors

- Every domain or infra error extends `AppError` (`src/shared/errors/app-error.ts`) with `readonly code` (UPPER_SNAKE string) and `readonly statusCode` (HTTP status).
- Name classes with an `…Error` suffix (`InvalidHashInputError`). The `Error…`-prefixed classes in `stock-level-estimator/errors.ts` are an outlier; don't copy them.
- Messages are lowercase and do not end with a period. Always pass `{ cause }` when wrapping.
- Adapters must translate vendor exceptions into port errors (`…ProviderError` = 502, `…FailureError(operation, cause)` = 500). Never leak vendor errors.
- Constructor misconfiguration throws a plain `Error("<ENV_VAR> is not set")` (fail fast at boot).

### HTTP

- Responses use the envelope helpers in `src/shared/response/`: `createSuccessResponse(data, meta?)` gives `{ data, meta? }`, `createPaginatedResponse(items, {page,limit,total})` gives `{ data, meta: PaginationMeta }`, and errors come out as `{ error: { code, message, issues? } }` (produced only by `errorHandler`).
- Middleware is a factory that takes a deps/options object (`authenticate({ tokenProvider })`, `errorHandler({ logger })`). Chain order: `authenticate → authorize(...roles) → validateRequest/validateBody/... → paginate() → handler`. Register `errorHandler` last.
- Never write error responses yourself. Async route handlers just `throw` (or let promises reject): Express 5 forwards that to `errorHandler`. Middleware forwards failures with `next(err)`.
- Validated, coerced input replaces `req.body/query/params`. `req.user = { userId, name, role }` and `req.pagination = { page, limit, offset, skip, take }`.
- **Auth sessions (decided 2026-11-02): stateless JWT pair.** Register/login return `{ accessToken, refreshToken, tokenType: "Bearer", expiresIn, user }` (`JwtTokenProvider.signTokenPair`). `POST /auth/refresh` takes `{ refreshToken }` in the body (`verifyRefreshToken`), re-checks the user still exists and `isActive`, and returns a new pair. `POST /auth/logout` (any role, 204) exists for the client flow but revokes nothing; the client must discard both tokens. The MVP has **no server-side revocation**, so a leaked refresh token stays valid until it expires (`JWT_REFRESH_EXPIRES_IN`, 7d).
- **Media (decided 2026-11-02): no File table.** `POST /files` (multipart) uploads through `ObjectStorage` and returns `{ key, url }`. Clients send the `key` as `photoKey` when creating or updating an entity. Every response exposes `photoUrl = getSignedUrl(photoKey)`, signed fresh on each read, because the adapter only issues expiring signed URLs (`S3_SIGNED_URL_EXPIRES_IN`). Never store URLs. Uploads that are never attached stay in the bucket (acceptable for the MVP).
- The API prefix is `/api/...`. **`docs/api/openapi.json` supersedes the USE_CASES §5 route map** (decided 2026-11-02). Its conventions:
  - Paths use the code's model names: `/subscriptions` = PRD "Pesanan", `/orders` = slots. Role areas are `/kitchen/*`, `/courier/*` and `/admin/*`; the signed-in user is `/me/*`; public catalog routes are `/packages`, `/allergies` and `/business`.
  - Each operation lists its allowed roles in `x-roles`.
  - Status codes: 409 for uniqueness or "still referenced" conflicts; **422 `INVALID_STATE`** for business-rule or state violations (cut-off passed, wrong slot status, unavailable package); 404 also for other users' resources.
  - Checkout (`POST /subscriptions`, with `/subscriptions/preview` for the dry run) takes `menuScheduleIds` for `Harian`, or `periodStart` + `deliveryTimes` for `Mingguan`/`Bulanan`.
  - An invalid promo code never fails the request; it comes back in `preview.promo.reason`.
  - Bulk endpoints (`/admin/courier-assignments`, `/admin/menu-schedules/publish`, `/kitchen/food-ready`) accept explicit ids **or** a group (date + meal time, package + date range, schedule). The data is still written per row.
  - Realtime is one SSE stream, `GET /api/realtime/stream`, with events `slot.status`, `slot.obstacle`, `slot.menu`, `notification` and `announcement`. Because `EventSource` can't send headers, it also accepts `?accessToken=`.

### TypeScript & style

- ESM with `nodenext`: relative imports **must end in `.js`**. Use `import type` for type-only imports (`verbatimModuleSyntax`).
- `exactOptionalPropertyTypes` is on, so optional props are written `foo?: T | undefined`. Build conditional objects with `...(x !== undefined ? { x } : {})`. `noUncheckedIndexedAccess` is on.
- Interface fields are `readonly`. Prefer `interface` for shapes and Zod for runtime validation of anything external (env, request, LLM output, decoded tokens).
- Prettier: 4 spaces, 120 cols, double quotes, semicolons, trailing commas, `arrowParens: "avoid"`. Organize imports on save.
- Doc comments (`/** … */`) go on port methods and exported middleware. Otherwise keep comments sparse and explain *why*.

### Database (Prisma 8, contract-first)

- This is **Prisma 8 (`@prisma/orm-postgres`)**, not `@prisma/client`/`schema.prisma`. Read `backend/.claude/skills/prisma-8/SKILL.md` and its references before any DB work; training-data Prisma knowledge is wrong here.
- Source of truth: `src/infrastructure/database/prisma/contract.prisma` → `npm run contract:emit` regenerates `contract.json`/`contract.d.ts` (do not hand-edit, and don't format them). Migrations live in `.../prisma/migrations/app/<YYYYMMDDTHHMM>_<name>/`.
- Queries: `db.orm.public.<Model>.create(...)`, `.where({...}).update(...)`. `Db` comes from `infrastructure/database/prisma/db.ts`.
- Repositories implement a port: the module's `<module>.repository.ts` for domain modules, `shared/ports/<x>-repository/` for infra (`JobRunRepository`). Domain-module adapters live **inside the module** (`src/modules/<module>/repository/prisma/`, class file + one file per method). Infra repositories stay in `infrastructure/database/prisma/<x>-repository.ts`. Both are named `Prisma<X>Repository`, map rows with `to<X>Record`, and wrap failures in `<X>RepositoryFailureError(operation, cause)` (rethrow NotFound errors as-is).
- Schema conventions: ids `VarChar(36) @id @onCreate(uuid())`, camelCase fields with `@map("snake_case")`, singular `@@map("table")`, money `Numeric(12, 2)`, coordinates `Numeric(10,8)`/`Numeric(11,8)`. Derived labels (`Akan Datang`/`Aktif`/`Selesai`, fees) are computed, never stored. **Mutable entities carry `createdAt` + `updatedAt`** (`@onUpdate(now())`, decided 2026-11-02). Link tables and append-only logs (`OrderStatusHistory`, `DeliveryObstacle`, `JobRun`) have no `updatedAt`. **Photo columns are `photoKey`** (object-storage key, e.g. `menus/2026/11/<uuid>.webp`), never URLs.

### Worker / scheduled jobs

- `src/worker.ts` runs BullMQ on queue `scheduled-checks`. To add a recurring job: add a definition in `register-schedules.ts`, add a handler-map entry in `handlers.ts`, and put the logic in a use case. **Handlers contain no DB queries or business rules.** Each run is tracked through `JobRunRepository`. The cron timezone is `SCHEDULER_TIMEZONE` (`Asia/Jakarta`).

### Testing (Vitest)

- Tests are colocated next to source. `*.test.ts` are unit tests (mock deps with `vi`, `describe("<Class> (unit)")`). `*.integration.test.ts` hit real services: Supertest against a real Express app, docker-compose Postgres/Redis/SeaweedFS, and real Qwen/Midtrans sandbox keys from `.env`.
- Commands (from `backend/`): `npm run test:run` (unit), `npm run test:integration`, `npm run coverage`. Start services with `docker compose up -d`.
- Reuse helpers: `tests/utils/factory/jwt/` (`createAuthHeaders`, `createTokenProvider`, expired tokens…) and `tests/utils/mocks/express.ts` (`createMockRequest/Response/Next`; `req.query` is a getter, as in Express 5).
- Every new port/adapter/middleware ships with unit tests. Add integration tests when it touches I/O.

### Git

- Conventional Commits: `type(scope): summary` (types `feat`, `fix`, `refactor`, `chore`, `test`, `docs`). Scope is the port/module name (`payment-gateway`, `inventory`, `auth`). Feature branches are `feat/<scope>`, merged via PR.

## Domain Quick Reference

- **Roles:** Customer, Admin (owner), Kitchen, Courier. One `/login` page with role-based redirect. **Stored values** (decided 2026-11-02): `CUSTOMER`, `ADMIN`, `KITCHEN`, `COURIER` (UPPER_SNAKE, case-sensitive). Use `ROLES`/`Role`/`isRole` from `src/shared/auth/roles.ts`. The token port, the JWT adapter (`z.enum(ROLES)`, so unknown roles are rejected) and `authorize(...roles: Role[])` are all typed with it. Tests use only these four.
- **Terminology trap:** in the PRD, **"Pesanan"/order means the `Subscription` entity** (it carries `Pending`/`Success`/`Expire`/`Dibatalkan`), while **"Slot" is the `Order` model**. "Jadwal Menu"/`MenuSchedule` (UML) is the `Schedule` model. So rules worded "pesanan …" (BR-13, BR-21, BR-22) apply to `subscription`, not to the `order` table.
- **Slot = 1 `Order` row = 1 portion = 1 delivery**, unique `(subscriptionId, menuScheduleId)`. Delivery vs pickup is stored once on `subscription.isDelivery` and applies to every slot (BR-13).
- **Allergy note & skip reason** (decided 2026-11-02): `user.allergyNote` holds free-text allergies outside the list (UC-41). It can't be matched to menu tags, so **any customer with a non-empty note has all their slots shown in the kitchen's special category** (UC-39), alongside notes and tag clashes. `order.skipReason` is optional and only set when status becomes `Dilewati` (UC-44). "Skip Hari Ini" writes the same reason to each skipped slot.
- **Churn follow-up templates** (decided 2026-11-02): admin-written templates live in `MessageTemplate` (`name`, `body`). Placeholders are a **fixed map in code**: `MESSAGE_PLACEHOLDERS` in `src/shared/utils/message-template/` (`name` → `{nama}`, `lastPackage` → `{paket_terakhir}`, `endDate` → `{tanggal_berakhir}`, `daysSinceLastOrder` → `{lama_tidak_memesan}`, `promoCode` → `{kode_promo}`). Call `generateMessage(template.body, { name, promoCode, … })`, then URL-encode the result into `https://wa.me/<62…>?text=…`. To add a placeholder, add it to that map, never to the database.
- **Courier assignment** (decided 2026-11-02): the admin assigns a courier **per slot** via `order.courierId`. There are no shift tables. A courier's to-do list (UC-30) is their slots where `courierId = me`, `subscription.isDelivery`, and status `Diantar` (or earlier, for the day's list). The admin UI may bulk-assign, but the data stays per slot.
- **Registration & identity** (decided 2026-11-02): only `phone` + password are required (UC-01). Normalize `phone` to digits starting with `62` (`0812…`/`+62812…` → `62812…`) before saving or looking it up. `email` is optional (`String?`, unique), stored trimmed and lowercased. When no name is given, set `name = phone`, so `User.name` and the token's `sub.name` are never empty. Login accepts phone or email (UC-13).
- **Order period** (decided 2026-11-02): `package.periods` (`String[]`) lists the periods a package offers (`"Harian"` | `"Mingguan"` | `"Bulanan"`, at least one), and `subscription.period` is the customer's choice, which must be in that list. There is no `durationDays` on packages. Order length = `subscription.startDate`/`endDate` (first and last slot date, for every period). The package sales window = `package.startAt`/`endAt`.
- **Changing the delivery method** (decided 2026-11-02, follows the official PRD): the **MVP has no in-app switch**. The customer cancels before cut-off (manual refund, UC-43) and re-orders (BR-13, UC-08 point 8). Post-release (§7.5): delivery → pick-up **refunds** the delivery fee for the remaining slots, and pick-up → delivery pays the extra fee as a `payment.type = "DELIVERY_SERVICE_UPGRADE"` payment. That value is reserved, and the MVP only creates `"SUBSCRIPTION"`. Building it then will need per-slot method history again (see the issue-13 discussion).
- **Online/Offline & payment method** (decided 2026-11-02): `subscription.purchaseType` is `"Online"` (gateway only, never cash) or `"Offline"` (gateway or cash), set once at checkout (UC-03). `payment.method` is `"CASH"`, `"MIDTRANS"` (channel not chosen yet), or `"MIDTRANS_<PAYMENT_TYPE>"` once the webhook reports it. There is **no `doneOnline` column**. API responses for payments must include a derived `doneOnline = method !== "CASH"`.
- **Each order has its own recipient and delivery point** (decided 2026-11-02). At checkout, save `recipientName` (always), and `deliveryAddress`, `deliveryLatitude`/`deliveryLongitude` and `deliveryDistanceKm` (required when `isDelivery`) on `Subscription`. `User.address`/`latitude`/`longitude` only **prefill** the checkout form and are never written by checkout. Courier contact uses `user.phone`.
- **Meal times (decided 2026-11-02):** the admin types each package's meal times into `Package.deliveryTimes` (`Time[]`, minute precision). There is no meal-time table. A slot is package + date + meal time: `Schedule.deliveryTime`, unique on `(packageId, date, deliveryTime)` (BR-07). The app must check that the time is in the package's list, and refuse to remove a time that slots of active orders still use (UC-20). One subscription can span several meal times (UC-06, UC-09).
- **Meal-time range label is derived, never stored:** use `toMealTimeView(time)` from `src/shared/utils/meal-time/`, which returns `{ time: "07:00", range: "Pagi" }`. The ranges are Pagi 00:00–10:59, Siang 11:00–15:59, Malam 16:00–23:59. It accepts `"HH:mm[:ss]"` strings or `Temporal.PlainTime`, which is what Prisma returns for `Time` columns (Node ≥ 26.8.2 has `Temporal` built in; the project runs 26.12).
- **Status values (decided 2026-11-02): Indonesian/PRD naming, stored verbatim and case-sensitive.** Never use the English variants (`SCHEDULED`, `PENDING`, `ACTIVE`, …) for domain statuses. Infra-only statuses such as `JobRun` (`RUNNING`/`SUCCESS`/`FAILED`) are unaffected.
  | Column | Allowed values |
  | :--- | :--- |
  | `subscription.status` | `Pending`, `Success`, `Expire`, `Dibatalkan` |
  | `payment.status` | `Pending`, `Success`, `Expire`, `Refund` |
  | `order.status` (slot) | `Terjadwal`, `Disiapkan`, `Diantar`, `Siap Diambil` (with a space), `Selesai`, `Dilewati` |

  Other enumerated columns (UPPER_SNAKE, decided 2026-11-02): `payment.type` = `SUBSCRIPTION` | `DELIVERY_SERVICE_UPGRADE`; `announcement.scope` = `GLOBAL` | `PACKAGE` | `SCHEDULE`.
- **Subscription lifecycle:** Pending payments expire after 15 min through the worker (BR-20). Only `Success` counts for ToCook, courier lists, revenue, and churn (BR-22). The display labels `Akan Datang`/`Aktif`/`Selesai` are derived from dates.
- **Schedule publication:** `Schedule` (called `MenuSchedule` in UML; FK `order.menuScheduleId`) has **no status column**. Visibility is only `isPublished` (decided 2026-11-02).
- **Slot status flow (BR-23), forward-only:** delivery `Terjadwal → Disiapkan → Diantar → Selesai`; pickup `Terjadwal → Disiapkan → Siap Diambil → Selesai`; skip → `Dilewati` (allowed before food-ready, no refund). Courier obstacles are timestamped **notes + notification, not a status**. Every slot status change must record the actor's `userId` and a timestamp (PRD §9.4).
- **Menus:** 1 primary + at most 1 alternative per schedule (`ScheduleMenu.isPrimary`). `@@unique([scheduleId, isPrimary])` enforces the "at most"; the app must verify a primary exists before setting `schedule.isPublished = true`. `Menu.tags` is `String[]` (Postgres `text[]`, no NULL elements). Allergens are inherited from ingredients (union). A clash warns at checkout but never blocks. The kitchen assigns alternatives manually by setting `order.usesAlternativeMenu = true`. A slot's menu is the schedule's `ScheduleMenu` with `isPrimary = !usesAlternativeMenu`, and ToCook counts primary and alternative portions separately.
- **Loyalty tier = `user.membership`** (decided 2026-11-02): `Membership` is 0..1 per user (`userId` unique) with `tierId`, `startedAt`, `expiresAt = startedAt + tier.durationDays`. Apply the tier discount only while `expiresAt > now`. Re-evaluation updates the row in place (no history), and there is no `User.tierId`.
- **Deleting a tier** (UC-38, decided 2026-11-02): `Membership.tier` blocks deletion while members exist. In one transaction: move its members to the **previous tier** (the highest `requiredSubscriptionDays` below it, which is unique), **keeping `startedAt`/`expiresAt`**. If there's no lower tier, delete those memberships. Then delete the tier. Subscriptions that used it get `tierId = null` and keep `tierDiscount`. Validate UC-36: `requiredSubscriptionDays ≥ 0`, `durationDays > 0`, `0 ≤ discountPercent ≤ 100`.
- **Business (singleton):** exactly one `business` row holds the kitchen location, delivery defaults, `paymentTimeoutMinutes` (BR-20) and `whatsappNumber` (the business contact number, kept for future features; churn `wa.me` links use the customer's number). Read it, don't hardcode these values. The admin `/api/admin/settings` endpoint (USE_CASES §5) edits this row. Tenant scoping (`business_id` everywhere) is **deferred past the MVP** (decided 2026-11-02); don't add `businessId` columns.
- **Packages:** a package is **active** (derived, never stored) when `isActive && startAt ≤ now && (endAt == null || now < endAt)` (BR-03, UC-22). `isActive` is the admin's reversible manual switch, and `endAt = null` means no expiry. Only active packages appear to customers and accept new orders. Running `Success` orders on an inactive package are still served (kitchen, courier, slots ignore it).
- **Promo codes:** `discountType` is `"Persen"` | `"Nominal"`, and `discountValue` is a percent or Rp accordingly. Enforce `minPurchase` against the food subtotal before discounts. Also check `quota`, `validUntil` and `isActive`.
- **Cancellation & refunds:** cancelling a `Success` subscription sets `status = "Dibatalkan"` and `needsRefund = true`. The admin refunds outside the app, then confirms (`POST /api/admin/payments/:id/confirm-refund`), which sets that payment's `status = "Refund"` and the subscription's `needsRefund = false` in one transaction.
- **Slot audit & obstacles:** every `order.status` change **must** insert an `order_status_history` row in the same transaction (`changedById = null` for system/worker changes). **Admin corrections** (UC-27, forward-only) must carry a reason in `adminNote` (decided 2026-11-02); the API body field is also `adminNote`. Normal flow changes leave it `null`. Courier/admin obstacle notes go in `delivery_obstacle` and trigger a customer-level notification; the status never changes.
- **Notifications (BR-27):** customer-level goes to `Notification.userId`; package/global/schedule go to `Announcement.scope` (`PACKAGE` with `packageId`, `GLOBAL`, or `SCHEDULE` with `menuScheduleId` for a single service day, e.g. a BR-26 menu change). Delivered through SSE.
- **Backend is the source of truth** for prices, discounts, fees, cut-offs, and status transitions. Historical orders keep their prices when master data changes.

## Open Decisions / Known Inconsistencies

Resolve with the user before relying on any of these. Once one is settled, record the answer here and delete the item.

1. **Gateway → stored payment status mapping.** The `PaymentGateway` port normalizes Midtrans to `PAID/PENDING/CHALLENGE/FAILED/EXPIRED/CANCELED/REFUNDED` (gateway vocabulary, deliberately kept). The obvious mappings are `PAID → Success`, `PENDING → Pending` and `EXPIRED → Expire`. `CHALLENGE`, `FAILED`, `CANCELED` and `REFUNDED` are undecided, so ask before implementing the webhook use case.
2. **Timestamps** (not yet discussed): `Timestamp` columns have no timezone (the cut-off is in Asia/Jakarta), and `JobRun` uses `TimestamptzJsDate` while domain tables use Temporal types.
3. **Waiting on the PM:** refund flow and receipt OCR are being revised (so the `"Refund"` payment status and the receipt-extractor port may change). Promo-code reuse per customer is still open (official PRD §14.3).
4. **Should-haves deferred until their feature is built:** stock change log with who changed it (UC-40), menu components and cook assignments (UC-34), per-user read status for package/global announcements (UC-42).
