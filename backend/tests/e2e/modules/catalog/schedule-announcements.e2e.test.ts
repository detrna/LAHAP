import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import { createModules, type Modules } from "../../../../src/modules/create-modules.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import type { PaymentGateway } from "../../../../src/shared/ports/payment-gateway/payment-gateway.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createAuthHeaders } from "../../../utils/factory/jwt/jwt.js";
import { createTestMenu, createTestSchedule } from "../../../utils/fixtures/schedules.js";
import { createTestSlots } from "../../../utils/fixtures/slots.js";
import { createTestPackage } from "../../../utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../utils/fixtures/users.js";

const asUser = (role: Role, userId: string = randomUUID()) =>
    createAuthHeaders({ role, sub: { userId, name: `E2E ${role}` } });

interface AnnouncementBody {
    readonly id: string;
    readonly scope: string;
    readonly menuScheduleId: string | null;
    readonly body: string;
}

describe("BR-26 schedule announcements (e2e)", () => {
    let db: Db;
    let rows: CreatedRows;
    let testApp: TestApp;
    let app: Express;
    let modules: Modules;
    let scheduleId: string;
    let oldMenuId: string;
    let newMenuId: string;
    let paidCustomerId: string;
    let skippingCustomerId: string;
    let pendingCustomerId: string;

    const admin = () => asUser("ADMIN");

    async function announcementsOf(userId: string): Promise<readonly AnnouncementBody[]> {
        const response = await request(app)
            .get("/api/me/announcements")
            .set(asUser("CUSTOMER", userId))
            .query({ limit: 100 });
        expect(response.status).toBe(200);
        return response.body.data as AnnouncementBody[];
    }

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        testApp = await createTestApp({
            db,
            adapters: {
                objectStorage: { getSignedUrl: async (key: string) => `https://storage.test/${key}` },
                paymentGateway: { createTransaction: vi.fn(), verifyNotification: vi.fn() } as PaymentGateway,
            } as never,
            mount: deps => {
                modules = createModules(deps);
                return [modules.catalog.router, modules.notifications.router];
            },
        });
        app = testApp.app;

        const packageId = await createTestPackage(db, rows, { basePrice: 15000 });
        oldMenuId = await createTestMenu(db, rows);
        newMenuId = await createTestMenu(db, rows);
        scheduleId = await createTestSchedule(db, rows, {
            packageId,
            date: "2997-05-05",
            isPublished: true,
            primaryMenuId: oldMenuId,
        });
        paidCustomerId = await createTestUser(db, rows);
        skippingCustomerId = await createTestUser(db, rows);
        pendingCustomerId = await createTestUser(db, rows);
        await createTestSlots(db, rows, {
            userId: paidCustomerId,
            packageId,
            status: "Success",
            slots: [{ scheduleId }],
        });
        await createTestSlots(db, rows, {
            userId: skippingCustomerId,
            packageId,
            status: "Success",
            slots: [{ scheduleId, status: "Dilewati", skipReason: "travelling" }],
        });
        await createTestSlots(db, rows, {
            userId: pendingCustomerId,
            packageId,
            status: "Pending",
            slots: [{ scheduleId }],
        });
    });

    afterAll(async () => {
        const created = await db.orm.public.Announcement.where({ menuScheduleId: scheduleId }).select("id").all();
        for (const { id } of created) rows.track("Announcement", id);
        await rows?.cleanup();
        await testApp?.close();
        await db?.close();
    });

    it("requires a reason to change the menu of a schedule with paid orders", async () => {
        const response = await request(app)
            .patch(`/api/admin/menu-schedules/${scheduleId}`)
            .set(admin())
            .send({ primaryMenuId: newMenuId });

        expect(response.status).toBe(400);
        expect(response.body.error.issues[0]).toMatchObject({ code: "change_reason_required" });
        expect(await announcementsOf(paidCustomerId)).toEqual([]);
    });

    it("announces the change to customers who still receive the meal, and to nobody else", async () => {
        const response = await request(app)
            .patch(`/api/admin/menu-schedules/${scheduleId}`)
            .set(admin())
            .send({ primaryMenuId: newMenuId, changeReason: "ayam habis" });
        expect(response.status).toBe(200);

        const paid = await announcementsOf(paidCustomerId);
        expect(paid).toHaveLength(1);
        expect(paid[0]).toMatchObject({ scope: "SCHEDULE", menuScheduleId: scheduleId });
        expect(paid[0]?.body).toContain("ayam habis");
        expect(await announcementsOf(skippingCustomerId)).toEqual([]);
        expect(await announcementsOf(pendingCustomerId)).toEqual([]);
    });

    it("keeps the change when the announcement cannot be sent", async () => {
        const failure = new Error("notifications down");
        const announce = vi.spyOn(modules.notifications.service, "announce").mockRejectedValueOnce(failure);

        const response = await request(app)
            .patch(`/api/admin/menu-schedules/${scheduleId}`)
            .set(admin())
            .send({ primaryMenuId: oldMenuId, changeReason: "dicoba lagi" });

        expect(response.status).toBe(200);
        expect(announce).toHaveBeenCalled();
        announce.mockRestore();
    });
});
