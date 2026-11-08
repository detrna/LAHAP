import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestMenu } from "../../../../../tests/utils/fixtures/schedules.js";
import { createTestUser } from "../../../../../tests/utils/fixtures/users.js";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import {
    IngredientAlreadyExistsError,
    IngredientInUseError,
    IngredientNotFoundError,
    type IngredientRecord,
    type NewIngredientRecord,
    type StockChangeAudit,
} from "../../service/interfaces/ingredients.repository.js";
import { PrismaIngredientsRepository } from "./ingredients-repository.js";

describe("PrismaIngredientsRepository (integration)", () => {
    let db: Db;
    let repository: PrismaIngredientsRepository;
    let rows: CreatedRows;
    let actorId: string;
    let otherActorId: string;
    const tag = randomUUID().slice(0, 8);
    const allergyIds: string[] = [];

    const audit = (
        changedById = actorId,
        changedAt = Temporal.PlainDateTime.from("2026-11-07T08:00:00"),
    ): StockChangeAudit => ({ changedById, changedAt });

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
        auditOverride: StockChangeAudit = audit(),
    ): Promise<IngredientRecord> => {
        const [created] = await repository.createMany([newIngredient(name, overrides)], auditOverride);
        if (created === undefined) throw new Error("createMany returned nothing");
        rows.track("Ingredient", created.id);
        return created;
    };

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaIngredientsRepository(db);
        rows = trackCreated(db);
        actorId = await createTestUser(db, rows, { role: "ADMIN" });
        otherActorId = await createTestUser(db, rows, { role: "KITCHEN" });
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
            const created = await repository.createMany(
                [
                    newIngredient("Order B", { stock: 1.5, allergyIds: [allergyIds[0] ?? "", allergyIds[1] ?? ""] }),
                    newIngredient("Order A", { unit: "liter", minimumThreshold: 0 }),
                ],
                audit(),
            );
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

            const attempt = repository.createMany([newIngredient("Fresh One"), newIngredient("Taken")], audit());

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

        it("finds all ingredients sorted by name", async () => {
            const second = await createIngredient("All B");
            const first = await createIngredient("All A");

            const all = await repository.findAll();
            const matching = all.filter(record => [first.id, second.id].includes(record.id));

            expect(matching.map(record => record.id)).toEqual([first.id, second.id]);
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

            const [updated] = await repository.updateMany(
                [{ id: created.id, changes: { stock: 4.5, unit: "gram" } }],
                audit(),
            );

            expect(updated).toMatchObject({ id: created.id, name: created.name, stock: 4.5, unit: "gram" });
            expect(Temporal.PlainDateTime.compare(updated?.updatedAt ?? created.updatedAt, created.updatedAt)).toBe(1);
        });

        it("replaces the whole allergen set, and clears it with an empty list", async () => {
            const created = await createIngredient("Allergens", { allergyIds: [allergyIds[0] ?? ""] });

            const [replaced] = await repository.updateMany(
                [{ id: created.id, changes: { allergyIds: [allergyIds[1] ?? ""] } }],
                audit(),
            );
            const [cleared] = await repository.updateMany([{ id: created.id, changes: { allergyIds: [] } }], audit());

            expect(replaced?.allergyIds).toEqual([allergyIds[1]]);
            expect(cleared?.allergyIds).toEqual([]);
        });

        it("keeps the allergens when none are given, even with no column change", async () => {
            const created = await createIngredient("Keep", { allergyIds: [allergyIds[0] ?? ""] });

            const [unchanged] = await repository.updateMany([{ id: created.id, changes: {} }], audit());

            expect(unchanged?.allergyIds).toEqual([allergyIds[0]]);
        });

        it("answers in request order for a batch", async () => {
            const first = await createIngredient("Batch 1");
            const second = await createIngredient("Batch 2");

            const updated = await repository.updateMany(
                [
                    { id: second.id, changes: { stock: 1 } },
                    { id: first.id, changes: { stock: 2 } },
                ],
                audit(),
            );

            expect(updated.map(record => [record.id, record.stock])).toEqual([
                [second.id, 1],
                [first.id, 2],
            ]);
        });

        it("rolls the whole batch back when one id is missing", async () => {
            const created = await createIngredient("Rollback Missing", { stock: 5 });

            const attempt = repository.updateMany(
                [
                    { id: created.id, changes: { stock: 99 } },
                    { id: randomUUID(), changes: { stock: 1 } },
                ],
                audit(),
            );

            await expect(attempt).rejects.toBeInstanceOf(IngredientNotFoundError);
            expect((await repository.findById(created.id))?.stock).toBe(5);
        });

        it("maps a duplicate name to IngredientAlreadyExistsError and rolls back", async () => {
            const other = await createIngredient("Rename Other");
            const target = await createIngredient("Rename Target", { stock: 5 });

            const attempt = repository.updateMany(
                [
                    { id: target.id, changes: { stock: 99 } },
                    { id: target.id, changes: { name: other.name } },
                ],
                audit(),
            );

            await expect(attempt).rejects.toBeInstanceOf(IngredientAlreadyExistsError);
            expect((await repository.findById(target.id))?.stock).toBe(5);
        });
    });

    describe("listStockHistory", () => {
        it("records initial stock when stock > 0 and skips recording when stock is 0", async () => {
            const initialAt = Temporal.PlainDateTime.from("2026-11-07T08:00:00");
            const zero = await createIngredient("History Zero", { stock: 0 }, audit(actorId, initialAt));
            const positive = await createIngredient("History Positive", { stock: 12.5 }, audit(actorId, initialAt));

            const zeroHistory = await repository.listStockHistory({ ingredientId: zero.id, skip: 0, take: 10 });
            const positiveHistory = await repository.listStockHistory({ ingredientId: positive.id, skip: 0, take: 10 });

            expect(zeroHistory).toEqual({ items: [], total: 0 });
            expect(positiveHistory.total).toBe(1);
            expect(positiveHistory.items[0]).toMatchObject({
                ingredientId: positive.id,
                changedById: actorId,
                previousStock: 0,
                newStock: 12.5,
                changedAt: initialAt,
            });
        });

        it("records updates only when stock changes and paginates newest first", async () => {
            const t1 = Temporal.PlainDateTime.from("2026-11-07T08:00:00");
            const t2 = Temporal.PlainDateTime.from("2026-11-07T09:00:00");
            const t3 = Temporal.PlainDateTime.from("2026-11-07T10:00:00");
            const created = await createIngredient("History Updates", { stock: 10 }, audit(actorId, t1));

            await repository.updateMany([{ id: created.id, changes: { stock: 10 } }], audit(actorId, t2));
            await repository.updateMany([{ id: created.id, changes: { minimumThreshold: 5 } }], audit(actorId, t2));
            await repository.updateMany([{ id: created.id, changes: { stock: 25.5 } }], audit(otherActorId, t2));
            await repository.updateMany([{ id: created.id, changes: { stock: 4 } }], audit(actorId, t3));

            const firstPage = await repository.listStockHistory({ ingredientId: created.id, skip: 0, take: 2 });
            const secondPage = await repository.listStockHistory({ ingredientId: created.id, skip: 2, take: 2 });

            expect(firstPage.total).toBe(3);
            expect(
                firstPage.items.map(item => ({
                    changedById: item.changedById,
                    previousStock: item.previousStock,
                    newStock: item.newStock,
                    changedAt: item.changedAt,
                })),
            ).toEqual([
                { changedById: actorId, previousStock: 25.5, newStock: 4, changedAt: t3 },
                { changedById: otherActorId, previousStock: 10, newStock: 25.5, changedAt: t2 },
            ]);
            expect(
                secondPage.items.map(item => ({
                    changedById: item.changedById,
                    previousStock: item.previousStock,
                    newStock: item.newStock,
                    changedAt: item.changedAt,
                })),
            ).toEqual([{ changedById: actorId, previousStock: 0, newStock: 10, changedAt: t1 }]);
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
            await createTestMenu(db, rows, {
                name: `Zz Menu ${tag}`,
                ingredients: [{ ingredientId: used.id, quantityPerPortion: 1 }],
            });

            await expect(repository.deleteMany([free.id, used.id])).rejects.toBeInstanceOf(IngredientInUseError);
            expect(await repository.findByIds([free.id, used.id])).toHaveLength(2);
        });

        it("answers 0 for no ids", async () => {
            expect(await repository.deleteMany([])).toBe(0);
        });
    });
});
