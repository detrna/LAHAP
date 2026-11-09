import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import type { SubscriptionPeriod } from "../../../../src/modules/catalog/domain/schedule-moves.js";
import type { OrderActivity } from "../../../../src/modules/catalog/service/interfaces/order-activity.js";
import { FilesService } from "../../../../src/modules/files/service/files.service.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import type { ObjectStorage } from "../../../../src/shared/ports/object-storage/object-storage.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createCatalogContainer } from "../../../utils/app/catalog-container.js";
import { createIngredientsContainer } from "../../../utils/app/ingredients-container.js";
import { createUsersContainer } from "../../../utils/app/users-container.js";
import { createAuthHeaders } from "../../../utils/factory/jwt/jwt.js";
import { createTestSchedule } from "../../../utils/fixtures/schedules.js";
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
        paidSchedules: [] as string[],
        alternativesInUse: [] as string[],
        periods: [] as SubscriptionPeriod[],
        inactiveSlotsDeleted: [] as (readonly string[])[],
        asserted: [] as unknown[],
    };
    const activity: OrderActivity = {
        countActiveSubscribers: async ids => new Map(ids.map(id => [id, orderActivity.subscriberCounts.get(id) ?? 0])),
        findSchedulesWithOrders: async (ids, statuses) => {
            orderActivity.asserted.push(statuses);
            const held = statuses.includes("Pending")
                ? [...orderActivity.schedulesWithOrders, ...orderActivity.paidSchedules]
                : orderActivity.paidSchedules;
            return ids.filter(id => held.includes(id));
        },
        findSchedulesUsingAlternative: async ids => ids.filter(id => orderActivity.alternativesInUse.includes(id)),
        findSubscriptionPeriods: async ids => orderActivity.periods.filter(period => ids.includes(period.scheduleId)),
        deleteInactiveSlots: async ids => {
            orderActivity.inactiveSlotsDeleted.push(ids);
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
            mount: deps => {
                const photoKeys = new FilesService(objectStorage, deps.adapters.clock);
                const users = createUsersContainer(deps);
                const catalog = createCatalogContainer(deps, {
                    photoKeys,
                    ingredients: {
                        findMissingIngredientIds: ids => ingredients.service.findMissingIngredientIds(ids),
                        getIngredientsByIds: ids => ingredients.service.getIngredientsByIds(ids),
                        getAllergyIdsByIngredientIds: ids => ingredients.service.getAllergyIdsByIngredientIds(ids),
                    },
                    orderActivity: activity,
                    cooks: {
                        filterActiveUserIds: (ids, role) => users.service.filterActiveUserIds(ids, role),
                        getSummaries: ids => users.service.getSummaries(ids),
                    },
                });
                const ingredients = createIngredientsContainer(deps, {
                    photoKeys,
                    allergies: catalog.service,
                    menus: catalog.service,
                });
                return [catalog.router];
            },
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
            ["get", "/api/admin/menus"],
            ["post", "/api/admin/menus"],
            ["patch", `/api/admin/menus/${randomUUID()}`],
            ["delete", `/api/admin/menus/${randomUUID()}`],
            ["get", "/api/admin/menu-schedules"],
            ["post", "/api/admin/menu-schedules"],
            ["patch", "/api/admin/menu-schedules"],
            ["delete", "/api/admin/menu-schedules"],
            ["post", "/api/admin/menu-schedules/publish"],
            ["get", `/api/admin/menu-schedules/${randomUUID()}`],
            ["patch", `/api/admin/menu-schedules/${randomUUID()}`],
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
            const createSchedule = (packageId: string, date: string, deliveryTime: string) =>
                createTestSchedule(db, rows, { packageId, date, deliveryTime });

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
    describe("menus", () => {
        let allergyId: string;
        const ingredientIds: string[] = [];

        const validMenu = (name: string, overrides: Record<string, unknown> = {}) => ({
            name: `Zz E2E ${tag} ${name}`,
            description: "e2e menu",
            photoKey: "menus/2026/11/e2e.webp",
            ingredients: [{ ingredientId: ingredientIds[0], quantityPerPortion: 0.25 }],
            ...overrides,
        });

        beforeAll(async () => {
            allergyId = await createAllergy(`Zz E2E ${tag} Telur`);
            for (const name of ["Telur", "Beras"]) {
                const ingredient = await db.orm.public.Ingredient.create({
                    name: `Zz E2E ${tag} ${name}`,
                    unit: "kg",
                    photoKey: "ingredients/2026/11/e2e.webp",
                });
                ingredientIds.push(rows.track("Ingredient", ingredient.id));
            }
            const link = await db.orm.public.IngredientAllergy.create({
                ingredientId: ingredientIds[0] ?? "",
                allergyId,
            });
            rows.track("IngredientAllergy", link.id);
        });

        it("creates a menu whose allergies come from its ingredients", async () => {
            const response = await request(app)
                .post("/api/admin/menus")
                .set(admin())
                .send(
                    validMenu("Nasi Telur", {
                        tags: ["Pedas"],
                        ingredients: [
                            { ingredientId: ingredientIds[0], quantityPerPortion: 0.25 },
                            { ingredientId: ingredientIds[1], quantityPerPortion: 0.1 },
                        ],
                    }),
                );

            expect(response.status).toBe(201);
            const id = rows.track("Menu", response.body.data.id);
            expect(response.body.data).toMatchObject({
                id,
                isAlternative: false,
                tags: ["Pedas"],
                photoUrl: "https://storage.test/menus/2026/11/e2e.webp",
                allergies: [expect.objectContaining({ id: allergyId })],
            });
            expect(response.body.data.ingredients).toHaveLength(2);
            expect(response.body.data.ingredients[0].ingredient).toMatchObject({ unit: "kg" });

            const read = await request(app).get(`/api/admin/menus/${id}`).set(admin());
            expect(read.status).toBe(200);
            expect(read.body.data.allergies).toEqual(response.body.data.allergies);
        });

        it("answers 400 UNKNOWN_INGREDIENT for an ingredient that doesn't exist", async () => {
            const response = await request(app)
                .post("/api/admin/menus")
                .set(admin())
                .send(validMenu("Unknown", { ingredients: [{ ingredientId: randomUUID(), quantityPerPortion: 1 }] }));

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("UNKNOWN_INGREDIENT");
        });

        it("lists menus with filters, updates and deletes one", async () => {
            const created = await request(app)
                .post("/api/admin/menus")
                .set(admin())
                .send(validMenu("Lifecycle", { isAlternative: true }));
            const id = rows.track("Menu", created.body.data.id);

            const listed = await request(app)
                .get("/api/admin/menus")
                .query({ search: `${tag} Lifecycle`, isAlternative: "true" })
                .set(admin());
            expect(listed.status).toBe(200);
            expect(listed.body.data.map((menu: { id: string }) => menu.id)).toEqual([id]);

            const updated = await request(app)
                .patch(`/api/admin/menus/${id}`)
                .set(admin())
                .send({ ingredients: [{ ingredientId: ingredientIds[1], quantityPerPortion: 2 }] });
            expect(updated.status).toBe(200);
            expect(updated.body.data.allergies).toEqual([]);

            expect((await request(app).delete(`/api/admin/menus/${id}`).set(admin())).status).toBe(204);
            expect((await request(app).get(`/api/admin/menus/${id}`).set(admin())).status).toBe(404);
        });

        it("creates, updates, clears, and validates menu components and cook assignments", async () => {
            const cookId = await createTestUser(db, rows, { name: `Zz E2E ${tag} Cook`, role: "KITCHEN" });
            const customerId = await createTestUser(db, rows, { name: `Zz E2E ${tag} Customer`, role: "CUSTOMER" });

            const created = await request(app)
                .post("/api/admin/menus")
                .set(admin())
                .send(
                    validMenu("Paket Komplit", {
                        components: [{ name: "Nasi Merah", cookId }, { name: "Sambal Matah" }],
                    }),
                );

            expect(created.status).toBe(201);
            const id = rows.track("Menu", created.body.data.id);
            expect(created.body.data.components).toEqual([
                expect.objectContaining({
                    name: "Nasi Merah",
                    cook: expect.objectContaining({ id: cookId, name: `Zz E2E ${tag} Cook` }),
                }),
                expect.objectContaining({
                    name: "Sambal Matah",
                    cook: null,
                }),
            ]);

            const replaced = await request(app)
                .patch(`/api/admin/menus/${id}`)
                .set(admin())
                .send({ components: [{ name: "Lalab", cookId }] });
            expect(replaced.status).toBe(200);
            expect(replaced.body.data.components).toEqual([
                expect.objectContaining({
                    name: "Lalab",
                    cook: expect.objectContaining({ id: cookId }),
                }),
            ]);

            const cleared = await request(app).patch(`/api/admin/menus/${id}`).set(admin()).send({ components: [] });
            expect(cleared.status).toBe(200);
            expect(cleared.body.data.components).toEqual([]);

            const nonKitchen = await request(app)
                .patch(`/api/admin/menus/${id}`)
                .set(admin())
                .send({ components: [{ name: "Nasi Merah", cookId: customerId }] });
            expect(nonKitchen.status).toBe(422);
            expect(nonKitchen.body.error).toMatchObject({
                code: "INVALID_STATE",
                message: "cook is not an active kitchen staff",
            });
        });
    });

    describe("menu schedules", () => {
        let packageId: string;
        let primaryId: string;
        let alternativeId: string;
        let otherId: string;

        const createMenu = async (name: string, isAlternative: boolean) => {
            const response = await request(app)
                .post("/api/admin/menus")
                .set(admin())
                .send({
                    name: `Zz E2E ${tag} Schedule ${name}`,
                    description: "",
                    isAlternative,
                    photoKey: "menus/2026/11/e2e.webp",
                    ingredients: [{ ingredientId, quantityPerPortion: 1 }],
                });
            expect(response.status).toBe(201);
            return rows.track("Menu", response.body.data.id);
        };
        let ingredientId: string;

        const createSchedules = async (items: Record<string, unknown>[]) => {
            const response = await request(app)
                .post("/api/admin/menu-schedules")
                .set(admin())
                .send({
                    items: items.map(item => ({ packageId, deliveryTime: "07:00", primaryMenuId: primaryId, ...item })),
                });
            expect(response.status).toBe(201);
            return (response.body.data as { id: string }[]).map(schedule => rows.track("Schedule", schedule.id));
        };

        beforeAll(async () => {
            const ingredient = await db.orm.public.Ingredient.create({
                name: `Zz E2E ${tag} Schedule ingredient`,
                unit: "gram",
                photoKey: "ingredients/2026/11/e2e.webp",
            });
            ingredientId = rows.track("Ingredient", ingredient.id);
            primaryId = await createMenu("Primary", false);
            alternativeId = await createMenu("Alternative", true);
            otherId = await createMenu("Other", false);
            packageId = (await createPackage("Schedules")).id;
        });

        it("creates schedules with menus, and reads them back", async () => {
            const response = await request(app)
                .post("/api/admin/menu-schedules")
                .set(admin())
                .send({
                    items: [
                        {
                            packageId,
                            date: "2099-03-01",
                            deliveryTime: "12:00",
                            primaryMenuId: primaryId,
                            alternativeMenuId: alternativeId,
                        },
                    ],
                });

            expect(response.status).toBe(201);
            const [schedule] = response.body.data;
            const id = rows.track("Schedule", schedule.id);
            expect(schedule).toMatchObject({
                packageId,
                date: "2099-03-01",
                deliveryTime: { time: "12:00", range: "Siang" },
                isPublished: false,
                menus: [
                    { menuId: primaryId, isPrimary: true },
                    { menuId: alternativeId, isPrimary: false },
                ],
            });
            expect(schedule.menus[0].menu).toMatchObject({ id: primaryId, allergies: [] });
            expect(schedule.menus[0].menu).not.toHaveProperty("ingredients");

            const read = await request(app).get(`/api/admin/menu-schedules/${id}`).set(admin());
            expect(read.status).toBe(200);
            expect(read.body.data.id).toBe(id);
        });

        it("answers 400 with item paths, UNKNOWN_MENU, and 409 for a taken slot", async () => {
            const invalid = await request(app)
                .post("/api/admin/menu-schedules")
                .set(admin())
                .send({
                    items: [
                        { packageId, date: "2020-01-01", deliveryTime: "09:00", primaryMenuId: primaryId },
                        {
                            packageId,
                            date: "2099-03-02",
                            deliveryTime: "07:00",
                            primaryMenuId: primaryId,
                            alternativeMenuId: otherId,
                        },
                    ],
                });
            expect(invalid.status).toBe(400);
            expect(
                invalid.body.error.issues.map((issue: { path: string; code: string }) => [issue.path, issue.code]),
            ).toEqual([
                ["items.0.deliveryTime", "unknown_delivery_time"],
                ["items.0.date", "date_in_past"],
                ["items.1.alternativeMenuId", "not_alternative"],
            ]);

            const unknown = await request(app)
                .post("/api/admin/menu-schedules")
                .set(admin())
                .send({
                    items: [{ packageId, date: "2099-03-02", deliveryTime: "07:00", primaryMenuId: randomUUID() }],
                });
            expect(unknown.status).toBe(400);
            expect(unknown.body.error.code).toBe("UNKNOWN_MENU");

            await createSchedules([{ date: "2099-03-03" }]);
            const taken = await request(app)
                .post("/api/admin/menu-schedules")
                .set(admin())
                .send({
                    items: [
                        { packageId, date: "2099-03-04", deliveryTime: "07:00", primaryMenuId: primaryId },
                        { packageId, date: "2099-03-03", deliveryTime: "07:00", primaryMenuId: primaryId },
                    ],
                });
            expect(taken.status).toBe(409);
            const rolledBack = await request(app)
                .get("/api/admin/menu-schedules")
                .query({ packageId, from: "2099-03-04", to: "2099-03-04" })
                .set(admin());
            expect(rolledBack.body.data).toEqual([]);
        });

        it("publishes by id and range, then shows only published schedules to customers", async () => {
            const [first, second] = await createSchedules([{ date: "2099-04-01" }, { date: "2099-04-02" }]);

            const byId = await request(app)
                .post("/api/admin/menu-schedules/publish")
                .set(admin())
                .send({ ids: [first] });
            expect(byId.body.data).toEqual({ updatedCount: 1 });

            const publicList = await request(app)
                .get(`/api/packages/${packageId}/schedules`)
                .query({ from: "2099-04-01", to: "2099-04-02" });
            expect(publicList.status).toBe(200);
            expect(publicList.body.data.map((schedule: { id: string }) => schedule.id)).toEqual([first]);

            const byRange = await request(app)
                .post("/api/admin/menu-schedules/publish")
                .set(admin())
                .send({ packageId, from: "2099-04-01", to: "2099-04-02" });
            expect(byRange.body.data).toEqual({ updatedCount: 2 });

            const drafts = await request(app)
                .get("/api/admin/menu-schedules")
                .query({ packageId, from: "2099-04-01", to: "2099-04-02", isPublished: "true" })
                .set(admin());
            expect(drafts.body.data.map((schedule: { id: string }) => schedule.id)).toEqual([first, second]);
            expect(drafts.body.meta.total).toBe(2);

            const tooLong = await request(app)
                .get(`/api/packages/${packageId}/schedules`)
                .query({ from: "2099-01-01", to: "2099-12-31" });
            expect(tooLong.status).toBe(400);
        });

        it("shows staff each cook's id and name, and the public only component names and allergies", async () => {
            const cookId = await createTestUser(db, rows, { name: `Zz E2E ${tag} Schedule Cook`, role: "KITCHEN" });
            const allergy = await db.orm.public.Allergy.create({ name: `Zz E2E ${tag} Schedule Kacang` });
            rows.track("Allergy", allergy.id);
            const link = await db.orm.public.IngredientAllergy.create({ ingredientId, allergyId: allergy.id });
            rows.track("IngredientAllergy", link.id);
            const menu = await request(app)
                .post("/api/admin/menus")
                .set(admin())
                .send({
                    name: `Zz E2E ${tag} Schedule Cooked`,
                    description: "",
                    isAlternative: false,
                    photoKey: "menus/2026/11/e2e.webp",
                    ingredients: [{ ingredientId, quantityPerPortion: 1 }],
                    components: [{ name: "Ayam Bakar", cookId }, { name: "Sambal" }],
                });
            expect(menu.status).toBe(201);
            const menuId = rows.track("Menu", menu.body.data.id);
            const [scheduleId] = await createSchedules([
                { date: "2099-04-10", primaryMenuId: menuId, isPublished: true },
            ]);

            const staff = await request(app).get(`/api/admin/menu-schedules/${scheduleId}`).set(admin());
            expect(staff.status).toBe(200);
            expect(staff.body.data.menus[0].menu.components).toEqual([
                {
                    id: expect.any(String),
                    name: "Ayam Bakar",
                    cook: { id: cookId, name: `Zz E2E ${tag} Schedule Cook` },
                },
                { id: expect.any(String), name: "Sambal", cook: null },
            ]);

            const publicList = await request(app)
                .get(`/api/packages/${packageId}/schedules`)
                .query({ from: "2099-04-10", to: "2099-04-10" });
            expect(publicList.status).toBe(200);
            const publicMenu = publicList.body.data[0].menus[0].menu;
            expect(publicMenu.components).toEqual([
                { id: expect.any(String), name: "Ayam Bakar" },
                { id: expect.any(String), name: "Sambal" },
            ]);
            expect(publicMenu.allergies).toEqual([expect.objectContaining({ id: allergy.id })]);
            expect(publicMenu).not.toHaveProperty("ingredients");
            const raw = JSON.stringify(publicList.body);
            expect(raw).not.toContain(cookId);
            expect(raw).not.toContain('"phone"');
            expect(raw).not.toContain('"cook"');
        });

        it("updates schedules in a batch and alone", async () => {
            const [first, second] = await createSchedules([
                { date: "2099-05-01", alternativeMenuId: alternativeId },
                { date: "2099-05-02" },
            ]);

            const batch = await request(app)
                .patch("/api/admin/menu-schedules")
                .set(admin())
                .send({
                    items: [
                        { id: first, alternativeMenuId: null, packageId: randomUUID() },
                        { id: second, deliveryTime: "18:30", primaryMenuId: otherId },
                    ],
                });
            expect(batch.status).toBe(200);
            expect(batch.body.data[0]).toMatchObject({ packageId, menus: [{ menuId: primaryId, isPrimary: true }] });
            expect(batch.body.data[1]).toMatchObject({ deliveryTime: { time: "18:30" }, menus: [{ menuId: otherId }] });

            const single = await request(app)
                .patch(`/api/admin/menu-schedules/${first}`)
                .set(admin())
                .send({ date: "2099-05-05" });
            expect(single.status).toBe(200);
            expect(single.body.data.date).toBe("2099-05-05");

            const missing = await request(app)
                .patch(`/api/admin/menu-schedules/${randomUUID()}`)
                .set(admin())
                .send({ isPublished: true });
            expect(missing.status).toBe(404);
            expect(missing.body.error.code).toBe("MENU_SCHEDULE_NOT_FOUND");
        });

        it("guards schedules that have orders", async () => {
            const [held] = await createSchedules([{ date: "2099-06-10", alternativeMenuId: alternativeId }]);
            orderActivity.paidSchedules.push(held ?? "");
            orderActivity.alternativesInUse.push(held ?? "");
            orderActivity.periods.push({
                scheduleId: held ?? "",
                startDate: Temporal.PlainDate.from("2099-06-08"),
                endDate: Temporal.PlainDate.from("2099-06-14"),
            });

            const noReason = await request(app)
                .patch(`/api/admin/menu-schedules/${held}`)
                .set(admin())
                .send({ primaryMenuId: otherId });
            expect(noReason.status).toBe(400);
            expect(noReason.body.error.issues[0]).toMatchObject({
                path: "changeReason",
                code: "change_reason_required",
            });

            const outside = await request(app)
                .patch(`/api/admin/menu-schedules/${held}`)
                .set(admin())
                .send({ date: "2099-06-20", changeReason: "libur" });
            expect(outside.status).toBe(422);
            expect(outside.body.error.message).toBe("new date is outside a subscription period");

            const removeAlternative = await request(app)
                .patch(`/api/admin/menu-schedules/${held}`)
                .set(admin())
                .send({ alternativeMenuId: null, changeReason: "habis" });
            expect(removeAlternative.status).toBe(422);
            expect(removeAlternative.body.error.message).toBe("alternative menu is used by orders");

            const moved = await request(app)
                .patch(`/api/admin/menu-schedules/${held}`)
                .set(admin())
                .send({ date: "2099-06-12", changeReason: "libur" });
            expect(moved.status).toBe(200);

            const deleted = await request(app)
                .delete("/api/admin/menu-schedules")
                .set(admin())
                .send({ ids: [held] });
            expect(deleted.status).toBe(409);
        });

        it("deletes schedules without active orders after dropping their dead slots", async () => {
            const ids = await createSchedules([{ date: "2099-07-01" }, { date: "2099-07-02" }]);

            const response = await request(app).delete("/api/admin/menu-schedules").set(admin()).send({ ids });

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual({ deletedCount: 2 });
            expect(orderActivity.inactiveSlotsDeleted.at(-1)).toEqual(ids);
            const gone = await request(app).delete("/api/admin/menu-schedules").set(admin()).send({ ids });
            expect(gone.status).toBe(404);
        });

        it("refuses to delete a menu a schedule uses", async () => {
            await createSchedules([{ date: "2099-08-01" }]);

            const response = await request(app).delete(`/api/admin/menus/${primaryId}`).set(admin());

            expect(response.status).toBe(409);
        });

        it("renames a package meal time and moves its future schedules", async () => {
            const renamed = (await createPackage("Rename")).id;
            const [schedule] = (
                await request(app)
                    .post("/api/admin/menu-schedules")
                    .set(admin())
                    .send({
                        items: [
                            { packageId: renamed, date: "2099-09-01", deliveryTime: "12:00", primaryMenuId: primaryId },
                        ],
                    })
            ).body.data.map((item: { id: string }) => rows.track("Schedule", item.id));

            const response = await request(app)
                .patch(`/api/admin/packages/${renamed}`)
                .set(admin())
                .send({ deliveryTimeChanges: [{ from: "12:00", to: "12:30" }] });

            expect(response.status).toBe(200);
            expect(response.body.data.deliveryTimes.map((time: { time: string }) => time.time)).toEqual([
                "07:00",
                "12:30",
                "18:30",
            ]);
            const moved = await request(app).get(`/api/admin/menu-schedules/${schedule}`).set(admin());
            expect(moved.body.data.deliveryTime.time).toBe("12:30");

            const both = await request(app)
                .patch(`/api/admin/packages/${renamed}`)
                .set(admin())
                .send({ deliveryTimes: ["07:00"], deliveryTimeChanges: [{ from: "07:00", to: "08:00" }] });
            expect(both.status).toBe(400);
        });
    });
});
