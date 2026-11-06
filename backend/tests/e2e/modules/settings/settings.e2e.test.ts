import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import { SettingsContainer } from "../../../../src/modules/settings/container/settings.container.js";
import type { Settings } from "../../../../src/modules/settings/domain/settings.domain.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createAuthHeaders } from "../../../utils/factory/jwt/jwt.js";
import { ensureTestBusiness } from "../../../utils/fixtures/business.js";

const asRole = (role: Role) => createAuthHeaders({ role, sub: { userId: randomUUID(), name: `E2E ${role}` } });

const changedSettings = {
    name: "Zz E2E Kitchen",
    whatsappNumber: "081200002222",
    address: "Jl. E2E No. 2",
    latitude: -7.95,
    longitude: 112.63,
    deliveryFreeRadius: 2,
    deliveryMaxDistance: 15,
    deliveryPricePerKm: 7000,
    paymentTimeoutMinutes: 45,
};

describe("settings routes (e2e)", () => {
    let db: Db;
    let testApp: TestApp;
    let app: Express;
    let original: Settings;
    let rows: CreatedRows;

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        await ensureTestBusiness(db, rows);
        testApp = await createTestApp({ db, mount: deps => [new SettingsContainer(deps).router] });
        app = testApp.app;
        const response = await request(app).get("/api/admin/settings").set(asRole("ADMIN"));
        expect(response.status).toBe(200);
        original = response.body.data;
    });

    afterAll(async () => {
        if (original !== undefined) {
            const { updatedAt: _updatedAt, ...values } = original;
            const restored = await request(app).put("/api/admin/settings").set(asRole("ADMIN")).send(values);
            expect(restored.status).toBe(200);
            expect(restored.body.data).toMatchObject(values);
        }
        await rows?.cleanup();
        await testApp?.close();
        await db?.close();
    });

    it("serves the public business profile without a token and without delivery or timeout fields", async () => {
        const response = await request(app).get("/api/business");

        expect(response.status).toBe(200);
        expect(Object.keys(response.body.data).sort()).toEqual(
            ["address", "latitude", "longitude", "name", "whatsappNumber"].sort(),
        );
        expect(response.body.data).toMatchObject({ name: original.name, whatsappNumber: original.whatsappNumber });
    });

    it("saves the settings and reads them back through both endpoints", async () => {
        const saved = await request(app).put("/api/admin/settings").set(asRole("ADMIN")).send(changedSettings);
        const admin = await request(app).get("/api/admin/settings").set(asRole("ADMIN"));
        const publicInfo = await request(app).get("/api/business");

        const expected = { ...changedSettings, whatsappNumber: "6281200002222" };
        expect(saved.status).toBe(200);
        expect(saved.body.data).toMatchObject(expected);
        expect(saved.body.data.updatedAt).toMatch(/\+07:00$/);
        expect(admin.body.data).toEqual(saved.body.data);
        expect(publicInfo.body.data).toEqual({
            name: expected.name,
            address: expected.address,
            latitude: expected.latitude,
            longitude: expected.longitude,
            whatsappNumber: expected.whatsappNumber,
        });
    });

    it("ignores updatedAt in the body", async () => {
        const response = await request(app)
            .put("/api/admin/settings")
            .set(asRole("ADMIN"))
            .send({ ...changedSettings, updatedAt: "2000-01-01T00:00:00.000+07:00" });

        expect(response.status).toBe(200);
        expect(response.body.data.updatedAt).not.toMatch(/^2000-/);
    });

    it.each([
        ["a free radius above the maximum distance", { deliveryFreeRadius: 20, deliveryMaxDistance: 15 }],
        ["a bad phone number", { whatsappNumber: "12345" }],
        ["a payment timeout above 1440", { paymentTimeoutMinutes: 1441 }],
        ["a latitude out of range", { latitude: 91 }],
        ["a missing field", { name: undefined }],
    ])("answers 400 for %s and keeps the stored settings", async (_, overrides) => {
        const before = await request(app).get("/api/admin/settings").set(asRole("ADMIN"));

        const response = await request(app)
            .put("/api/admin/settings")
            .set(asRole("ADMIN"))
            .send({ ...changedSettings, ...overrides });
        const after = await request(app).get("/api/admin/settings").set(asRole("ADMIN"));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(after.body.data).toEqual(before.body.data);
    });

    it.each<Role>(["CUSTOMER", "KITCHEN", "COURIER"])("answers 403 to a %s on the admin endpoints", async role => {
        const read = await request(app).get("/api/admin/settings").set(asRole(role));
        const write = await request(app).put("/api/admin/settings").set(asRole(role)).send(changedSettings);

        expect(read.status).toBe(403);
        expect(write.status).toBe(403);
    });

    it("answers 401 to the admin endpoints without a token", async () => {
        const read = await request(app).get("/api/admin/settings");
        const write = await request(app).put("/api/admin/settings").send(changedSettings);

        expect(read.status).toBe(401);
        expect(write.status).toBe(401);
    });
});
