import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import type { PromoUsage } from "../../../../src/modules/promo-codes/service/interfaces/promo-usage.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createPromoCodesContainer } from "../../../utils/app/promo-codes-container.js";
import { createAuthHeaders } from "../../../utils/factory/jwt/jwt.js";

const asRole = (role: Role) => createAuthHeaders({ role, sub: { userId: randomUUID(), name: `E2E ${role}` } });

interface PromoCodeBody {
    readonly id: string;
    readonly code: string;
    readonly discountType: string;
    readonly discountValue: number;
    readonly minPurchase: number;
    readonly allowStackWithTier: boolean;
    readonly validUntil: string;
    readonly quota: number;
    readonly usedCount: number;
    readonly isActive: boolean;
}

describe("promo-codes routes (e2e)", () => {
    let db: Db;
    let rows: CreatedRows;
    let testApp: TestApp;
    let app: Express;
    let uses = new Map<string, number>();
    let pending = new Set<string>();
    const tag = randomUUID().slice(0, 8).toUpperCase();

    const admin = () => asRole("ADMIN");

    const promoUsage: PromoUsage = {
        countPromoUses: async ids =>
            new Map(ids.flatMap(id => (uses.has(id) ? [[id, uses.get(id) ?? 0] as const] : []))),
        countPromoUsesByUser: async () => 0,
        hasPendingSubscriptions: async id => pending.has(id),
    };

    async function createPromoCode(overrides: Record<string, unknown> = {}): Promise<PromoCodeBody> {
        const response = await request(app)
            .post("/api/admin/promo-codes")
            .set(admin())
            .send({
                code: `ZZ${tag}${randomUUID().slice(0, 6).toUpperCase()}`,
                discountType: "Persen",
                discountValue: 10,
                quota: 5,
                ...overrides,
            });
        expect(response.status).toBe(201);
        const created = response.body.data as PromoCodeBody;
        rows.track("PromoCode", created.id);
        return created;
    }

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        testApp = await createTestApp({
            db,
            mount: deps => [createPromoCodesContainer(deps, { promoUsage }).router],
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
            ["get", "/api/admin/promo-codes"],
            ["post", "/api/admin/promo-codes"],
            ["get", `/api/admin/promo-codes/${id}`],
            ["patch", `/api/admin/promo-codes/${id}`],
            ["delete", `/api/admin/promo-codes/${id}`],
        ] as const)("answers 401 to %s %s without a token", async (method, path) => {
            expect((await request(app)[method](path)).status).toBe(401);
        });

        it.each(["CUSTOMER", "KITCHEN", "COURIER"] as const)("answers 403 to a %s", async role => {
            expect((await request(app).get("/api/admin/promo-codes").set(asRole(role))).status).toBe(403);
            expect((await request(app).post("/api/admin/promo-codes").set(asRole(role)).send({})).status).toBe(403);
            expect((await request(app).get(`/api/admin/promo-codes/${id}`).set(asRole(role))).status).toBe(403);
            expect((await request(app).patch(`/api/admin/promo-codes/${id}`).set(asRole(role)).send({})).status).toBe(
                403,
            );
            expect((await request(app).delete(`/api/admin/promo-codes/${id}`).set(asRole(role))).status).toBe(403);
        });
    });

    describe("POST /admin/promo-codes", () => {
        it("creates a code with the defaults and 14 days of validity", async () => {
            const before = Date.now();
            const created = await createPromoCode({ minPurchase: undefined });

            expect(created).toMatchObject({
                discountType: "Persen",
                discountValue: 10,
                minPurchase: 0,
                allowStackWithTier: true,
                quota: 5,
                usedCount: 0,
                isActive: true,
            });
            const days = (Date.parse(created.validUntil) - before) / 86400000;
            expect(days).toBeGreaterThan(13.99);
            expect(days).toBeLessThan(14.01);
            expect(created.validUntil).toMatch(/\+07:00$/);
        });

        it("generates a code when none is sent", async () => {
            const response = await request(app)
                .post("/api/admin/promo-codes")
                .set(admin())
                .send({ discountType: "Nominal", discountValue: 15000, quota: 1 });
            expect(response.status).toBe(201);
            rows.track("PromoCode", (response.body.data as PromoCodeBody).id);

            expect((response.body.data as PromoCodeBody).code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
        });

        it("stores a lowercase code in uppercase", async () => {
            const code = `zz${tag.toLowerCase()}low`;

            const created = await createPromoCode({ code });

            expect(created.code).toBe(code.toUpperCase());
        });

        it("answers 409 on a duplicate code, whatever its case", async () => {
            const created = await createPromoCode();

            const response = await request(app)
                .post("/api/admin/promo-codes")
                .set(admin())
                .send({ code: created.code.toLowerCase(), discountType: "Persen", discountValue: 5, quota: 1 });

            expect(response.status).toBe(409);
            expect(response.body.error.code).toBe("CONFLICT");
        });

        it.each([
            ["a percent above 100", { discountType: "Persen", discountValue: 101 }],
            ["a validUntil in the past", { validUntil: "2020-01-01T00:00:00+07:00" }],
            ["a validUntil without an offset", { validUntil: "2030-01-01T00:00:00" }],
            ["a code with spaces", { code: "HEMAT 20" }],
            ["a zero discount", { discountValue: 0 }],
            ["a negative quota", { quota: -1 }],
        ])("answers 400 for %s", async (_, override) => {
            const response = await request(app)
                .post("/api/admin/promo-codes")
                .set(admin())
                .send({ discountType: "Persen", discountValue: 10, quota: 5, ...override });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
        });

        it("points the percent error at discountValue", async () => {
            const response = await request(app)
                .post("/api/admin/promo-codes")
                .set(admin())
                .send({ discountType: "Persen", discountValue: 150, quota: 5 });

            expect(response.body.error.issues).toEqual([expect.objectContaining({ path: "discountValue" })]);
        });

        it("accepts a quota of 0 and a large nominal discount", async () => {
            const created = await createPromoCode({ discountType: "Nominal", discountValue: 150000, quota: 0 });

            expect(created).toMatchObject({ discountType: "Nominal", discountValue: 150000, quota: 0 });
        });
    });

    describe("GET /admin/promo-codes", () => {
        it("lists with search and isActive filters, and reports usedCount", async () => {
            const active = await createPromoCode({ code: `ZZ${tag}-LA` });
            const inactive = await createPromoCode({ code: `ZZ${tag}-LB`, isActive: false });
            uses = new Map([[active.id, 3]]);

            const all = await request(app).get(`/api/admin/promo-codes?search=${tag}-L`).set(admin());
            const onlyInactive = await request(app)
                .get(`/api/admin/promo-codes?search=${tag}-L&isActive=false`)
                .set(admin());

            expect(all.status).toBe(200);
            expect((all.body.data as PromoCodeBody[]).map(item => [item.id, item.usedCount]).sort()).toEqual(
                [
                    [active.id, 3],
                    [inactive.id, 0],
                ].sort(),
            );
            expect(all.body.meta.total).toBe(2);
            expect((onlyInactive.body.data as PromoCodeBody[]).map(item => item.id)).toEqual([inactive.id]);
            uses = new Map();
        });

        it("answers 400 for a bad isActive", async () => {
            expect((await request(app).get("/api/admin/promo-codes?isActive=yes").set(admin())).status).toBe(400);
        });
    });

    describe("GET, PATCH and DELETE /admin/promo-codes/{id}", () => {
        it("gets a code and answers 404 for a missing one", async () => {
            const created = await createPromoCode();

            const found = await request(app).get(`/api/admin/promo-codes/${created.id}`).set(admin());
            const missing = await request(app).get(`/api/admin/promo-codes/${randomUUID()}`).set(admin());

            expect(found.status).toBe(200);
            expect(found.body.data).toEqual(created);
            expect(missing.status).toBe(404);
            expect(missing.body.error.code).toBe("PROMO_CODE_NOT_FOUND");
        });

        it("deactivates a code and changes its quota below the uses", async () => {
            const created = await createPromoCode();
            uses = new Map([[created.id, 4]]);

            const response = await request(app)
                .patch(`/api/admin/promo-codes/${created.id}`)
                .set(admin())
                .send({ isActive: false, quota: 2 });

            expect(response.status).toBe(200);
            expect(response.body.data).toMatchObject({ isActive: false, quota: 2, usedCount: 4 });
            uses = new Map();
        });

        it("checks the merged value on PATCH", async () => {
            const created = await createPromoCode({ discountType: "Nominal", discountValue: 15000 });

            const response = await request(app)
                .patch(`/api/admin/promo-codes/${created.id}`)
                .set(admin())
                .send({ discountType: "Persen" });

            expect(response.status).toBe(400);
            expect(response.body.error.issues).toEqual([expect.objectContaining({ path: "discountValue" })]);
        });

        it("answers 400 for an empty PATCH or a past validUntil, 404 for a missing id, 409 for a taken code", async () => {
            const first = await createPromoCode();
            const second = await createPromoCode();
            const patch = (id: string, body: object) =>
                request(app).patch(`/api/admin/promo-codes/${id}`).set(admin()).send(body);

            expect((await patch(first.id, {})).status).toBe(400);
            expect((await patch(first.id, { validUntil: "2020-01-01T00:00:00+07:00" })).status).toBe(400);
            expect((await patch(randomUUID(), { isActive: false })).status).toBe(404);
            expect((await patch(second.id, { code: first.code })).status).toBe(409);
        });

        it("deletes a code with 204 and then answers 404", async () => {
            const created = await createPromoCode();

            const deleted = await request(app).delete(`/api/admin/promo-codes/${created.id}`).set(admin());
            const again = await request(app).delete(`/api/admin/promo-codes/${created.id}`).set(admin());

            expect(deleted.status).toBe(204);
            expect(deleted.text).toBe("");
            expect(again.status).toBe(404);
        });

        it("answers 409 while a pending order uses the code, and deletes once it is paid", async () => {
            const created = await createPromoCode();
            pending = new Set([created.id]);

            const blocked = await request(app).delete(`/api/admin/promo-codes/${created.id}`).set(admin());
            pending = new Set();
            const allowed = await request(app).delete(`/api/admin/promo-codes/${created.id}`).set(admin());

            expect(blocked.status).toBe(409);
            expect(blocked.body.error.code).toBe("CONFLICT");
            expect(allowed.status).toBe(204);
        });

        it("answers 400 for an id that is not a uuid", async () => {
            expect((await request(app).get("/api/admin/promo-codes/not-a-uuid").set(admin())).status).toBe(400);
        });
    });
});
