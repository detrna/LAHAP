# LAHAP — SME Catering Subscription & Fulfillment Platform

> **Accelerating Digital Transformation for Business and SMEs**
> **Team:** Dzamili
> **Scope:** Catering Subscription & Operations Management Platform (Multi-Tenant Ready Architecture)

### 🔑 Demo Accounts for Evaluation / Judges

All demo accounts share the default password: **`password123`**

| Role           | Name          | Phone (Login)   | Email (Login)      | Context & Test Scenarios                                                                                                                |
| :------------- | :------------ | :-------------- | :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **`ADMIN`**    | Admin Lahap   | `6281100000001` | `admin@lahap.test` | Full backoffice: manage packages, menus, ingredients, courier assignment, cash verification, churn retention, and income reports.       |
| **`KITCHEN`**  | Dapur Lahap   | `6281100000002` | `dapur@lahap.test` | Kitchen mobile view: view daily _ToCook_ portions, manage allergen clashes & alternative menus, trigger "Food Ready", and update stock. |
| **`COURIER`**  | Joko Kurir    | `6281100000003` | `joko@lahap.test`  | Courier mobile view: view daily delivery routes, navigate to customer pin locations, log delivery obstacle notes, mark slots completed. |
| **`COURIER`**  | Eko Kurir     | `6281100000004` | `eko@lahap.test`   | Secondary courier for multi-courier assignment testing.                                                                                 |
| **`CUSTOMER`** | Rina Putri    | `6281200000001` | `rina@lahap.test`  | Customer portal: active subscription, peanut allergy (`kacang`), Malang address with delivery coordinates.                              |
| **`CUSTOMER`** | Andi Wijaya   | `6281200000002` | `andi@lahap.test`  | Customer portal: seafood allergy (`seafood`) + special taste note (_"Tidak bisa makan terong"_).                                        |
| **`CUSTOMER`** | Bagus Santoso | `6281200000004` | `bagus@lahap.test` | Customer portal: Batu address, customer history for churn / retention testing.                                                          |
| **`CUSTOMER`** | Dewi Lestari  | `6281200000003` | _(phone only)_     | Customer portal: phone-only login account without email.                                                                                |

---

## 1. Executive Summary & Product Overview

**LAHAP** is an end-to-end digital platform designed for micro, small, and medium catering enterprises (SMEs / _UMKM katering rumahan_) to manage daily, weekly, and monthly meal subscription services.

Traditional small-scale catering businesses typically rely on fragmented and manual workflows: unorganized order discussions via WhatsApp chats, manual bank transfer reconciliation, guesswork on cooking quantities leading to food waste, handwritten allergy notes, and untracked customer churn.

LAHAP transforms these manual operations into a unified, digital, self-service ecosystem:

1. **Self-Service Customer Ordering:** Customers browse published menus, choose subscription packages, select meal delivery windows and service days, choose fulfillment methods (Delivery vs. Pick-Up), and pay securely via online payment gateway (Midtrans Snap) or directly via offline cash.
2. **Operational To-Do Lists:** Kitchen and courier staff access mobile-first task interfaces. Kitchen staff monitor portion counts, handle allergen clashes, assign alternative menus, and mark food preparation status. Couriers follow daily delivery routes with customer address coordinates and report delivery obstacles in real time.
3. **Rule-Based & AI-Assisted Automations:**
    - **Daily Production (_ToCook_) Forecasting:** Computes required cooking portions and recipe ingredient quantities on demand from active `Success` orders.
    - **Ingredient Shortage & Shopping List:** Detects ingredient shortages against scheduled recipes and calculates required restocking.
    - **AI Stock Level Estimation:** Enables kitchen staff to estimate physical container stock levels by uploading container photos evaluated by visual AI models.
    - **Deterministic Churn Detection:** Identifies customers who have stopped ordering ($> 14$ days since last subscription) and enables semi-automated WhatsApp (`wa.me`) retention outreach with win-back promo codes.

### Business Model (B2B2C)

- **Layer 1 (B2B / SaaS):** The platform serves catering business owners (`ADMIN`), providing catalog management, kitchen operations, courier routing, retention marketing, and financial income reporting.
- **Layer 2 (B2C / Subscription):** Catering owners offer a self-service ordering and tracking portal to their end consumers (`CUSTOMER`).

---

## 2. Problems Solved

| Problem Statement                           | Conventional Manual Process                                                              | Solution in LAHAP                                                                                                           |
| :------------------------------------------ | :--------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Unstructured Order Tracking**             | Orders scattered across personal chat apps; high risk of missed or incorrect deliveries. | Centralized order database with deterministic slot schedules and auditable status histories.                                |
| **Lack of Self-Service Subscriptions**      | Customers must repeatedly chat to place orders, change delivery days, or skip meals.     | Self-service customer portal with one-click slot skipping and strict cut-off validation.                                    |
| **Fragmented Stock & Cooking Calculations** | Cooking quantities calculated by intuition; causes food shortage or severe food waste.   | On-demand _ToCook_ production aggregation and weekly ingredient shopping lists.                                             |
| **Accidental Allergen Exposure**            | Dietary restrictions written in unstructured notes; easy to overlook in busy kitchens.   | Automatic allergen inheritance from ingredients to menus with allergen clash warnings and dedicated kitchen allergy alerts. |
| **Distribution & Delivery Bottlenecks**     | Owner acts as sole dispatcher between customers and couriers; no live delivery tracking. | Couriers manage dedicated daily delivery lists with GPS coordinates, obstacle notes, and live status updates.               |
| **Silent Customer Churn**                   | No visibility into former customers who stopped ordering.                                | Automatic churn list flagging customers inactive for $> 14$ days with pre-filled WhatsApp win-back templates.               |

---

## 3. User Roles & Access Portals

All users sign in through a unified login endpoint (`/login`) using phone number/email and password, automatically redirecting them to their respective interface:

| Role           | Target Actor                                 | Device / Interface   | Responsibilities & Capabilities                                                                                                                                                                                                |
| :------------- | :------------------------------------------- | :------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`CUSTOMER`** | End Consumers (students, workers, families)  | Mobile Web / Browser | Browse published schedules, order subscriptions (online or offline), select delivery vs. pick-up, pin GPS coordinates, track live meal status via SSE, skip upcoming slots before preparation, and maintain allergy profiles.  |
| **`ADMIN`**    | Catering Business Owner / Operations Manager | Desktop / Tablet Web | Manage subscription packages, schedules, menus, ingredients, and membership tiers; verify offline cash payments; assign couriers; monitor _ToCook_ daily reports; track churned customers; send broadcast announcements.       |
| **`KITCHEN`**  | Kitchen Cooking Staff                        | Mobile Web           | View daily _ToCook_ portion counts, inspect special dietary and allergen requirements, assign alternative menus for clashing allergies, trigger "Food Ready", and update physical ingredient stock (with AI photo estimation). |
| **`COURIER`**  | Delivery Drivers                             | Mobile Web           | View assigned delivery slots grouped by date and meal time, access customer delivery pins, log transit obstacle notes (e.g. flat tire, heavy rain), and mark deliveries completed.                                             |

---

## 4. Key Domain Concepts & Business Rules

### Core Entities & Lifecycles

- **Subscription Plan (Paket):** Base product defining price per portion, allowed durations (Daily, Weekly, Monthly), meal times (`delivery_time`, e.g. Breakfast 07:00, Lunch 12:00, Dinner 18:30), active date ranges, and optional custom delivery fee rules.
- **Slot:** The fundamental unit of fulfillment:
  $$\mathbf{1\text{ Slot}} = \mathbf{1\text{ Portion}} = \mathbf{1\text{ Delivery}}$$
  Each slot represents a specific combination of **$\text{Date} + \text{Meal Time}$** within a subscription.
- **Order & Slot Cut-Off (BR-09):** Customers may place new subscriptions or cancel existing ones until **23:59:59 the day before the first service day** (Asia/Jakarta).
- **Slot Skipping (BR-11):** Customers may skip any scheduled slot before the kitchen marks it ready. In accordance with catering operational economics, skipped slots are **non-refundable** and do not refund delivery fees.
- **Slot Lifecycle State Machine (BR-23):** Status transitions move forward deterministically:
    - **Delivery:** `Terjadwal` $\rightarrow$ `Disiapkan` $\rightarrow$ `Diantar` $\rightarrow$ `Selesai`
    - **Pick-Up:** `Terjadwal` $\rightarrow$ `Disiapkan` $\rightarrow$ `Siap Diambil` $\rightarrow$ `Selesai`
    - **Skipped:** `Dilewati` (available prior to preparation)

### Pricing, Discounts & Delivery Fees

- **Flat Pricing (BR-02):** Price per portion is flat per package; menus and alternative menus do not alter the base portion price.
- **Haversine Distance Delivery Fee (BR-14, BR-15):** Straight-line distance from kitchen to customer pin coordinates:
  $$\text{km} = \lceil\text{getDistanceInKm}(\text{kitchen}, \text{customer})\rceil$$
  $$\text{FeePerSlot} = \begin{cases} 0, & \text{if } \text{km} \le \text{freeRadius} \\ (\text{km} - \text{freeRadius}) \times \text{pricePerKm}, & \text{if } \text{km} > \text{freeRadius} \end{cases}$$
  If distance exceeds `maxDistance`, delivery is hidden and the order defaults to Pick-Up.
- **Discounts & Stacking (BR-17, BR-18):**
    - **Loyalty Tier Discount:** Based on accumulated paid subscription days.
    - **Promo Codes:** Percentage or fixed amount discounts with validity periods and quotas.
    - Tier discounts are applied first to the food subtotal, followed by promo codes. If `allowStackWithTier = false`, only $\max(\text{tierDiscount}, \text{promoDiscount})$ applies. Delivery fees are **never** discounted.

### Allergens & Production Forecasting

- **Allergen Clash Detection:** Menus inherit allergen tags from their ingredient recipes. If a customer's registered allergies clash with a scheduled menu:
  $$\text{IsClash} = (\text{UserAllergies} \cap \text{MenuAllergenTags}) \ne \emptyset$$
  The customer is alerted during checkout, and the kitchen's _ToCook_ board highlights the order under a **Kategori Khusus (Special Category)** tab for manual alternative menu allocation.
- **Production Formulation (ToCook):**
  $$\text{TotalPortions}(P, M, D, W) = \sum [\text{order.slot} \mid \text{Success} \land \neg\text{Skipped}]$$
  $$\text{IngredientRequirement}(B, D, W) = \sum_M (\text{TotalPortions}(M) \times \text{QuantityPerPortion}(B, M))$$

---

## 5. Scope & MVP Boundaries

To deliver a reliable, robust system tailored for small businesses:

1. **Fixed Daily Menus:** Each slot offers 1 fixed main dish and up to 1 optional alternative dish for allergen accommodations (not an arbitrary à la carte restaurant ordering system).
2. **Lightweight Mobile Interfaces:** Kitchen and courier portals use responsive web views rather than standalone native app installations.
3. **No Expensive Map APIs:** Pin locations and distances use Leaflet / OpenStreetMap coordinates with deterministic Haversine distance calculations.
4. **Semi-Manual WhatsApp Outreach:** Churn retention and win-back campaigns generate structured `https://wa.me/` deep links with pre-filled message copy and promo codes, avoiding costly external WhatsApp Business API tiers.
5. **Real-time In-App Updates via SSE:** Live status updates (food ready, courier transit, obstacle alerts) are transmitted via Server-Sent Events (SSE) directly in the browser.

---

## 6. Repository Layout

```text
.
├── backend/                    # Express 5 + TypeScript ESM REST API & BullMQ Worker
│   ├── src/                    # Ports & Adapters architecture (14 domain modules)
│   ├── prisma.config.ts        # Prisma ORM 8 configuration
│   └── README.md               # Detailed backend documentation, setup guide & seeded accounts
├── frontend/                   # Frontend client workspace (Next.js App Router)
├── docs/
│   ├── api/
│   │   └── openapi.json        # Complete OpenAPI 3.1 contract (118 endpoints, 122 schemas)
│   └── design/
│       ├── PRD.md              # Product Requirements Document & Business Rules
│       ├── ERD.md              # Entity Relationship Diagram & Database Specifications
│       ├── USE_CASES.md        # Comprehensive Use Case Specifications
│       ├── UML.md              # Class & Architecture UML Diagrams
│       └── SITEMAP.md          # User Journey & Interface Sitemap
└── AGENTS.md                   # Architectural memory & development guidelines
```

---

## 7. Getting Started

For detailed installation instructions, environment configuration, database migration, demo seeding, and test suites, please refer to the backend documentation:

👉 **[Backend Documentation & Setup Guide](backend/README.md)**

### Quick Start Summary

1. Ensure **PostgreSQL**, **Redis**, and an **S3-compatible storage** service (e.g. SeaweedFS or MinIO) are running.
2. Navigate to `backend/`, copy `.env.example` to `.env`, and install dependencies:
    ```bash
    cd backend
    npm install
    cp .env.example .env
    ```
3. Generate the Prisma database contract and seed demo data:
    ```bash
    npm run contract:emit
    npx prisma migrate deploy
    npm run db:seed
    ```
4. Start development servers:

    ```bash
    # API Server (http://localhost:4000)
    npm run dev

    # Background Worker & Scheduler
    npm run dev:worker
    ```

Demo credentials and seeded user profiles (`ADMIN`, `KITCHEN`, `COURIER`, `CUSTOMER`) can be found in [Backend Seeded User Accounts](backend/README.md#seeded-user-accounts).
