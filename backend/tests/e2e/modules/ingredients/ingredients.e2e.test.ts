import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import type { PortionCount } from "../../../../src/modules/ingredients/service/interfaces/portion-counts.js";
import { FilesService } from "../../../../src/modules/files/service/files.service.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import type { ObjectStorage } from "../../../../src/shared/ports/object-storage/object-storage.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createCatalogContainer } from "../../../utils/app/catalog-container.js";
import { createIngredientsContainer } from "../../../utils/app/ingredients-container.js";
import { createAuthHeaders } from "../../../utils/factory/jwt/jwt.js";

const objectStorage = {
    exists: async (key: string) => !key.includes("missing"),
    getSignedUrl: async (key: string) => `https://storage.test/${key}`,
} as unknown as ObjectStorage;

const asRole = (role: Role) => createAuthHeaders({ role, sub: { userId: randomUUID(), name: `E2E ${role}` } });

const PHOTO = "ingredients/2026/11/e2e.webp";

interface IngredientBody {
    readonly id: string;
    readonly name: string;
    readonly unit: string;
    readonly stock: number;
    readonly minimumThreshold: number;
    readonly isLowStock: boolean;
    readonly photoKey: string;
    readonly photoUrl: string;
    readonly allergies: readonly { readonly id: string; readonly name: string }[];
}

describe("ingredients routes (e2e)", () => {
    let db: Db;
    let rows: CreatedRows;
    let testApp: TestApp;
    let app: Express;
    let portionCounts: PortionCount[] = [];
    const tag = randomUUID().slice(0, 8);

    const admin = () => asRole("ADMIN");
    const kitchen = () => asRole("KITCHEN");

    async function createAllergy(name: string): Promise<string> {
        const allergy = await db.orm.public.Allergy.create({ name: `Zz E2E ${tag} ${name}` });
        return rows.track("Allergy", allergy.id);
    }

    async function createIngredients(items: Record<string, unknown>[]): Promise<IngredientBody[]> {
        const response = await request(app)
            .post("/api/admin/ingredients")
            .set(admin())
            .send({ items: items.map(item => ({ unit: "kg", photoKey: PHOTO, ...item })) });
        expect(response.status).toBe(201);
        const created = response.body.data as IngredientBody[];
        for (const ingredient of created) rows.track("Ingredient", ingredient.id);
        return created;
    }

    async function createIngredient(name: string, overrides: Record<string, unknown> = {}): Promise<IngredientBody> {
        const [created] = await createIngredients([{ name: `Zz E2E ${tag} ${name}`, ...overrides }]);
        if (created === undefined) throw new Error("no ingredient created");
        return created;
    }

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        testApp = await createTestApp({
            db,
            adapters: { objectStorage },
            mount: deps => {
                const catalog = createCatalogContainer(deps);
                return [
                    createIngredientsContainer(deps, {
                        photoKeys: new FilesService(objectStorage, deps.adapters.clock),
                        allergies: catalog.service,
                        menus: catalog.service,
                        portions: {
                            countPortionsBySchedule: async scheduleIds =>
                                portionCounts.filter(count => scheduleIds.includes(count.scheduleId)),
                        },
                    }).router,
                ];
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
        const id = randomUUID();

        it.each([
            ["get", "/api/admin/ingredients"],
            ["post", "/api/admin/ingredients"],
            ["patch", "/api/admin/ingredients"],
            ["delete", "/api/admin/ingredients"],
            ["get", `/api/admin/ingredients/${id}`],
            ["patch", `/api/admin/ingredients/${id}`],
            ["get", "/api/admin/ingredients/shopping-list"],
            ["get", "/api/kitchen/ingredients"],
            ["put", `/api/kitchen/ingredients/${id}/stock`],
        ] as const)("answers 401 to %s %s without a token", async (method, path) => {
            expect((await request(app)[method](path)).status).toBe(401);
        });

        it.each(["CUSTOMER", "KITCHEN", "COURIER"] as const)("answers 403 to a %s on the admin routes", async role => {
            expect((await request(app).get("/api/admin/ingredients").set(asRole(role))).status).toBe(403);
            expect((await request(app).post("/api/admin/ingredients").set(asRole(role)).send({})).status).toBe(403);
            expect((await request(app).patch("/api/admin/ingredients").set(asRole(role)).send({})).status).toBe(403);
            expect((await request(app).delete("/api/admin/ingredients").set(asRole(role)).send({})).status).toBe(403);
            expect((await request(app).get(`/api/admin/ingredients/${id}`).set(asRole(role))).status).toBe(403);
            expect((await request(app).get("/api/admin/ingredients/shopping-list").set(asRole(role))).status).toBe(403);
        });

        it.each(["CUSTOMER", "COURIER"] as const)("answers 403 to a %s on the kitchen routes", async role => {
            expect((await request(app).get("/api/kitchen/ingredients").set(asRole(role))).status).toBe(403);
            expect(
                (await request(app).put(`/api/kitchen/ingredients/${id}/stock`).set(asRole(role)).send({ stock: 1 }))
                    .status,
            ).toBe(403);
        });
    });

    describe("create", () => {
        it("creates a batch in request order with defaults, sorted allergies and a signed photo", async () => {
            const kacang = await createAllergy("Kacang");
            const telur = await createAllergy("Telur");

            const created = await createIngredients([
                { name: `Zz E2E ${tag} Zebra`, allergyIds: [telur, kacang] },
                { name: `Zz E2E ${tag} Alpha`, unit: "liter", stock: 2.456, minimumThreshold: 3 },
            ]);

            expect(created.map(item => item.name)).toEqual([`Zz E2E ${tag} Zebra`, `Zz E2E ${tag} Alpha`]);
            expect(created[0]).toMatchObject({
                unit: "kg",
                stock: 0,
                minimumThreshold: 10,
                isLowStock: true,
                photoKey: PHOTO,
                photoUrl: `https://storage.test/${PHOTO}`,
            });
            expect(created[0]?.allergies.map(allergy => allergy.name)).toEqual([
                `Zz E2E ${tag} Kacang`,
                `Zz E2E ${tag} Telur`,
            ]);
            expect(created[1]).toMatchObject({ unit: "liter", stock: 2.46, minimumThreshold: 3, allergies: [] });
        });

        it("answers 409 for a name that exists and writes none of the batch", async () => {
            const existing = await createIngredient("Exists");

            const response = await request(app)
                .post("/api/admin/ingredients")
                .set(admin())
                .send({
                    items: [
                        { name: `Zz E2E ${tag} Never`, unit: "kg", photoKey: PHOTO },
                        { name: existing.name, unit: "kg", photoKey: PHOTO },
                    ],
                });

            expect(response.status).toBe(409);
            expect(response.body.error.code).toBe("CONFLICT");
            const never = await request(app)
                .get("/api/admin/ingredients")
                .query({ search: `${tag} Never` })
                .set(admin());
            expect(never.body.meta.total).toBe(0);
        });

        it("answers 409 for a duplicate name inside the batch", async () => {
            const response = await request(app)
                .post("/api/admin/ingredients")
                .set(admin())
                .send({
                    items: [
                        { name: `Zz E2E ${tag} Twice`, unit: "kg", photoKey: PHOTO },
                        { name: `Zz E2E ${tag} Twice`, unit: "kg", photoKey: PHOTO },
                    ],
                });

            expect(response.status).toBe(409);
        });

        it("answers 400 UNKNOWN_ALLERGY for an allergy that does not exist", async () => {
            const response = await request(app)
                .post("/api/admin/ingredients")
                .set(admin())
                .send({
                    items: [{ name: `Zz E2E ${tag} Ghost`, unit: "kg", photoKey: PHOTO, allergyIds: [randomUUID()] }],
                });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("UNKNOWN_ALLERGY");
        });

        it("answers 400 with the item path for a photo that is not in the bucket", async () => {
            const response = await request(app)
                .post("/api/admin/ingredients")
                .set(admin())
                .send({
                    items: [
                        { name: `Zz E2E ${tag} Photo ok`, unit: "kg", photoKey: PHOTO },
                        { name: `Zz E2E ${tag} Photo gone`, unit: "kg", photoKey: "ingredients/2026/11/missing.webp" },
                    ],
                });

            expect(response.status).toBe(400);
            expect(response.body.error.issues).toEqual([
                expect.objectContaining({ path: "items.1.photoKey", code: "photo_not_found" }),
            ]);
        });

        it.each([
            ["a negative stock", { stock: -1 }],
            ["an out-of-range stock", { stock: 100000000 }],
            ["a negative threshold", { minimumThreshold: -5 }],
            ["an unknown unit", { unit: "pcs" }],
            ["a photo key outside ingredients/", { photoKey: "menus/2026/11/e2e.webp" }],
            ["a blank name", { name: "   " }],
            ["a non-uuid allergy id", { allergyIds: ["nope"] }],
        ])("answers 400 for %s", async (_, overrides) => {
            const response = await request(app)
                .post("/api/admin/ingredients")
                .set(admin())
                .send({ items: [{ name: `Zz E2E ${tag} Bad`, unit: "kg", photoKey: PHOTO, ...overrides }] });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
        });

        it("answers 400 for an empty or oversized batch", async () => {
            expect((await request(app).post("/api/admin/ingredients").set(admin()).send({ items: [] })).status).toBe(
                400,
            );
            const oversized = Array.from({ length: 101 }, (_, index) => ({
                name: `Zz E2E ${tag} Many ${index}`,
                unit: "kg",
                photoKey: PHOTO,
            }));
            expect(
                (await request(app).post("/api/admin/ingredients").set(admin()).send({ items: oversized })).status,
            ).toBe(400);
        });
    });

    describe("read", () => {
        it("gets one ingredient, 404 for an unknown id and 400 for a bad id", async () => {
            const created = await createIngredient("Get");

            const found = await request(app).get(`/api/admin/ingredients/${created.id}`).set(admin());
            const missing = await request(app).get(`/api/admin/ingredients/${randomUUID()}`).set(admin());

            expect(found.status).toBe(200);
            expect(found.body.data).toMatchObject({ id: created.id, name: created.name });
            expect(found.body.data.createdAt).toMatch(/\+07:00$/);
            expect(missing.status).toBe(404);
            expect(missing.body.error.code).toBe("INGREDIENT_NOT_FOUND");
            expect((await request(app).get("/api/admin/ingredients/not-a-uuid").set(admin())).status).toBe(400);
        });

        it("lists a page sorted by name, filtered by search and lowStock", async () => {
            const low = await createIngredient("List B low", { stock: 2, minimumThreshold: 5 });
            const enough = await createIngredient("List A enough", { stock: 50, minimumThreshold: 5 });
            const search = `e2e ${tag} list`;

            const all = await request(app).get("/api/admin/ingredients").query({ search }).set(admin());
            const onlyLow = await request(app)
                .get("/api/admin/ingredients")
                .query({ search, lowStock: "true" })
                .set(admin());
            const onlyEnough = await request(app)
                .get("/api/admin/ingredients")
                .query({ search, lowStock: "false" })
                .set(admin());
            const paged = await request(app)
                .get("/api/admin/ingredients")
                .query({ search, limit: 1, page: 2 })
                .set(admin());

            expect(all.body.data.map((item: IngredientBody) => item.id)).toEqual([enough.id, low.id]);
            expect(all.body.meta).toMatchObject({ page: 1, total: 2 });
            expect(onlyLow.body.data.map((item: IngredientBody) => item.id)).toEqual([low.id]);
            expect(onlyEnough.body.data.map((item: IngredientBody) => item.id)).toEqual([enough.id]);
            expect(paged.body.data.map((item: IngredientBody) => item.id)).toEqual([low.id]);
            expect(paged.body.meta).toMatchObject({ page: 2, limit: 1, total: 2 });
        });

        it("answers 400 for a bad query", async () => {
            expect((await request(app).get("/api/admin/ingredients?limit=0").set(admin())).status).toBe(400);
            expect((await request(app).get("/api/admin/ingredients?lowStock=maybe").set(admin())).status).toBe(400);
        });

        it("serves the same list to the kitchen and the admin", async () => {
            const created = await createIngredient("Kitchen List");
            const query = { search: `e2e ${tag} kitchen list` };

            const asKitchen = await request(app).get("/api/kitchen/ingredients").query(query).set(kitchen());
            const asAdmin = await request(app).get("/api/kitchen/ingredients").query(query).set(admin());

            expect(asKitchen.status).toBe(200);
            expect(asKitchen.body.data.map((item: IngredientBody) => item.id)).toEqual([created.id]);
            expect(asAdmin.body).toEqual(asKitchen.body);
        });
    });

    describe("update", () => {
        it("changes the given fields only and replaces the allergens", async () => {
            const kacang = await createAllergy("Update Kacang");
            const susu = await createAllergy("Update Susu");
            const created = await createIngredient("Update", { stock: 5, allergyIds: [kacang] });

            const changed = await request(app)
                .patch(`/api/admin/ingredients/${created.id}`)
                .set(admin())
                .send({ minimumThreshold: 8, allergyIds: [susu] });
            const cleared = await request(app)
                .patch(`/api/admin/ingredients/${created.id}`)
                .set(admin())
                .send({ allergyIds: [] });

            expect(changed.status).toBe(200);
            expect(changed.body.data).toMatchObject({ name: created.name, stock: 5, minimumThreshold: 8 });
            expect(changed.body.data.allergies.map((allergy: { id: string }) => allergy.id)).toEqual([susu]);
            expect(cleared.body.data.allergies).toEqual([]);
        });

        it("answers 404, 409, 400 and the photo issue path for a single update", async () => {
            const other = await createIngredient("Update Other");
            const target = await createIngredient("Update Target");
            const patch = (id: string, body: Record<string, unknown>) =>
                request(app).patch(`/api/admin/ingredients/${id}`).set(admin()).send(body);

            expect((await patch(randomUUID(), { stock: 1 })).status).toBe(404);
            expect((await patch(target.id, { name: other.name })).status).toBe(409);
            expect((await patch(target.id, {})).status).toBe(400);
            expect((await patch(target.id, { stock: -2 })).status).toBe(400);
            expect((await patch(target.id, { allergyIds: [randomUUID()] })).body.error.code).toBe("UNKNOWN_ALLERGY");

            const photo = await patch(target.id, { photoKey: "ingredients/2026/11/missing.webp" });
            expect(photo.status).toBe(400);
            expect(photo.body.error.issues).toEqual([expect.objectContaining({ path: "photoKey" })]);
        });

        it("updates a batch in request order", async () => {
            const first = await createIngredient("Batch 1", { stock: 1 });
            const second = await createIngredient("Batch 2", { stock: 1 });

            const response = await request(app)
                .patch("/api/admin/ingredients")
                .set(admin())
                .send({
                    items: [
                        { id: second.id, stock: 22 },
                        { id: first.id, stock: 11, unit: "gram" },
                    ],
                });

            expect(response.status).toBe(200);
            expect(response.body.data.map((item: IngredientBody) => [item.id, item.stock])).toEqual([
                [second.id, 22],
                [first.id, 11],
            ]);
            expect(response.body.data[1].unit).toBe("gram");
        });

        it("changes none of a batch when one id is unknown", async () => {
            const created = await createIngredient("Batch Rollback", { stock: 5 });

            const response = await request(app)
                .patch("/api/admin/ingredients")
                .set(admin())
                .send({
                    items: [
                        { id: created.id, stock: 99 },
                        { id: randomUUID(), stock: 1 },
                    ],
                });

            expect(response.status).toBe(404);
            const after = await request(app).get(`/api/admin/ingredients/${created.id}`).set(admin());
            expect(after.body.data.stock).toBe(5);
        });

        it("answers 400 for a batch item with no change, a repeated id or a missing id", async () => {
            const created = await createIngredient("Batch Bad");
            const send = (items: unknown[]) =>
                request(app).patch("/api/admin/ingredients").set(admin()).send({ items });

            expect((await send([{ id: created.id }])).status).toBe(400);
            expect(
                (
                    await send([
                        { id: created.id, stock: 1 },
                        { id: created.id, stock: 2 },
                    ])
                ).status,
            ).toBe(400);
            expect((await send([{ stock: 1 }])).status).toBe(400);
        });
    });

    describe("stock", () => {
        it("lets the kitchen and the admin set only the counted stock", async () => {
            const created = await createIngredient("Stock", { stock: 3, minimumThreshold: 10 });
            const put = (headers: Record<string, string>, stock: number) =>
                request(app).put(`/api/kitchen/ingredients/${created.id}/stock`).set(headers).send({ stock });

            const byKitchen = await put(kitchen(), 40);
            const byAdmin = await put(admin(), 1.234);

            expect(byKitchen.status).toBe(200);
            expect(byKitchen.body.data).toMatchObject({
                id: created.id,
                name: created.name,
                stock: 40,
                minimumThreshold: 10,
                isLowStock: false,
            });
            expect(byAdmin.body.data).toMatchObject({ stock: 1.23, isLowStock: true });
        });

        it("answers 400 for a negative or missing stock and 404 for an unknown ingredient", async () => {
            const created = await createIngredient("Stock Bad");
            const put = (id: string, body: Record<string, unknown>) =>
                request(app).put(`/api/kitchen/ingredients/${id}/stock`).set(kitchen()).send(body);

            expect((await put(created.id, { stock: -1 })).status).toBe(400);
            expect((await put(created.id, {})).status).toBe(400);
            expect((await put("not-a-uuid", { stock: 1 })).status).toBe(400);
            expect((await put(randomUUID(), { stock: 1 })).status).toBe(404);
        });
    });

    describe("delete", () => {
        const remove = (ids: string[]) => request(app).delete("/api/admin/ingredients").set(admin()).send({ ids });

        it("deletes a batch and answers the count", async () => {
            const first = await createIngredient("Delete 1");
            const second = await createIngredient("Delete 2");

            const response = await remove([first.id, second.id]);

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual({ deletedCount: 2 });
            expect((await request(app).get(`/api/admin/ingredients/${first.id}`).set(admin())).status).toBe(404);
        });

        it("answers 404 for an unknown id and deletes none of the batch", async () => {
            const kept = await createIngredient("Delete Kept");

            const response = await remove([kept.id, randomUUID()]);

            expect(response.status).toBe(404);
            expect((await request(app).get(`/api/admin/ingredients/${kept.id}`).set(admin())).status).toBe(200);
        });

        it("answers 409 while a menu uses the ingredient and deletes none of the batch", async () => {
            const used = await createIngredient("Delete Used");
            const free = await createIngredient("Delete Free");
            const menu = await db.orm.public.Menu.create({
                name: `Zz E2E ${tag} Menu`,
                description: "e2e menu",
                tags: [],
                photoKey: "menus/2026/11/e2e.webp",
            });
            rows.track("Menu", menu.id);
            const link = await db.orm.public.MenuIngredient.create({
                menuId: menu.id,
                ingredientId: used.id,
                quantityPerPortion: "1.00",
            });
            rows.track("MenuIngredient", link.id);

            const response = await remove([free.id, used.id]);

            expect(response.status).toBe(409);
            expect(response.body.error.code).toBe("CONFLICT");
            expect(response.body.error.message).toBe(`ingredient is used by menus: Zz E2E ${tag} Menu`);
            expect((await request(app).get(`/api/admin/ingredients/${free.id}`).set(admin())).status).toBe(200);
        });

        it("answers 400 for an empty, repeated or malformed id list", async () => {
            const id = randomUUID();

            expect((await remove([])).status).toBe(400);
            expect((await remove([id, id])).status).toBe(400);
            expect((await remove(["nope"])).status).toBe(400);
        });
    });
    describe("shopping list", () => {
        const RANGE = "from=2099-03-01&to=2099-03-07";
        const list = (query = RANGE) => request(app).get(`/api/admin/ingredients/shopping-list?${query}`).set(admin());

        async function createMenu(name: string, lines: { ingredientId: string; quantity: string }[]): Promise<string> {
            const menu = await db.orm.public.Menu.create({
                name: `Zz E2E ${tag} ${name}`,
                description: "e2e menu",
                tags: [],
                photoKey: "menus/2026/11/e2e.webp",
            });
            rows.track("Menu", menu.id);
            for (const line of lines) {
                const link = await db.orm.public.MenuIngredient.create({
                    menuId: menu.id,
                    ingredientId: line.ingredientId,
                    quantityPerPortion: line.quantity,
                });
                rows.track("MenuIngredient", link.id);
            }
            return menu.id;
        }

        async function createSchedule(
            packageId: string,
            date: string,
            menus: { menuId: string; isPrimary: boolean }[],
            isPublished = true,
        ): Promise<string> {
            const schedule = await db.orm.public.Schedule.create({
                packageId,
                date: Temporal.PlainDate.from(date),
                deliveryTime: Temporal.PlainTime.from("12:00"),
                isPublished,
            });
            rows.track("Schedule", schedule.id);
            for (const menu of menus) {
                const link = await db.orm.public.ScheduleMenu.create({ scheduleId: schedule.id, ...menu });
                rows.track("ScheduleMenu", link.id);
            }
            return schedule.id;
        }

        async function createPackage(): Promise<string> {
            const created = await db.orm.public.Package.create({
                name: `Zz E2E ${tag} Package`,
                description: "e2e package",
                basePrice: "15000.00",
                periods: ["Harian"],
                deliveryTimes: [Temporal.PlainTime.from("12:00")],
                photoKey: "packages/2026/11/e2e.webp",
            });
            return rows.track("Package", created.id);
        }

        afterEach(() => {
            portionCounts = [];
        });

        it("lists the shortage of what the paid portions need against the stock, sorted by name", async () => {
            const rice = await createIngredient("List Rice", { unit: "kg", stock: 1 });
            const tofu = await createIngredient("List Tofu", { unit: "kg", stock: 50 });
            const egg = await createIngredient("List Egg", { unit: "butir", stock: 5 });
            const primary = await createMenu("List Primary", [
                { ingredientId: rice.id, quantity: "0.10" },
                { ingredientId: egg.id, quantity: "1.00" },
            ]);
            const alternative = await createMenu("List Alternative", [
                { ingredientId: rice.id, quantity: "0.10" },
                { ingredientId: tofu.id, quantity: "0.50" },
            ]);
            const packageId = await createPackage();
            const day1 = await createSchedule(packageId, "2099-03-02", [
                { menuId: primary, isPrimary: true },
                { menuId: alternative, isPrimary: false },
            ]);
            const day2 = await createSchedule(packageId, "2099-03-03", [{ menuId: primary, isPrimary: true }]);
            portionCounts = [
                { scheduleId: day1, usesAlternativeMenu: false, portions: 8 },
                { scheduleId: day1, usesAlternativeMenu: true, portions: 2 },
                { scheduleId: day2, usesAlternativeMenu: false, portions: 10 },
            ];

            const response = await list();

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([
                {
                    ingredientId: egg.id,
                    name: egg.name,
                    unit: "butir",
                    requiredQuantity: 18,
                    currentStock: 5,
                    shortageQuantity: 13,
                },
                {
                    ingredientId: rice.id,
                    name: rice.name,
                    unit: "kg",
                    requiredQuantity: 2,
                    currentStock: 1,
                    shortageQuantity: 1,
                },
            ]);
        });

        it("ignores draft schedules and schedules outside the range", async () => {
            const rice = await createIngredient("Range Rice", { stock: 0 });
            const menu = await createMenu("Range Menu", [{ ingredientId: rice.id, quantity: "1.00" }]);
            const packageId = await createPackage();
            const draft = await createSchedule(packageId, "2099-03-04", [{ menuId: menu, isPrimary: true }], false);
            const outside = await createSchedule(packageId, "2099-03-20", [{ menuId: menu, isPrimary: true }]);
            portionCounts = [
                { scheduleId: draft, usesAlternativeMenu: false, portions: 5 },
                { scheduleId: outside, usesAlternativeMenu: false, portions: 5 },
            ];

            const response = await list();

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
        });

        it("answers an empty list when no portion is paid", async () => {
            const rice = await createIngredient("Empty Rice", { stock: 0 });
            const menu = await createMenu("Empty Menu", [{ ingredientId: rice.id, quantity: "1.00" }]);
            await createSchedule(await createPackage(), "2099-03-05", [{ menuId: menu, isPrimary: true }]);

            const response = await list();

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
        });

        it("defaults to next week when no range is sent", async () => {
            const response = await list("");

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it.each([
            ["a range over 31 days", "from=2099-03-01&to=2099-04-01"],
            ["a reversed range", "from=2099-03-07&to=2099-03-01"],
            ["a malformed date", "from=01-03-2099"],
            ["an impossible date", "to=2099-02-30"],
        ])("answers 400 for %s", async (_label, query) => {
            const response = await list(query);

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
        });
    });
});
