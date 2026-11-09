import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import { FilesService } from "../../../../src/modules/files/service/files.service.js";
import type { OrderStats } from "../../../../src/modules/tiers/service/interfaces/order-stats.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import type { ObjectStorage } from "../../../../src/shared/ports/object-storage/object-storage.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createTiersContainer } from "../../../utils/app/tiers-container.js";
import { createAuthHeaders } from "../../../utils/factory/jwt/jwt.js";
import { createTestUser } from "../../../utils/fixtures/users.js";

const objectStorage = {
    exists: async (key: string) => !key.includes("missing"),
    getSignedUrl: async (key: string) => `https://storage.test/${key}`,
} as unknown as ObjectStorage;

const asRole = (role: Role, userId: string = randomUUID()) =>
    createAuthHeaders({ role, sub: { userId, name: `E2E ${role}` } });

const PHOTO = "tiers/2026/11/e2e.webp";
const BASE_DAYS = 700000000;

interface TierBody {
    readonly id: string;
    readonly name: string;
    readonly description: string | null;
    readonly requiredSubscriptionDays: number;
    readonly durationDays: number;
    readonly discountPercent: number;
    readonly photoKey: string | null;
    readonly photoUrl: string | null;
    readonly memberCount: number;
    readonly totalDiscountGiven: number;
}

interface OverviewBody {
    readonly membership: { readonly tierId: string; readonly isActive: boolean } | null;
    readonly subscriptionDays: number;
    readonly daysRemaining: number | null;
    readonly nextTier: { readonly id: string } | null;
    readonly daysToNextTier: number | null;
}

describe("tiers routes (e2e)", () => {
    let db: Db;
    let rows: CreatedRows;
    let testApp: TestApp;
    let app: Express;
    let paidDays = 0;
    let discounts = new Map<string, number>();
    const tag = randomUUID().slice(0, 8);

    const admin = () => asRole("ADMIN");

    const orderStats: OrderStats = {
        countPaidServiceDays: async () => paidDays,
        sumTierDiscounts: async tierIds =>
            new Map(tierIds.flatMap(id => (discounts.has(id) ? [[id, discounts.get(id) ?? 0] as const] : []))),
    };

    async function createTier(offset: number, overrides: Record<string, unknown> = {}): Promise<TierBody> {
        const response = await request(app)
            .post("/api/admin/tiers")
            .set(admin())
            .send({
                name: `Zz E2E ${tag} ${offset}`,
                requiredSubscriptionDays: BASE_DAYS + offset,
                discountPercent: 5,
                ...overrides,
            });
        expect(response.status).toBe(201);
        const created = response.body.data as TierBody;
        rows.track("Tier", created.id);
        return created;
    }

    async function createMembership(userId: string, tierId: string, startedAt: Temporal.PlainDateTime, days = 30) {
        const membership = await db.orm.public.Membership.create({
            userId,
            tierId,
            startedAt,
            expiresAt: startedAt.add({ days }),
        });
        rows.track("Membership", membership.id);
    }

    const daysAgo = (days: number) => Temporal.Now.plainDateTimeISO("UTC").subtract({ days });

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        testApp = await createTestApp({
            db,
            adapters: { objectStorage },
            mount: deps => [
                createTiersContainer(deps, {
                    photoKeys: new FilesService(objectStorage, deps.adapters.clock),
                    orderStats,
                }).router,
            ],
        });
        app = testApp.app;
    });

    afterAll(async () => {
        await rows?.cleanup();
        await testApp?.close();
        await db?.close();
    });

    describe("access", () => {
        const id = randomUUID();

        it.each([
            ["get", "/api/admin/tiers"],
            ["post", "/api/admin/tiers"],
            ["get", `/api/admin/tiers/${id}`],
            ["patch", `/api/admin/tiers/${id}`],
            ["delete", `/api/admin/tiers/${id}`],
            ["get", "/api/me/membership"],
        ] as const)("answers 401 to %s %s without a token", async (method, path) => {
            expect((await request(app)[method](path)).status).toBe(401);
        });

        it.each(["CUSTOMER", "KITCHEN", "COURIER"] as const)("answers 403 to a %s on the admin routes", async role => {
            expect((await request(app).get("/api/admin/tiers").set(asRole(role))).status).toBe(403);
            expect((await request(app).post("/api/admin/tiers").set(asRole(role)).send({})).status).toBe(403);
            expect((await request(app).get(`/api/admin/tiers/${id}`).set(asRole(role))).status).toBe(403);
            expect((await request(app).patch(`/api/admin/tiers/${id}`).set(asRole(role)).send({})).status).toBe(403);
            expect((await request(app).delete(`/api/admin/tiers/${id}`).set(asRole(role))).status).toBe(403);
        });

        it.each(["ADMIN", "KITCHEN", "COURIER"] as const)("answers 403 to a %s on /me/membership", async role => {
            expect((await request(app).get("/api/me/membership").set(asRole(role))).status).toBe(403);
        });
    });

    describe("admin CRUD", () => {
        it("creates a tier with defaults and a signed badge, then reads it back", async () => {
            const created = await createTier(1, { photoKey: PHOTO, description: "Gold-ish" });

            expect(created).toMatchObject({
                name: `Zz E2E ${tag} 1`,
                description: "Gold-ish",
                requiredSubscriptionDays: BASE_DAYS + 1,
                durationDays: 30,
                discountPercent: 5,
                photoKey: PHOTO,
                photoUrl: `https://storage.test/${PHOTO}`,
                memberCount: 0,
                totalDiscountGiven: 0,
            });
            const read = await request(app).get(`/api/admin/tiers/${created.id}`).set(admin());
            expect(read.status).toBe(200);
            expect(read.body.data).toEqual(created);
        });

        it("lists tiers sorted by threshold with a page meta", async () => {
            const high = await createTier(3);
            const low = await createTier(2);

            const response = await request(app).get("/api/admin/tiers?limit=100").set(admin());

            expect(response.status).toBe(200);
            const items = response.body.data as TierBody[];
            const ids = items.map(item => item.id);
            expect(ids.indexOf(low.id)).toBeGreaterThanOrEqual(0);
            expect(ids.indexOf(low.id)).toBeLessThan(ids.indexOf(high.id));
            expect(items.map(item => item.requiredSubscriptionDays)).toEqual(
                [...items.map(item => item.requiredSubscriptionDays)].sort((a, b) => a - b),
            );
            expect(response.body.meta).toMatchObject({ page: 1, limit: 100 });
        });

        it("updates only the given fields and can clear the badge and description", async () => {
            const created = await createTier(4, { photoKey: PHOTO, description: "x" });

            const response = await request(app)
                .patch(`/api/admin/tiers/${created.id}`)
                .set(admin())
                .send({ discountPercent: 12.345, photoKey: null, description: null });

            expect(response.status).toBe(200);
            expect(response.body.data).toMatchObject({
                id: created.id,
                name: created.name,
                discountPercent: 12.35,
                photoKey: null,
                photoUrl: null,
                description: null,
                durationDays: 30,
            });
        });

        it("answers 409 for a duplicate name or threshold on create and update", async () => {
            const first = await createTier(5);
            const second = await createTier(6);

            const sameName = await request(app)
                .post("/api/admin/tiers")
                .set(admin())
                .send({ name: first.name, requiredSubscriptionDays: BASE_DAYS + 7, discountPercent: 1 });
            const sameDays = await request(app)
                .post("/api/admin/tiers")
                .set(admin())
                .send({
                    name: `Zz E2E ${tag} dup`,
                    requiredSubscriptionDays: first.requiredSubscriptionDays,
                    discountPercent: 1,
                });
            const renamed = await request(app)
                .patch(`/api/admin/tiers/${second.id}`)
                .set(admin())
                .send({ name: first.name });
            const moved = await request(app)
                .patch(`/api/admin/tiers/${second.id}`)
                .set(admin())
                .send({ requiredSubscriptionDays: first.requiredSubscriptionDays });

            expect(sameName.status).toBe(409);
            expect(sameName.body.error).toMatchObject({ code: "CONFLICT", message: "tier name is already used" });
            expect(sameDays.status).toBe(409);
            expect(sameDays.body.error.message).toBe("required subscription days is already used by another tier");
            expect(renamed.status).toBe(409);
            expect(moved.status).toBe(409);
        });

        it("answers 404 for a missing tier on get, update and delete", async () => {
            const id = randomUUID();

            for (const response of [
                await request(app).get(`/api/admin/tiers/${id}`).set(admin()),
                await request(app).patch(`/api/admin/tiers/${id}`).set(admin()).send({ name: "x" }),
                await request(app).delete(`/api/admin/tiers/${id}`).set(admin()),
            ]) {
                expect(response.status).toBe(404);
                expect(response.body.error.code).toBe("TIER_NOT_FOUND");
            }
        });

        it("answers 400 for invalid bodies and ids", async () => {
            const valid = { name: `Zz E2E ${tag} bad`, requiredSubscriptionDays: BASE_DAYS + 8, discountPercent: 5 };

            for (const override of [
                { discountPercent: 101 },
                { durationDays: 0 },
                { durationDays: 3651 },
                { requiredSubscriptionDays: -1 },
                { name: "" },
                { photoKey: "menus/2026/11/a.webp" },
            ]) {
                const response = await request(app)
                    .post("/api/admin/tiers")
                    .set(admin())
                    .send({ ...valid, ...override });
                expect(response.status).toBe(400);
                expect(response.body.error.code).toBe("VALIDATION_ERROR");
            }
            expect((await request(app).patch(`/api/admin/tiers/${randomUUID()}`).set(admin()).send({})).status).toBe(
                400,
            );
            expect((await request(app).get("/api/admin/tiers/not-a-uuid").set(admin())).status).toBe(400);
            expect((await request(app).get("/api/admin/tiers?limit=101").set(admin())).status).toBe(400);
        });

        it("answers 400 with photo_not_found for a photo that isn't in storage", async () => {
            const response = await request(app)
                .post("/api/admin/tiers")
                .set(admin())
                .send({
                    name: `Zz E2E ${tag} photo`,
                    requiredSubscriptionDays: BASE_DAYS + 9,
                    discountPercent: 5,
                    photoKey: "tiers/2026/11/missing.webp",
                });

            expect(response.status).toBe(400);
            expect(response.body.error.issues).toContainEqual(expect.objectContaining({ code: "photo_not_found" }));
        });

        it("shows member counts (active, after stepping down) and the discount total", async () => {
            const lower = await createTier(10, { durationDays: 30 });
            const upper = await createTier(20, { durationDays: 30 });
            const active = await createTestUser(db, rows);
            const lapsed = await createTestUser(db, rows);
            const gone = await createTestUser(db, rows);
            await createMembership(active, upper.id, daysAgo(2));
            await createMembership(lapsed, upper.id, daysAgo(35));
            await createMembership(gone, lower.id, daysAgo(100));
            discounts = new Map([[upper.id, 12500]]);

            const lowerRead = await request(app).get(`/api/admin/tiers/${lower.id}`).set(admin());
            const upperRead = await request(app).get(`/api/admin/tiers/${upper.id}`).set(admin());
            discounts = new Map();

            expect(upperRead.body.data).toMatchObject({ memberCount: 1, totalDiscountGiven: 12500 });
            expect(lowerRead.body.data).toMatchObject({ memberCount: 1, totalDiscountGiven: 0 });
        });
    });

    describe("delete", () => {
        it("moves members to the previous tier keeping their dates, then answers 404", async () => {
            const lower = await createTier(30);
            const upper = await createTier(40);
            const userId = await createTestUser(db, rows);
            const startedAt = daysAgo(3);
            await createMembership(userId, upper.id, startedAt);

            const response = await request(app).delete(`/api/admin/tiers/${upper.id}`).set(admin());

            expect(response.status).toBe(204);
            expect(response.text).toBe("");
            const moved = await db.orm.public.Membership.where({ userId }).first();
            expect(moved).toMatchObject({ tierId: lower.id });
            expect(moved?.startedAt.toString().slice(0, 16)).toBe(startedAt.toString().slice(0, 16));
            expect((await request(app).get(`/api/admin/tiers/${upper.id}`).set(admin())).status).toBe(404);
        });
    });

    describe("GET /tiers", () => {
        it("lists every tier in threshold order without a token and without the admin stats", async () => {
            const upper = await createTier(510, { photoKey: PHOTO, discountPercent: 10 });
            const lower = await createTier(500, { discountPercent: 5 });
            discounts = new Map([[upper.id, 9000]]);

            const response = await request(app).get("/api/tiers");

            expect(response.status).toBe(200);
            expect(response.body.meta).toBeUndefined();
            const tiers = response.body.data as Record<string, unknown>[];
            const thresholds = tiers.map(tier => tier.requiredSubscriptionDays as number);
            expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
            const ours = tiers.filter(tier => tier.id === lower.id || tier.id === upper.id);
            expect(ours.map(tier => tier.id)).toEqual([lower.id, upper.id]);
            expect(ours[0]).toMatchObject({ discountPercent: 5, photoUrl: null });
            expect(ours[1]).toMatchObject({
                discountPercent: 10,
                photoKey: PHOTO,
                photoUrl: `https://storage.test/${PHOTO}`,
            });
            for (const tier of tiers) {
                expect(tier).not.toHaveProperty("memberCount");
                expect(tier).not.toHaveProperty("totalDiscountGiven");
            }
        });

        it.each(["CUSTOMER", "ADMIN", "KITCHEN", "COURIER"] as const)("also answers a signed-in %s", async role => {
            expect((await request(app).get("/api/tiers").set(asRole(role))).status).toBe(200);
        });
    });

    describe("GET /me/membership", () => {
        it("shows no membership and the days paid so far", async () => {
            paidDays = 0;

            const response = await request(app).get("/api/me/membership").set(asRole("CUSTOMER"));

            expect(response.status).toBe(200);
            expect(response.body.data).toMatchObject({
                membership: null,
                subscriptionDays: 0,
                daysRemaining: null,
            });
        });

        it("shows the current tier, days left and the next tier with the days to it", async () => {
            const current = await createTier(100, { discountPercent: 5 });
            const next = await createTier(200, { discountPercent: 10 });
            const userId = await createTestUser(db, rows);
            await createMembership(userId, current.id, daysAgo(2));
            paidDays = BASE_DAYS + 150;

            const response = await request(app).get("/api/me/membership").set(asRole("CUSTOMER", userId));

            expect(response.status).toBe(200);
            const overview = response.body.data as OverviewBody;
            expect(overview.membership).toMatchObject({ tierId: current.id, isActive: true });
            expect(overview.subscriptionDays).toBe(BASE_DAYS + 150);
            expect(overview.daysRemaining).toBeGreaterThanOrEqual(27);
            expect(overview.daysRemaining).toBeLessThanOrEqual(28);
            expect(overview.nextTier?.id).toBe(next.id);
            expect(overview.daysToNextTier).toBe(50);
        });

        it("shows a lapsed higher tier as the tier one level down with a fresh window", async () => {
            const lower = await createTier(300);
            const upper = await createTier(400);
            const userId = await createTestUser(db, rows);
            await createMembership(userId, upper.id, daysAgo(35));
            paidDays = BASE_DAYS + 400;

            const response = await request(app).get("/api/me/membership").set(asRole("CUSTOMER", userId));

            const overview = response.body.data as OverviewBody;
            expect(overview.membership).toMatchObject({ tierId: lower.id, isActive: true });
            expect(overview.daysRemaining).toBeGreaterThanOrEqual(24);
            expect(overview.daysRemaining).toBeLessThanOrEqual(25);
        });
    });
});
