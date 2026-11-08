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
import {
    LowConfidenceReceiptError,
    NoReceiptItemsFoundError,
    ReceiptExtractorProviderError,
    type ReceiptData,
    type ReceiptExtractInput,
    type ReceiptExtractor,
} from "../../../../src/shared/ports/receipt-extractor/receipt-extractor.js";
import {
    LowConfidenceError,
    StockLevelEstimatorProviderError,
    type StockLevelEstimateInput,
    type StockLevelEstimateOutput,
    type StockLevelEstimator,
} from "../../../../src/shared/ports/stock-level-estimator/stock-level-estimator.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createCatalogContainer } from "../../../utils/app/catalog-container.js";
import { createIngredientsContainer } from "../../../utils/app/ingredients-container.js";
import { createAuthHeaders } from "../../../utils/factory/jwt/jwt.js";
import { createTestMenu, createTestSchedule, type TestRecipeLine } from "../../../utils/fixtures/schedules.js";
import { createTestPackage } from "../../../utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../utils/fixtures/users.js";

const objectStorage = {
    exists: async (key: string) => !key.includes("missing"),
    getSignedUrl: async (key: string) => `https://storage.test/${key}`,
} as unknown as ObjectStorage;

const countTwoBottles = async (): Promise<StockLevelEstimateOutput> => ({
    item: { name: "ignored", quantity: 2, unit: "bottle" },
});
let estimateResult = countTwoBottles;
const estimateCalls: StockLevelEstimateInput[] = [];
const stockLevelEstimator: StockLevelEstimator = {
    estimate: async input => {
        estimateCalls.push(input);
        return estimateResult();
    },
};

const defaultExtract = async (input: ReceiptExtractInput): Promise<ReceiptData> => ({
    items: input.ingredients.slice(0, 1).map(item => ({ ...item, quantity: 5 })),
});
let extractResult: (input: ReceiptExtractInput) => Promise<ReceiptData> = defaultExtract;
const extractCalls: ReceiptExtractInput[] = [];
const receiptExtractor: ReceiptExtractor = {
    extract: async input => {
        extractCalls.push(input);
        return extractResult(input);
    },
};

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const UPLOAD_MAX_BYTES = 1024;

const asRole = (role: Role, userId: string = randomUUID(), name = `E2E ${role}`) =>
    createAuthHeaders({ role, sub: { userId, name } });

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
    let adminId: string;
    let kitchenId: string;
    let portionCounts: PortionCount[] = [];
    const tag = randomUUID().slice(0, 8);

    const admin = () => asRole("ADMIN", adminId, "Admin Satu");
    const kitchen = () => asRole("KITCHEN", kitchenId, "Dapur Satu");

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
        adminId = await createTestUser(db, rows, { role: "ADMIN", name: "Admin Satu" });
        kitchenId = await createTestUser(db, rows, { role: "KITCHEN", name: "Dapur Satu" });
        testApp = await createTestApp({
            db,
            adapters: { objectStorage, stockLevelEstimator, receiptExtractor },
            http: { UPLOAD_MAX_BYTES },
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
                        users: {
                            getSummaries: async userIds => {
                                const users = await db.orm.public.User.where(user => user.id.in([...userIds])).all();
                                return users.map(user => ({
                                    id: user.id,
                                    name: user.name,
                                    phone: user.phone,
                                    role: user.role as Role,
                                }));
                            },
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
            ["get", `/api/kitchen/ingredients/${id}/stock-history`],
            ["put", `/api/kitchen/ingredients/${id}/stock`],
            ["post", `/api/kitchen/ingredients/${id}/photo-estimate`],
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
                (await request(app).get(`/api/kitchen/ingredients/${id}/stock-history`).set(asRole(role))).status,
            ).toBe(403);
            expect(
                (await request(app).put(`/api/kitchen/ingredients/${id}/stock`).set(asRole(role)).send({ stock: 1 }))
                    .status,
            ).toBe(403);
            expect(
                (
                    await request(app)
                        .post(`/api/kitchen/ingredients/${id}/photo-estimate`)
                        .set(asRole(role))
                        .attach("image", PNG, "photo.png")
                ).status,
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
            await createTestMenu(db, rows, {
                name: `Zz E2E ${tag} Menu`,
                ingredients: [{ ingredientId: used.id, quantityPerPortion: 1 }],
            });

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

        const createMenu = (name: string, ingredients: TestRecipeLine[]): Promise<string> =>
            createTestMenu(db, rows, { name: `Zz E2E ${tag} ${name}`, ingredients });

        const createSchedule = (
            packageId: string,
            date: string,
            menus: { primaryMenuId: string; alternativeMenuId?: string },
            isPublished = true,
        ): Promise<string> =>
            createTestSchedule(db, rows, { packageId, date, deliveryTime: "12:00", isPublished, ...menus });

        const createPackage = (): Promise<string> =>
            createTestPackage(db, rows, { name: `Zz E2E ${tag} Package`, deliveryTimes: ["12:00"] });

        afterEach(() => {
            portionCounts = [];
        });

        it("lists the shortage of what the paid portions need against the stock, sorted by name", async () => {
            const rice = await createIngredient("List Rice", { unit: "kg", stock: 1 });
            const tofu = await createIngredient("List Tofu", { unit: "kg", stock: 50 });
            const egg = await createIngredient("List Egg", { unit: "butir", stock: 5 });
            const primary = await createMenu("List Primary", [
                { ingredientId: rice.id, quantityPerPortion: 0.1 },
                { ingredientId: egg.id, quantityPerPortion: 1 },
            ]);
            const alternative = await createMenu("List Alternative", [
                { ingredientId: rice.id, quantityPerPortion: 0.1 },
                { ingredientId: tofu.id, quantityPerPortion: 0.5 },
            ]);
            const packageId = await createPackage();
            const day1 = await createSchedule(packageId, "2099-03-02", {
                primaryMenuId: primary,
                alternativeMenuId: alternative,
            });
            const day2 = await createSchedule(packageId, "2099-03-03", { primaryMenuId: primary });
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
            const menu = await createMenu("Range Menu", [{ ingredientId: rice.id, quantityPerPortion: 1 }]);
            const packageId = await createPackage();
            const draft = await createSchedule(packageId, "2099-03-04", { primaryMenuId: menu }, false);
            const outside = await createSchedule(packageId, "2099-03-20", { primaryMenuId: menu });
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
            const menu = await createMenu("Empty Menu", [{ ingredientId: rice.id, quantityPerPortion: 1 }]);
            await createSchedule(await createPackage(), "2099-03-05", { primaryMenuId: menu });

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

    describe("photo estimate", () => {
        const estimate = (id: string, headers: Record<string, string>, file: Buffer | null, name = "photo.png") => {
            const call = request(app).post(`/api/kitchen/ingredients/${id}/photo-estimate`).set(headers);
            return file === null ? call : call.attach("image", file, name);
        };

        afterEach(() => {
            estimateResult = countTwoBottles;
            estimateCalls.length = 0;
        });

        it("answers the counted containers in the ingredient's unit and saves nothing", async () => {
            const created = await createIngredient("Minyak Estimate", { unit: "liter", stock: 7 });

            const byKitchen = await estimate(created.id, kitchen(), PNG);
            const byAdmin = await estimate(created.id, admin(), PNG);

            expect(byKitchen.status).toBe(200);
            expect(byKitchen.body).toEqual({
                data: { ingredientId: created.id, estimatedQuantity: 2, unit: "liter" },
            });
            expect(byAdmin.status).toBe(200);
            expect(estimateCalls[0]).toMatchObject({
                mimeType: "image/png",
                ingredient: { name: created.name, unit: "liter" },
            });
            expect(estimateCalls[0]?.image.equals(PNG)).toBe(true);
            const after = await request(app).get(`/api/admin/ingredients/${created.id}`).set(admin());
            expect(after.body.data.stock).toBe(7);
        });

        it("answers 400 without an image and for a bad id", async () => {
            const created = await createIngredient("Estimate No Image");

            const missing = await estimate(created.id, kitchen(), null);
            const badId = await estimate("not-a-uuid", kitchen(), PNG);

            expect(missing.status).toBe(400);
            expect(missing.body.error.code).toBe("VALIDATION_ERROR");
            expect(badId.status).toBe(400);
            expect(estimateCalls).toHaveLength(0);
        });

        it("answers 415 for a file that is not an image and 413 above the upload limit", async () => {
            const created = await createIngredient("Estimate Bad File");

            const text = await estimate(created.id, kitchen(), Buffer.from("just text"), "photo.png");
            const large = await estimate(
                created.id,
                kitchen(),
                Buffer.concat([PNG, Buffer.alloc(UPLOAD_MAX_BYTES)]),
                "photo.png",
            );

            expect(text.status).toBe(415);
            expect(text.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
            expect(large.status).toBe(413);
            expect(large.body.error.code).toBe("PAYLOAD_TOO_LARGE");
            expect(estimateCalls).toHaveLength(0);
        });

        it("answers 404 for an unknown ingredient without calling the estimator", async () => {
            const response = await estimate(randomUUID(), kitchen(), PNG);

            expect(response.status).toBe(404);
            expect(response.body.error.code).toBe("INGREDIENT_NOT_FOUND");
            expect(estimateCalls).toHaveLength(0);
        });

        it("passes the estimator's errors through", async () => {
            const created = await createIngredient("Estimate Errors");

            estimateResult = async () => {
                throw new LowConfidenceError("low confidence estimation");
            };
            const lowConfidence = await estimate(created.id, kitchen(), PNG);
            estimateResult = async () => {
                throw new StockLevelEstimatorProviderError("stock level estimator provider request failed");
            };
            const providerDown = await estimate(created.id, kitchen(), PNG);

            expect(lowConfidence.status).toBe(400);
            expect(lowConfidence.body.error.code).toBe("LOW_CONFIDENCE");
            expect(providerDown.status).toBe(502);
            expect(providerDown.body.error.code).toBe("STOCK_LEVEL_ESTIMATOR_PROVIDER_ERROR");
        });
    });

    describe("stock history", () => {
        it("records initial positive stock, admin patches and kitchen counts with hydrated actors, skipping unchanged stock", async () => {
            const zero = await createIngredient("History Zero", { stock: 0 });
            const tracked = await createIngredient("History Tracked", { stock: 10 });

            await request(app)
                .patch(`/api/admin/ingredients/${tracked.id}`)
                .set(admin())
                .send({ stock: 10, minimumThreshold: 4 });
            await request(app).patch(`/api/admin/ingredients/${tracked.id}`).set(admin()).send({ stock: 25.5 });
            await request(app).put(`/api/kitchen/ingredients/${tracked.id}/stock`).set(kitchen()).send({ stock: 18.2 });

            const zeroHistory = await request(app)
                .get(`/api/kitchen/ingredients/${zero.id}/stock-history`)
                .set(kitchen());
            const firstPage = await request(app)
                .get(`/api/kitchen/ingredients/${tracked.id}/stock-history`)
                .query({ page: 1, limit: 2 })
                .set(kitchen());
            const secondPage = await request(app)
                .get(`/api/kitchen/ingredients/${tracked.id}/stock-history`)
                .query({ page: 2, limit: 2 })
                .set(admin());

            expect(zeroHistory.status).toBe(200);
            expect(zeroHistory.body.data).toEqual([]);
            expect(zeroHistory.body.meta).toMatchObject({ page: 1, limit: 20, total: 0, totalPages: 0 });

            expect(firstPage.status).toBe(200);
            expect(firstPage.body.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
            expect(firstPage.body.data).toMatchObject([
                {
                    ingredientId: tracked.id,
                    previousStock: 25.5,
                    newStock: 18.2,
                    delta: -7.3,
                    changedBy: { id: kitchenId, name: "Dapur Satu", role: "KITCHEN" },
                },
                {
                    ingredientId: tracked.id,
                    previousStock: 10,
                    newStock: 25.5,
                    delta: 15.5,
                    changedBy: { id: adminId, name: "Admin Satu", role: "ADMIN" },
                },
            ]);
            expect(firstPage.body.data[0].changedAt).toMatch(/\+07:00$/);

            expect(secondPage.status).toBe(200);
            expect(secondPage.body.meta).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
            expect(secondPage.body.data).toMatchObject([
                {
                    ingredientId: tracked.id,
                    previousStock: 0,
                    newStock: 10,
                    delta: 10,
                    changedBy: { id: adminId, name: "Admin Satu", role: "ADMIN" },
                },
            ]);
        });

        it("answers 404 for an unknown ingredient and 400 for a bad id or query", async () => {
            const created = await createIngredient("History Errors");

            const missing = await request(app)
                .get(`/api/kitchen/ingredients/${randomUUID()}/stock-history`)
                .set(kitchen());
            const badId = await request(app).get("/api/kitchen/ingredients/not-a-uuid/stock-history").set(kitchen());
            const badQuery = await request(app)
                .get(`/api/kitchen/ingredients/${created.id}/stock-history?limit=0`)
                .set(kitchen());

            expect(missing.status).toBe(404);
            expect(missing.body.error.code).toBe("INGREDIENT_NOT_FOUND");
            expect(badId.status).toBe(400);
            expect(badQuery.status).toBe(400);
        });
    });

    describe("receipt extract", () => {
        const extract = (headers: Record<string, string>, file: Buffer | null, name = "receipt.png") => {
            const call = request(app).post("/api/admin/ingredients/extract").set(headers);
            return file === null ? call : call.attach("image", file, name);
        };

        afterEach(() => {
            extractResult = defaultExtract;
            extractCalls.length = 0;
        });

        it("extracts matched ingredients with new total stock ready for PATCH /api/admin/ingredients and saves nothing", async () => {
            const ayam = await createIngredient("Dada Ayam Extract", { unit: "kg", stock: 4.5 });
            const minyak = await createIngredient("Minyak Extract", { unit: "liter", stock: 2 });
            extractResult = async () => ({
                items: [
                    { id: ayam.id, name: ayam.name, quantity: 10, unit: "kg" },
                    { id: minyak.id, name: minyak.name, quantity: 3.5, unit: "liter" },
                ],
            });

            const extracted = await extract(admin(), PNG);

            expect(extracted.status).toBe(200);
            expect(extracted.body).toEqual({
                data: {
                    items: [
                        { id: ayam.id, name: ayam.name, unit: "kg", stock: 14.5 },
                        { id: minyak.id, name: minyak.name, unit: "liter", stock: 5.5 },
                    ],
                },
            });
            expect(extractCalls[0]?.mimeType).toBe("image/png");
            expect(extractCalls[0]?.image.equals(PNG)).toBe(true);
            expect(extractCalls[0]?.ingredients).toEqual(
                expect.arrayContaining([
                    { id: ayam.id, name: ayam.name, unit: "kg" },
                    { id: minyak.id, name: minyak.name, unit: "liter" },
                ]),
            );

            const beforePatch = await request(app).get(`/api/admin/ingredients/${ayam.id}`).set(admin());
            expect(beforePatch.body.data.stock).toBe(4.5);

            const patched = await request(app).patch("/api/admin/ingredients").set(admin()).send(extracted.body.data);
            expect(patched.status).toBe(200);
            expect(patched.body.data).toMatchObject([
                { id: ayam.id, stock: 14.5 },
                { id: minyak.id, stock: 5.5 },
            ]);
        });

        it("forbids kitchen and customer roles and requires authentication", async () => {
            const unauth = await request(app).post("/api/admin/ingredients/extract").attach("image", PNG, "r.png");
            const byKitchen = await extract(kitchen(), PNG);
            const byCustomer = await extract(asRole("CUSTOMER"), PNG);

            expect(unauth.status).toBe(401);
            expect(byKitchen.status).toBe(403);
            expect(byCustomer.status).toBe(403);
            expect(extractCalls).toHaveLength(0);
        });

        it("answers 400 without an image, 415 for non-images, and 413 above the upload limit", async () => {
            const missing = await extract(admin(), null);
            const text = await extract(admin(), Buffer.from("just text"), "receipt.png");
            const large = await extract(admin(), Buffer.concat([PNG, Buffer.alloc(UPLOAD_MAX_BYTES)]), "receipt.png");

            expect(missing.status).toBe(400);
            expect(missing.body.error.code).toBe("VALIDATION_ERROR");
            expect(text.status).toBe(415);
            expect(text.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
            expect(large.status).toBe(413);
            expect(large.body.error.code).toBe("PAYLOAD_TOO_LARGE");
            expect(extractCalls).toHaveLength(0);
        });

        it("passes the receipt extractor's errors through", async () => {
            extractResult = async () => {
                throw new LowConfidenceReceiptError("low confidence receipt");
            };
            const lowConfidence = await extract(admin(), PNG);

            extractResult = async () => {
                throw new NoReceiptItemsFoundError("no matching receipt items found");
            };
            const noItems = await extract(admin(), PNG);

            extractResult = async () => {
                throw new ReceiptExtractorProviderError("receipt extractor provider request failed");
            };
            const providerDown = await extract(admin(), PNG);

            expect(lowConfidence.status).toBe(400);
            expect(lowConfidence.body.error.code).toBe("LOW_CONFIDENCE_RECEIPT");
            expect(noItems.status).toBe(400);
            expect(noItems.body.error.code).toBe("NO_RECEIPT_ITEMS_FOUND");
            expect(providerDown.status).toBe(502);
            expect(providerDown.body.error.code).toBe("RECEIPT_EXTRACTOR_PROVIDER_ERROR");
        });
    });
});
