import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import { createModules } from "../../../../src/modules/create-modules.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import type { PaymentGateway } from "../../../../src/shared/ports/payment-gateway/payment-gateway.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createAuthHeaders } from "../../../utils/factory/jwt/jwt.js";
import { createTestMenu, createTestSchedule } from "../../../utils/fixtures/schedules.js";
import { createTestSlots } from "../../../utils/fixtures/slots.js";
import { createTestPackage } from "../../../utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../utils/fixtures/users.js";

const DAY = "2997-08-04";
const OTHER_DAY = "2997-08-05";
const PHOTO_KEY = "obstacles/2997/08/a.webp";
const MISSING_PHOTO_KEY = "obstacles/2997/08/missing.webp";

interface DeliveryLine {
    readonly orderId: string;
    readonly status: string;
    readonly recipientName: string;
    readonly phone: string;
    readonly packageName: string;
    readonly isReadyForPickup: boolean;
    readonly deliveryTime: { readonly time: string };
    readonly menu: { readonly id: string };
    readonly obstacles: readonly { readonly note: string; readonly author?: { readonly id: string } }[];
}

describe("delivery routes (e2e)", () => {
    let db: Db;
    let rows: CreatedRows;
    let testApp: TestApp;
    let app: Express;

    let courierId: string;
    let otherCourierId: string;
    let adminId: string;
    let customerId: string;
    let menuId: string;
    let packageId: string;
    let outForDelivery: string;
    let preparing: string;
    let otherCouriers: string;
    let pickup: string;
    let finished: string;
    let otherDay: string;

    const as = (role: Role, userId: string) => createAuthHeaders({ role, sub: { userId, name: `E2E ${role}` } });
    const list = (query: Record<string, string>, headers = as("COURIER", courierId)) =>
        request(app).get("/api/courier/orders").set(headers).query(query);
    const report = (orderId: string, body: unknown, headers = as("COURIER", courierId)) =>
        request(app)
            .post(`/api/courier/orders/${orderId}/obstacles`)
            .set(headers)
            .send(body as object);

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        testApp = await createTestApp({
            db,
            adapters: {
                objectStorage: {
                    getSignedUrl: async (key: string) => `https://storage.test/${key}`,
                    exists: async (key: string) => key !== MISSING_PHOTO_KEY,
                },
                paymentGateway: { createTransaction: vi.fn(), verifyNotification: vi.fn() } as PaymentGateway,
            } as never,
            mount: deps => [createModules(deps).delivery.router],
        });
        app = testApp.app;

        courierId = await createTestUser(db, rows, { role: "COURIER" });
        otherCourierId = await createTestUser(db, rows, { role: "COURIER" });
        adminId = await createTestUser(db, rows, { role: "ADMIN" });
        customerId = await createTestUser(db, rows);
        menuId = await createTestMenu(db, rows);
        packageId = await createTestPackage(db, rows, { name: "Zz E2E Paket", deliveryTimes: ["07:00", "12:00"] });

        const schedule = (date: string, deliveryTime: string) =>
            createTestSchedule(db, rows, {
                packageId,
                date,
                deliveryTime,
                isPublished: true,
                primaryMenuId: menuId,
            });
        const morning = await schedule(DAY, "07:00");
        const noon = await schedule(DAY, "12:00");
        const nextDay = await schedule(OTHER_DAY, "12:00");

        const slotOf = async (
            scheduleId: string,
            options: {
                readonly recipientName: string;
                readonly status?: "Terjadwal" | "Disiapkan" | "Diantar" | "Siap Diambil" | "Selesai" | "Dilewati";
                readonly courier?: string;
                readonly isDelivery?: boolean;
                readonly subscriptionStatus?: "Success" | "Pending";
            },
        ) => {
            const created = await createTestSlots(db, rows, {
                userId: customerId,
                packageId,
                status: options.subscriptionStatus ?? "Success",
                isDelivery: options.isDelivery ?? true,
                recipientName: options.recipientName,
                slots: [
                    {
                        scheduleId,
                        ...(options.status !== undefined ? { status: options.status } : {}),
                        ...(options.courier !== undefined ? { courierId: options.courier } : {}),
                    },
                ],
            });
            return created.slotIds[0]!;
        };

        outForDelivery = await slotOf(noon, { recipientName: "Zz Bu Rina", status: "Diantar", courier: courierId });
        preparing = await slotOf(morning, { recipientName: "Zz Pak Andi", status: "Disiapkan", courier: courierId });
        otherCouriers = await slotOf(noon, {
            recipientName: "Zz Orang Lain",
            status: "Diantar",
            courier: otherCourierId,
        });
        pickup = await slotOf(noon, { recipientName: "Zz Ambil Sendiri", isDelivery: false, status: "Siap Diambil" });
        finished = await slotOf(morning, { recipientName: "Zz Selesai", status: "Selesai", courier: courierId });
        await slotOf(morning, { recipientName: "Zz Dilewati", status: "Dilewati", courier: courierId });
        await slotOf(morning, { recipientName: "Zz Belum Bayar", courier: courierId, subscriptionStatus: "Pending" });
        otherDay = await slotOf(nextDay, { recipientName: "Zz Besok", status: "Diantar", courier: courierId });
    });

    afterAll(async () => {
        await rows?.cleanup();
        await testApp?.close();
        await db?.close();
    });

    describe("GET /courier/orders", () => {
        it("answers 401 without a token", async () => {
            expect((await request(app).get("/api/courier/orders")).status).toBe(401);
        });

        it.each<Role>(["CUSTOMER", "KITCHEN", "ADMIN"])("answers 403 for a %s", async role => {
            expect((await list({ date: DAY }, as(role, randomUUID()))).status).toBe(403);
        });

        it.each([
            ["a bad date", "04-08-2997"],
            ["an impossible date", "2997-02-30"],
        ])("refuses %s", async (_, date) => {
            const response = await list({ date });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
        });

        it("lists only the signed-in courier's paid delivery slots of the day, sorted by meal time then name", async () => {
            const response = await list({ date: DAY });

            expect(response.status).toBe(200);
            const lines = response.body.data as DeliveryLine[];
            expect(lines.map(line => [line.deliveryTime.time, line.recipientName, line.status])).toEqual([
                ["07:00", "Zz Pak Andi", "Disiapkan"],
                ["07:00", "Zz Selesai", "Selesai"],
                ["12:00", "Zz Bu Rina", "Diantar"],
            ]);
            const ready = lines.find(line => line.orderId === outForDelivery);
            expect(ready).toMatchObject({
                packageName: "Zz E2E Paket",
                isReadyForPickup: true,
                menu: { id: menuId },
                obstacles: [],
            });
            expect(ready?.phone).toMatch(/^62/);
            expect(lines.find(line => line.orderId === preparing)?.isReadyForPickup).toBe(false);
            const ids = lines.map(line => line.orderId);
            for (const hidden of [otherCouriers, pickup, otherDay]) expect(ids).not.toContain(hidden);
            expect(ids).toContain(finished);
        });

        it("lists another day when asked and nothing on a day without schedules", async () => {
            const next = await list({ date: OTHER_DAY });
            const empty = await list({ date: "2997-09-09" });

            expect((next.body.data as DeliveryLine[]).map(line => line.orderId)).toEqual([otherDay]);
            expect(empty.body).toEqual({ data: [] });
        });
    });

    describe("POST /courier/orders/{id}/obstacles", () => {
        it("answers 401 without a token", async () => {
            const response = await request(app)
                .post(`/api/courier/orders/${outForDelivery}/obstacles`)
                .send({ note: "x" });

            expect(response.status).toBe(401);
        });

        it.each<Role>(["CUSTOMER", "KITCHEN"])("answers 403 for a %s", async role => {
            expect((await report(outForDelivery, { note: "x" }, as(role, randomUUID()))).status).toBe(403);
        });

        it("refuses an order id that is not a uuid", async () => {
            const response = await report("not-a-uuid", { note: "x" });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
        });

        it.each([
            ["a missing note", {}],
            ["an empty note", { note: "   " }],
            ["a note over 1000 characters", { note: "a".repeat(1001) }],
            ["a photo key outside the obstacles folder", { note: "x", photoKey: "menus/a.webp" }],
        ])("refuses %s", async (_, body) => {
            const response = await report(outForDelivery, body);

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
        });

        it("refuses a photo that was never uploaded", async () => {
            const response = await report(outForDelivery, { note: "x", photoKey: MISSING_PHOTO_KEY });

            expect(response.status).toBe(400);
            expect(response.body.error.issues).toEqual([expect.objectContaining({ code: "photo_not_found" })]);
        });

        it("answers 404 for an unknown slot, another courier's slot and a pick-up slot", async () => {
            for (const orderId of [randomUUID(), otherCouriers, pickup]) {
                const response = await report(orderId, { note: "x" });

                expect(response.status).toBe(404);
                expect(response.body.error.code).toBe("ORDER_NOT_FOUND");
            }
        });

        it("answers 422 to a courier whose slot is not out for delivery yet", async () => {
            const response = await report(preparing, { note: "x" });

            expect(response.status).toBe(422);
            expect(response.body.error).toMatchObject({
                code: "INVALID_STATE",
                message: "slot is not out for delivery",
            });
        });

        it("saves a courier's note, tells the customer and shows it on the courier's list", async () => {
            const response = await report(outForDelivery, { note: "  Gerbang terkunci  ", photoKey: PHOTO_KEY });

            expect(response.status).toBe(201);
            expect(response.body.data).toMatchObject({
                orderId: outForDelivery,
                authorId: courierId,
                note: "Gerbang terkunci",
                photoKey: PHOTO_KEY,
                photoUrl: `https://storage.test/${PHOTO_KEY}`,
                author: { id: courierId, role: "COURIER" },
            });
            const notifications = await db.orm.public.Notification.where({ userId: customerId }).all();
            expect(notifications).toEqual([
                expect.objectContaining({
                    title: "Kendala pengantaran",
                    body: expect.stringMatching(/ · 12:00 — Gerbang terkunci$/),
                }),
            ]);
            const listed = (await list({ date: DAY })).body.data as DeliveryLine[];
            const line = listed.find(item => item.orderId === outForDelivery);
            expect(line?.obstacles).toEqual([
                expect.objectContaining({
                    note: "Gerbang terkunci",
                    author: expect.objectContaining({ id: courierId }),
                }),
            ]);
        });

        it("lets an admin write on another courier's open slot but not on a finished one", async () => {
            const allowed = await report(otherCouriers, { note: "Pelanggan tidak di rumah" }, as("ADMIN", adminId));
            const refused = await report(finished, { note: "x" }, as("ADMIN", adminId));

            expect(allowed.status).toBe(201);
            expect(allowed.body.data).toMatchObject({ authorId: adminId, author: { role: "ADMIN" } });
            expect(refused.status).toBe(422);
        });
    });
});
