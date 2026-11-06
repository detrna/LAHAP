import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import type { OrderActivity } from "../../../../src/modules/catalog/service/interfaces/order-activity.js";
import { FilesService } from "../../../../src/modules/files/service/files.service.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import type { ObjectStorage } from "../../../../src/shared/ports/object-storage/object-storage.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createCatalogContainer } from "../../../utils/app/catalog-container.js";
import { createAuthHeaders } from "../../../utils/factory/jwt/jwt.js";
import { createTestPackage, createTestSubscription } from "../../../utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../utils/fixtures/users.js";

const objectStorage = {
    exists: async (key: string) => !key.includes("missing"),
    getSignedUrl: async (key: string) => `https://storage.test/${key}`,
} as unknown as ObjectStorage;

const asRole = (role: Role) => createAuthHeaders({ role, sub: { userId: randomUUID(), name: `E2E ${role}` } });

const validPackage = (name: string, overrides: Record<string, unknown> = {}) => ({
    name,
    description: "e2e package",
    basePrice: 20000,
    periods: ["Harian", "Mingguan"],
    deliveryTimes: ["18:30", "07:00", "12:00"],
    photoKey: "packages/2026/11/e2e.webp",
    ...overrides,
});

describe("catalog routes (e2e)", () => {
    let db: Db;
    let rows: CreatedRows;
    let testApp: TestApp;
    let app: Express;
    const tag = randomUUID().slice(0, 8);
    const orderActivity = {
        subscriberCounts: new Map<string, number>(),
        schedulesWithOrders: [] as string[],
        asserted: [] as unknown[],
    };
    const activity: OrderActivity = {
        countActiveSubscribers: async ids => new Map(ids.map(id => [id, orderActivity.subscriberCounts.get(id) ?? 0])),
        findSchedulesWithOrders: async (ids, statuses) => {
            orderActivity.asserted.push(statuses);
            return ids.filter(id => orderActivity.schedulesWithOrders.includes(id));
        },
    };

    const admin = () => asRole("ADMIN");

    async function createAllergy(name: string): Promise<string> {
        const response = await request(app).post("/api/admin/allergies").set(admin()).send({ name });
        expect(response.status).toBe(201);
        return rows.track("Allergy", response.body.data.id);
    }

    async function createPackage(name: string, overrides: Record<string, unknown> = {}) {
        const response = await request(app)
            .post("/api/admin/packages")
            .set(admin())
            .send(validPackage(`Zz E2E ${tag} ${name}`, overrides));
        expect(response.status).toBe(201);
        rows.track("Package", response.body.data.id);
        return response.body.data as { id: string };
    }

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        testApp = await createTestApp({
            db,
            adapters: { objectStorage },
            mount: deps => [
                createCatalogContainer(deps, {
                    photoKeys: new FilesService(objectStorage, deps.adapters.clock),
                    orderActivity: activity,
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
        it.each([
            ["get", "/api/admin/allergies"],
            ["post", "/api/admin/allergies"],
            ["get", `/api/admin/allergies/${randomUUID()}`],
            ["patch", `/api/admin/allergies/${randomUUID()}`],
            ["delete", `/api/admin/allergies/${randomUUID()}`],
            ["get", "/api/admin/packages"],
            ["post", "/api/admin/packages"],
            ["get", `/api/admin/packages/${randomUUID()}`],
            ["patch", `/api/admin/packages/${randomUUID()}`],
            ["delete", `/api/admin/packages/${randomUUID()}`],
        ] as const)("answers 401 to %s %s without a token", async (method, path) => {
            expect((await request(app)[method](path)).status).toBe(401);
        });

        it.each(["CUSTOMER", "KITCHEN", "COURIER"] as const)("answers 403 to a %s on the admin routes", async role => {
            expect((await request(app).get("/api/admin/allergies").set(asRole(role))).status).toBe(403);
            expect((await request(app).post("/api/admin/packages").set(asRole(role)).send({})).status).toBe(403);
        });

        it("serves the public catalog without a token", async () => {
            expect((await request(app).get("/api/allergies")).status).toBe(200);
            expect((await request(app).get("/api/packages")).status).toBe(200);
        });
    });

    describe("allergies", () => {
        it("creates, reads, renames, lists and deletes an allergy", async () => {
            const created = await request(app)
                .post("/api/admin/allergies")
                .set(admin())
                .send({ name: `  Zz E2E ${tag} Kacang ` });
            expect(created.status).toBe(201);
            expect(created.body.data).toMatchObject({ name: `Zz E2E ${tag} Kacang` });
            expect(created.body.data.createdAt).toMatch(/\+07:00$/);
            const id = rows.track("Allergy", created.body.data.id);

            const fetched = await request(app).get(`/api/admin/allergies/${id}`).set(admin());
            expect(fetched.status).toBe(200);
            expect(fetched.body.data.id).toBe(id);

            const renamed = await request(app)
                .patch(`/api/admin/allergies/${id}`)
                .set(admin())
                .send({ name: `Zz E2E ${tag} Susu` });
            expect(renamed.status).toBe(200);
            expect(renamed.body.data.name).toBe(`Zz E2E ${tag} Susu`);

            const listed = await request(app)
                .get("/api/admin/allergies")
                .query({ search: `e2e ${tag}`, limit: 5 })
                .set(admin());
            expect(listed.status).toBe(200);
            expect(listed.body.data.map((item: { id: string }) => item.id)).toEqual([id]);
            expect(listed.body.meta).toMatchObject({ page: 1, limit: 5, total: 1 });

            expect((await request(app).delete(`/api/admin/allergies/${id}`).set(admin())).status).toBe(204);
            expect((await request(app).get(`/api/admin/allergies/${id}`).set(admin())).status).toBe(404);
            expect((await request(app).delete(`/api/admin/allergies/${id}`).set(admin())).status).toBe(404);
        });

        it("lists all allergies publicly, sorted by name", async () => {
            await createAllergy(`Zz E2E ${tag} B public`);
            await createAllergy(`Zz E2E ${tag} A public`);

            const response = await request(app).get("/api/allergies");

            expect(response.status).toBe(200);
            const names: string[] = response.body.data.map((item: { name: string }) => item.name);
            expect(names.indexOf(`Zz E2E ${tag} A public`)).toBeGreaterThanOrEqual(0);
            expect(names.indexOf(`Zz E2E ${tag} A public`)).toBeLessThan(names.indexOf(`Zz E2E ${tag} B public`));
            expect(response.body.meta).toBeUndefined();
        });

        it("answers 409 for a duplicate name on create and rename", async () => {
            const id = await createAllergy(`Zz E2E ${tag} Dup`);
            const other = await createAllergy(`Zz E2E ${tag} Dup other`);

            const create = await request(app)
                .post("/api/admin/allergies")
                .set(admin())
                .send({ name: `Zz E2E ${tag} Dup` });
            const rename = await request(app)
                .patch(`/api/admin/allergies/${other}`)
                .set(admin())
                .send({ name: `Zz E2E ${tag} Dup` });

            expect(create.status).toBe(409);
            expect(create.body.error.code).toBe("CONFLICT");
            expect(rename.status).toBe(409);
            expect((await request(app).get(`/api/admin/allergies/${id}`).set(admin())).status).toBe(200);
        });

        it("answers 400 for a bad body, id or query, and 404 for an unknown id", async () => {
            const empty = await request(app).post("/api/admin/allergies").set(admin()).send({ name: "  " });
            expect(empty.status).toBe(400);
            expect(empty.body.error).toMatchObject({ code: "VALIDATION_ERROR" });
            expect(empty.body.error.issues[0]).toMatchObject({ target: "body", path: "name" });

            expect((await request(app).post("/api/admin/allergies").set(admin()).send({})).status).toBe(400);
            expect((await request(app).get("/api/admin/allergies/not-a-uuid").set(admin())).status).toBe(400);
            expect((await request(app).get("/api/admin/allergies?limit=0").set(admin())).status).toBe(400);

            const missing = await request(app).get(`/api/admin/allergies/${randomUUID()}`).set(admin());
            expect(missing.status).toBe(404);
            expect(missing.body.error.code).toBe("ALLERGY_NOT_FOUND");
            expect(
                (
                    await request(app)
                        .patch(`/api/admin/allergies/${randomUUID()}`)
                        .set(admin())
                        .send({ name: `Zz E2E ${tag} Nope` })
                ).status,
            ).toBe(404);
        });
    });

    describe("packages", () => {
        it("creates a package with sorted meal times, ranges, a signed photo and a zero subscriber count", async () => {
            const response = await request(app)
                .post("/api/admin/packages")
                .set(admin())
                .send(
                    validPackage(`Zz E2E ${tag} Create`, {
                        deliveryFreeRadius: 2.5,
                        endAt: "2099-01-01T00:00:00+07:00",
                    }),
                );
            expect(response.status).toBe(201);
            rows.track("Package", response.body.data.id);

            expect(response.body.data).toMatchObject({
                name: `Zz E2E ${tag} Create`,
                basePrice: 20000,
                periods: ["Harian", "Mingguan"],
                deliveryTimes: [
                    { time: "07:00", range: "Pagi" },
                    { time: "12:00", range: "Siang" },
                    { time: "18:30", range: "Malam" },
                ],
                deliveryFreeRadius: 2.5,
                deliveryMaxDistance: null,
                deliveryPricePerKm: null,
                photoKey: "packages/2026/11/e2e.webp",
                photoUrl: "https://storage.test/packages/2026/11/e2e.webp",
                endAt: "2099-01-01T00:00:00.000+07:00",
                isActive: true,
                isAvailable: true,
                activeSubscriberCount: 0,
            });
            expect(response.body.data.startAt).toMatch(/\+07:00$/);
        });

        it("answers 400 with issues for an invalid body", async () => {
            const response = await request(app)
                .post("/api/admin/packages")
                .set(admin())
                .send({ name: "", basePrice: 0, periods: [], deliveryTimes: ["7:00"], photoKey: "menus/a.webp" });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
            expect(response.body.error.issues.map((issue: { path: string }) => issue.path).sort()).toEqual(
                ["basePrice", "deliveryTimes.0", "description", "name", "periods", "photoKey"].sort(),
            );
        });

        it("answers 400 photo_not_found when the photo is not in storage", async () => {
            const response = await request(app)
                .post("/api/admin/packages")
                .set(admin())
                .send(validPackage(`Zz E2E ${tag} No photo`, { photoKey: "packages/2026/11/missing.webp" }));

            expect(response.status).toBe(400);
            expect(response.body.error.issues[0]).toMatchObject({ path: "photoKey", code: "photo_not_found" });
        });

        it("answers 400 when the end is not after the start", async () => {
            const response = await request(app)
                .post("/api/admin/packages")
                .set(admin())
                .send(
                    validPackage(`Zz E2E ${tag} Window`, {
                        startAt: "2026-12-01T00:00:00+07:00",
                        endAt: "2026-11-01T00:00:00+07:00",
                    }),
                );

            expect(response.status).toBe(400);
            expect(response.body.error.issues[0]).toMatchObject({ path: "endAt", code: "end_before_start" });
        });

        it("reads a package for the admin with the subscriber count, and 404 for an unknown id", async () => {
            const { id } = await createPackage("Admin read");
            orderActivity.subscriberCounts.set(id, 4);

            const response = await request(app).get(`/api/admin/packages/${id}`).set(admin());

            expect(response.status).toBe(200);
            expect(response.body.data).toMatchObject({ id, activeSubscriberCount: 4 });
            const missing = await request(app).get(`/api/admin/packages/${randomUUID()}`).set(admin());
            expect(missing.status).toBe(404);
            expect(missing.body.error.code).toBe("PACKAGE_NOT_FOUND");
        });

        it("lists packages for the admin with filters, paging and subscriber counts", async () => {
            const on = await createPackage("Admin list on");
            const off = await createPackage("Admin list off", { isActive: false });
            orderActivity.subscriberCounts.set(on.id, 2);

            const all = await request(app)
                .get("/api/admin/packages")
                .query({ search: `E2E ${tag} Admin list`, limit: 1, page: 2 })
                .set(admin());
            expect(all.status).toBe(200);
            expect(all.body.meta).toMatchObject({ page: 2, limit: 1, total: 2, totalPages: 2 });

            const inactive = await request(app)
                .get("/api/admin/packages")
                .query({ search: `E2E ${tag} Admin list`, isActive: "false" })
                .set(admin());
            expect(inactive.body.data.map((item: { id: string }) => item.id)).toEqual([off.id]);

            const active = await request(app)
                .get("/api/admin/packages")
                .query({ search: `E2E ${tag} Admin list`, isActive: "true" })
                .set(admin());
            expect(active.body.data).toEqual([expect.objectContaining({ id: on.id, activeSubscriberCount: 2 })]);
        });

        it("shows customers only available packages, without admin fields", async () => {
            const running = await createPackage("Public running");
            const off = await createPackage("Public off", { isActive: false });
            const future = await createPackage("Public future", { startAt: "2099-01-01T00:00:00+07:00" });
            const ended = await createPackage("Public ended", {
                startAt: "2020-01-01T00:00:00+07:00",
                endAt: "2020-02-01T00:00:00+07:00",
            });

            const listed = await request(app)
                .get("/api/packages")
                .query({ search: `E2E ${tag} Public` });
            expect(listed.status).toBe(200);
            expect(listed.body.data.map((item: { id: string }) => item.id)).toEqual([running.id]);
            expect(listed.body.data[0]).not.toHaveProperty("activeSubscriberCount");
            expect(listed.body.meta.total).toBe(1);

            expect((await request(app).get(`/api/packages/${running.id}`)).status).toBe(200);
            for (const hidden of [off, future, ended]) {
                const response = await request(app).get(`/api/packages/${hidden.id}`);
                expect(response.status).toBe(404);
            }
            expect((await request(app).get(`/api/packages/${randomUUID()}`)).status).toBe(404);
            expect((await request(app).get("/api/packages/not-a-uuid")).status).toBe(400);
        });

        it("updates a package, and switching it off hides it from customers", async () => {
            const { id } = await createPackage("Update");

            const response = await request(app)
                .patch(`/api/admin/packages/${id}`)
                .set(admin())
                .send({ name: `Zz E2E ${tag} Updated`, basePrice: 25000.555, isActive: false, endAt: null });

            expect(response.status).toBe(200);
            expect(response.body.data).toMatchObject({
                id,
                name: `Zz E2E ${tag} Updated`,
                basePrice: 25000.56,
                isActive: false,
                isAvailable: false,
                endAt: null,
            });
            expect((await request(app).get(`/api/packages/${id}`)).status).toBe(404);
        });

        it("answers 400 for an empty update and for an end before the stored start", async () => {
            const { id } = await createPackage("Bad update");

            expect((await request(app).patch(`/api/admin/packages/${id}`).set(admin()).send({})).status).toBe(400);
            const window = await request(app)
                .patch(`/api/admin/packages/${id}`)
                .set(admin())
                .send({ endAt: "2000-01-01T00:00:00+07:00" });
            expect(window.status).toBe(400);
            expect(window.body.error.issues[0]).toMatchObject({ path: "endAt" });
            expect(
                (await request(app).patch(`/api/admin/packages/${randomUUID()}`).set(admin()).send({ isActive: false }))
                    .status,
            ).toBe(404);
        });

        describe("removing a meal time", () => {
            const createSchedule = async (packageId: string, date: string, deliveryTime: string) => {
                const schedule = await db.orm.public.Schedule.create({
                    packageId,
                    date: Temporal.PlainDate.from(date),
                    deliveryTime: Temporal.PlainTime.from(deliveryTime),
                });
                return rows.track("Schedule", schedule.id);
            };

            it("deletes the future schedules at the removed time when no order holds them", async () => {
                const { id } = await createPackage("Drop free");
                const future = await createSchedule(id, "2099-01-01", "18:30");
                const past = await createSchedule(id, "2020-01-01", "18:30");
                const other = await createSchedule(id, "2099-01-01", "07:00");

                const response = await request(app)
                    .patch(`/api/admin/packages/${id}`)
                    .set(admin())
                    .send({ deliveryTimes: ["07:00", "12:00"] });

                expect(response.status).toBe(200);
                expect(response.body.data.deliveryTimes.map((time: { time: string }) => time.time)).toEqual([
                    "07:00",
                    "12:00",
                ]);
                const remaining = (await db.orm.public.Schedule.where({ packageId: id }).select("id").all()).map(
                    schedule => schedule.id,
                );
                expect(remaining.sort()).toEqual([past, other].sort());
                expect(remaining).not.toContain(future);
            });

            it("answers 422 and changes nothing when orders hold a schedule at the removed time", async () => {
                const { id } = await createPackage("Drop held");
                const held = await createSchedule(id, "2099-01-01", "18:30");
                orderActivity.schedulesWithOrders.push(held);

                const response = await request(app)
                    .patch(`/api/admin/packages/${id}`)
                    .set(admin())
                    .send({ name: `Zz E2E ${tag} Not applied`, deliveryTimes: ["07:00", "12:00"] });

                expect(response.status).toBe(422);
                expect(response.body.error).toMatchObject({
                    code: "INVALID_STATE",
                    message: "meal time is still used by schedules with orders",
                });
                expect(orderActivity.asserted.at(-1)).toEqual(["Pending", "Success"]);
                const unchanged = await request(app).get(`/api/admin/packages/${id}`).set(admin());
                expect(unchanged.body.data.name).toBe(`Zz E2E ${tag} Drop held`);
                expect(unchanged.body.data.deliveryTimes).toHaveLength(3);
                expect(await db.orm.public.Schedule.where({ id: held }).first()).not.toBeNull();
            });
        });

        it("deletes an unused package and answers 404 afterwards", async () => {
            const { id } = await createPackage("Delete");

            expect((await request(app).delete(`/api/admin/packages/${id}`).set(admin())).status).toBe(204);
            expect((await request(app).get(`/api/admin/packages/${id}`).set(admin())).status).toBe(404);
            expect((await request(app).delete(`/api/admin/packages/${id}`).set(admin())).status).toBe(404);
        });

        it("answers 409 when deleting a package that subscriptions reference", async () => {
            const packageId = await createTestPackage(db, rows);
            const userId = await createTestUser(db, rows);
            await createTestSubscription(db, rows, {
                userId,
                packageId,
                status: "Success",
                startDate: Temporal.PlainDate.from("2099-01-01"),
                endDate: Temporal.PlainDate.from("2099-01-01"),
            });

            const response = await request(app).delete(`/api/admin/packages/${packageId}`).set(admin());

            expect(response.status).toBe(409);
            expect(response.body.error.code).toBe("CONFLICT");
            expect(response.body.error.message).toContain("deactivate");
            expect((await request(app).get(`/api/admin/packages/${packageId}`).set(admin())).status).toBe(200);
        });
    });
});
