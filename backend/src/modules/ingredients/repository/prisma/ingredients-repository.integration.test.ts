import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import {
    IngredientAlreadyExistsError,
    IngredientInUseError,
    IngredientNotFoundError,
    type IngredientRecord,
    type NewIngredientRecord,
} from "../../service/interfaces/ingredients.repository.js";
import { PrismaIngredientsRepository } from "./ingredients-repository.js";

describe("PrismaIngredientsRepository (integration)", () => {
    let db: Db;
    let repository: PrismaIngredientsRepository;
    let rows: CreatedRows;
    const tag = randomUUID().slice(0, 8);
    const allergyIds: string[] = [];

    const newIngredient = (name: string, overrides: Partial<NewIngredientRecord> = {}): NewIngredientRecord => ({
        name: `Zz Ing ${tag} ${name}`,
        unit: "kg",
        stock: 20,
        minimumThreshold: 10,
        photoKey: "ingredients/2026/11/integration.webp",
        allergyIds: [],
        ...overrides,
    });

    const createIngredient = async (
        name: string,
        overrides: Partial<NewIngredientRecord> = {},
    ): Promise<IngredientRecord> => {
        const [created] = await repository.createMany([newIngredient(name, overrides)]);
        if (created === undefined) throw new Error("createMany returned nothing");
        rows.track("Ingredient", created.id);
        return created;
    };

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaIngredientsRepository(db);
        rows = trackCreated(db);
        for (const name of [`Zz Allergy ${tag} A`, `Zz Allergy ${tag} B`]) {
            const allergy = await db.orm.public.Allergy.create({ name });
            allergyIds.push(rows.track("Allergy", allergy.id));
        }
    });

    afterAll(async () => {
        await rows?.cleanup();
        await db?.close();
    });

    describe("createMany", () => {
        it("creates the ingredients in request order with numbers, allergens and timestamps", async () => {
            const created = await repository.createMany([
                newIngredient("Order B", { stock: 1.5, allergyIds: [allergyIds[0] ?? "", allergyIds[1] ?? ""] }),
                newIngredient("Order A", { unit: "liter", minimumThreshold: 0 }),
            ]);
            for (const record of created) rows.track("Ingredient", record.id);

            expect(created.map(record => record.name)).toEqual([`Zz Ing ${tag} Order B`, `Zz Ing ${tag} Order A`]);
            expect(created[0]).toMatchObject({ unit: "kg", stock: 1.5, minimumThreshold: 10 });
            expect([...(created[0]?.allergyIds ?? [])].sort()).toEqual([...allergyIds].sort());
            expect(created[1]).toMatchObject({ unit: "liter", minimumThreshold: 0, allergyIds: [] });
            expect(created[0]?.createdAt).toBeInstanceOf(Temporal.PlainDateTime);
        });

        it("rounds quantities half-up to 2 decimals", async () => {
            const created = await createIngredient("Rounding", { stock: 1.005, minimumThreshold: 2.675 });

            expect(created).toMatchObject({ stock: 1.01, minimumThreshold: 2.68 });
        });

        it("maps a duplicate name to IngredientAlreadyExistsError and keeps the earlier items out", async () => {
            const taken = await createIngredient("Taken");

            const attempt = repository.createMany([newIngredient("Fresh One"), newIngredient("Taken")]);

            await expect(attempt).rejects.toBeInstanceOf(IngredientAlreadyExistsError);
            await expect(attempt).rejects.toMatchObject({ name: taken.name });
            expect(await repository.list({ search: `${tag} Fresh One`, skip: 0, take: 10 })).toMatchObject({
                total: 0,
            });
        });
    });

    describe("reads", () => {
        it("finds one ingredient with its allergy ids, and null for an unknown id", async () => {
            const created = await createIngredient("Find", { allergyIds: [allergyIds[0] ?? ""] });

            expect(await repository.findById(created.id)).toMatchObject({
                id: created.id,
                allergyIds: [allergyIds[0]],
            });
            expect(await repository.findById(randomUUID())).toBeNull();
        });

        it("finds many by id sorted by name, ignoring unknown ids", async () => {
            const second = await createIngredient("Many 2");
            const first = await createIngredient("Many 1");

            const found = await repository.findByIds([second.id, first.id, randomUUID()]);

            expect(found.map(record => record.id)).toEqual([first.id, second.id]);
            expect(await repository.findByIds([])).toEqual([]);
        });

        it("lists only the ids that do not exist", async () => {
            const created = await createIngredient("Missing");
            const unknown = randomUUID();

            expect(await repository.findMissingIds([created.id, unknown])).toEqual([unknown]);
            expect(await repository.findMissingIds([])).toEqual([]);
        });
    });

    describe("list", () => {
        it("pages a search by name, counting every match", async () => {
            await createIngredient("List B");
            await createIngredient("List A");
            await createIngredient("List C");

            const first = await repository.list({ search: `ing ${tag} list`, skip: 0, take: 2 });
            const second = await repository.list({ search: `ing ${tag} list`, skip: 2, take: 2 });

            expect(first.total).toBe(3);
            expect(first.items.map(record => record.name)).toEqual([`Zz Ing ${tag} List A`, `Zz Ing ${tag} List B`]);
            expect(second.items.map(record => record.name)).toEqual([`Zz Ing ${tag} List C`]);
        });

        it("matches % and _ in a search literally", async () => {
            expect((await repository.list({ search: `${tag}%`, skip: 0, take: 10 })).total).toBe(0);
        });

        it("filters low stock both ways, counting stock equal to the threshold as low", async () => {
            const below = await createIngredient("Stock Below", { stock: 3, minimumThreshold: 10 });
            const equal = await createIngredient("Stock Equal", { stock: 10, minimumThreshold: 10 });
            const above = await createIngredient("Stock Above", { stock: 10.01, minimumThreshold: 10 });
            const search = `ing ${tag} stock`;

            const low = await repository.list({ search, lowStock: true, skip: 0, take: 10 });
            const enough = await repository.list({ search, lowStock: false, skip: 0, take: 10 });
            const all = await repository.list({ search, skip: 0, take: 10 });

            expect(low.items.map(record => record.id).sort()).toEqual([below.id, equal.id].sort());
            expect(low.total).toBe(2);
            expect(enough.items.map(record => record.id)).toEqual([above.id]);
            expect(enough.total).toBe(1);
            expect(all.total).toBe(3);
        });
    });

    describe("updateMany", () => {
        it("changes only the given fields and moves updatedAt", async () => {
            const created = await createIngredient("Update");

            const [updated] = await repository.updateMany([{ id: created.id, changes: { stock: 4.5, unit: "gram" } }]);

            expect(updated).toMatchObject({ id: created.id, name: created.name, stock: 4.5, unit: "gram" });
            expect(Temporal.PlainDateTime.compare(updated?.updatedAt ?? created.updatedAt, created.updatedAt)).toBe(1);
        });

        it("replaces the whole allergen set, and clears it with an empty list", async () => {
            const created = await createIngredient("Allergens", { allergyIds: [allergyIds[0] ?? ""] });

            const [replaced] = await repository.updateMany([
                { id: created.id, changes: { allergyIds: [allergyIds[1] ?? ""] } },
            ]);
            const [cleared] = await repository.updateMany([{ id: created.id, changes: { allergyIds: [] } }]);

            expect(replaced?.allergyIds).toEqual([allergyIds[1]]);
            expect(cleared?.allergyIds).toEqual([]);
        });

        it("keeps the allergens when none are given, even with no column change", async () => {
            const created = await createIngredient("Keep", { allergyIds: [allergyIds[0] ?? ""] });

            const [unchanged] = await repository.updateMany([{ id: created.id, changes: {} }]);

            expect(unchanged?.allergyIds).toEqual([allergyIds[0]]);
        });

        it("answers in request order for a batch", async () => {
            const first = await createIngredient("Batch 1");
            const second = await createIngredient("Batch 2");

            const updated = await repository.updateMany([
                { id: second.id, changes: { stock: 1 } },
                { id: first.id, changes: { stock: 2 } },
            ]);

            expect(updated.map(record => [record.id, record.stock])).toEqual([
                [second.id, 1],
                [first.id, 2],
            ]);
        });

        it("rolls the whole batch back when one id is missing", async () => {
            const created = await createIngredient("Rollback Missing", { stock: 5 });

            const attempt = repository.updateMany([
                { id: created.id, changes: { stock: 99 } },
                { id: randomUUID(), changes: { stock: 1 } },
            ]);

            await expect(attempt).rejects.toBeInstanceOf(IngredientNotFoundError);
            expect((await repository.findById(created.id))?.stock).toBe(5);
        });

        it("maps a duplicate name to IngredientAlreadyExistsError and rolls back", async () => {
            const other = await createIngredient("Rename Other");
            const target = await createIngredient("Rename Target", { stock: 5 });

            const attempt = repository.updateMany([
                { id: target.id, changes: { stock: 99 } },
                { id: target.id, changes: { name: other.name } },
            ]);

            await expect(attempt).rejects.toBeInstanceOf(IngredientAlreadyExistsError);
            expect((await repository.findById(target.id))?.stock).toBe(5);
        });
    });

    describe("deleteMany", () => {
        it("deletes the ingredients and their allergen links", async () => {
            const first = await createIngredient("Delete 1", { allergyIds: [allergyIds[0] ?? ""] });
            const second = await createIngredient("Delete 2");

            expect(await repository.deleteMany([first.id, second.id])).toBe(2);
            expect(await repository.findByIds([first.id, second.id])).toEqual([]);
            expect(await db.orm.public.IngredientAllergy.where({ ingredientId: first.id }).all()).toEqual([]);
        });

        it("deletes nothing when one id is missing", async () => {
            const created = await createIngredient("Delete Keep");
            const unknown = randomUUID();

            const attempt = repository.deleteMany([created.id, unknown]);

            await expect(attempt).rejects.toBeInstanceOf(IngredientNotFoundError);
            await expect(attempt).rejects.toMatchObject({ ingredientId: unknown });
            expect(await repository.findById(created.id)).not.toBeNull();
        });

        it("maps an ingredient a menu uses to IngredientInUseError and deletes none of the batch", async () => {
            const used = await createIngredient("Delete Used");
            const free = await createIngredient("Delete Free");
            const menu = await db.orm.public.Menu.create({
                name: `Zz Menu ${tag}`,
                description: "integration menu",
                tags: [],
                photoKey: "menus/2026/11/integration.webp",
            });
            rows.track("Menu", menu.id);
            const link = await db.orm.public.MenuIngredient.create({
                menuId: menu.id,
                ingredientId: used.id,
                quantityPerPortion: "1.00",
            });
            rows.track("MenuIngredient", link.id);

            await expect(repository.deleteMany([free.id, used.id])).rejects.toBeInstanceOf(IngredientInUseError);
            expect(await repository.findByIds([free.id, used.id])).toHaveLength(2);
        });

        it("answers 0 for no ids", async () => {
            expect(await repository.deleteMany([])).toBe(0);
        });
    });
});
