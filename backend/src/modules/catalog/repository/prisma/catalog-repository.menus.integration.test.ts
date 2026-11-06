import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestSchedule } from "../../../../../tests/utils/fixtures/schedules.js";
import { createTestPackage } from "../../../../../tests/utils/fixtures/subscriptions.js";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import {
    MenuInUseError,
    UnknownIngredientError,
    type MenuRecord,
    type NewMenuRecord,
} from "../../service/interfaces/catalog.repository.js";
import { PrismaCatalogRepository } from "./catalog-repository.js";

describe("PrismaCatalogRepository menus (integration)", () => {
    let db: Db;
    let repository: PrismaCatalogRepository;
    let rows: CreatedRows;
    const tag = randomUUID().slice(0, 8);
    const ingredientIds: string[] = [];

    const newMenu = (name: string, overrides: Partial<NewMenuRecord> = {}): NewMenuRecord => ({
        name: `Zz Menu ${tag} ${name}`,
        description: "integration menu",
        isAlternative: false,
        tags: ["Pedas"],
        photoKey: "menus/2026/11/integration.webp",
        ingredients: [{ ingredientId: ingredientIds[0] ?? "", quantityPerPortion: 0.25 }],
        ...overrides,
    });

    const createMenu = async (name: string, overrides: Partial<NewMenuRecord> = {}): Promise<MenuRecord> => {
        const created = await repository.createMenu(newMenu(name, overrides));
        rows.track("Menu", created.id);
        return created;
    };

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaCatalogRepository(db);
        rows = trackCreated(db);
        for (const name of ["B", "A"]) {
            const ingredient = await db.orm.public.Ingredient.create({
                name: `Zz Ingredient ${tag} ${name}`,
                unit: "kg",
                photoKey: "ingredients/2026/11/integration.webp",
            });
            ingredientIds.push(rows.track("Ingredient", ingredient.id));
        }
    });

    afterAll(async () => {
        await rows?.cleanup();
        await db?.close();
    });

    it("creates a menu with its recipe lines and tags", async () => {
        const created = await createMenu("Create", {
            tags: ["Pedas", "Tinggi Protein"],
            ingredients: [
                { ingredientId: ingredientIds[0] ?? "", quantityPerPortion: 0.25 },
                { ingredientId: ingredientIds[1] ?? "", quantityPerPortion: 2 },
            ],
        });

        expect(created.tags).toEqual(["Pedas", "Tinggi Protein"]);
        expect(created.isAlternative).toBe(false);
        expect([...created.ingredients].sort((a, b) => a.quantityPerPortion - b.quantityPerPortion)).toEqual([
            { ingredientId: ingredientIds[0], quantityPerPortion: 0.25 },
            { ingredientId: ingredientIds[1], quantityPerPortion: 2 },
        ]);
        expect(await repository.findMenuById(created.id)).toEqual(created);
    });

    it("maps an unknown ingredient to UnknownIngredientError and writes nothing", async () => {
        const name = `Zz Menu ${tag} Unknown`;
        const error = await repository
            .createMenu(newMenu("Unknown", { ingredients: [{ ingredientId: randomUUID(), quantityPerPortion: 1 }] }))
            .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(UnknownIngredientError);
        expect(await db.orm.public.Menu.where({ name }).first()).toBeNull();
    });

    it("updates fields and replaces the recipe lines", async () => {
        const created = await createMenu("Update");

        const updated = await repository.updateMenu(created.id, {
            description: "changed",
            isAlternative: true,
            tags: [],
            ingredients: [{ ingredientId: ingredientIds[1] ?? "", quantityPerPortion: 3 }],
        });

        expect(updated).toMatchObject({ description: "changed", isAlternative: true, tags: [] });
        expect(updated?.ingredients).toEqual([{ ingredientId: ingredientIds[1], quantityPerPortion: 3 }]);
    });

    it("returns null when updating a missing menu", async () => {
        expect(await repository.updateMenu(randomUUID(), { name: "x" })).toBeNull();
    });

    it("lists menus with search and the alternative filter", async () => {
        const regular = await createMenu("List Regular");
        const alternative = await createMenu("List Alternative", { isAlternative: true });

        const all = await repository.listMenus({ search: `${tag} List`, skip: 0, take: 10 });
        const alternatives = await repository.listMenus({
            search: `${tag} List`,
            isAlternative: true,
            skip: 0,
            take: 10,
        });

        expect(all.total).toBe(2);
        expect(all.items.map(menu => menu.id)).toEqual([alternative.id, regular.id]);
        expect(alternatives.items.map(menu => menu.id)).toEqual([alternative.id]);
    });

    it("reads menus and their kinds by id", async () => {
        const first = await createMenu("Kinds A");
        const second = await createMenu("Kinds B", { isAlternative: true });
        const unknown = randomUUID();

        expect((await repository.findMenusByIds([second.id, first.id, unknown])).map(menu => menu.id)).toEqual([
            first.id,
            second.id,
        ]);
        expect(
            [...(await repository.findMenuKinds([first.id, second.id, unknown]))].sort((a, b) =>
                a.id.localeCompare(b.id),
            ),
        ).toEqual(
            [
                { id: first.id, isAlternative: false },
                { id: second.id, isAlternative: true },
            ].sort((a, b) => a.id.localeCompare(b.id)),
        );
        expect(await repository.findMenusByIds([])).toEqual([]);
    });

    describe("schedule links", () => {
        let menu: MenuRecord;
        let alternative: MenuRecord;
        let scheduleId: string;

        beforeAll(async () => {
            menu = await createMenu("Linked");
            alternative = await createMenu("Linked Alt", { isAlternative: true });
            scheduleId = await createTestSchedule(db, rows, {
                packageId: await createTestPackage(db, rows),
                date: "2030-01-01",
                primaryMenuId: menu.id,
                alternativeMenuId: alternative.id,
            });
        });

        it("finds the schedules using a menu, by role", async () => {
            expect(await repository.findScheduleIdsUsingMenu(menu.id)).toEqual([scheduleId]);
            expect(await repository.findScheduleIdsUsingMenu(menu.id, "alternative")).toEqual([]);
            expect(await repository.findScheduleIdsUsingMenu(alternative.id, "alternative")).toEqual([scheduleId]);
        });

        it("refuses to delete a menu a schedule uses", async () => {
            await expect(repository.deleteMenu(menu.id)).rejects.toBeInstanceOf(MenuInUseError);
        });
    });

    it("deletes an unused menu with its lines", async () => {
        const created = await repository.createMenu(newMenu("Delete"));

        expect(await repository.deleteMenu(created.id)).toBe(true);
        expect(await db.orm.public.MenuIngredient.where({ menuId: created.id }).first()).toBeNull();
        expect(await repository.deleteMenu(created.id)).toBe(false);
    });

    it("reads recipe lines and the menus using ingredients", async () => {
        const created = await createMenu("Recipe", {
            ingredients: [
                { ingredientId: ingredientIds[0] ?? "", quantityPerPortion: 1.5 },
                { ingredientId: ingredientIds[1] ?? "", quantityPerPortion: 4 },
            ],
        });

        const lines = await repository.findRecipeLines([created.id]);
        const usages = await repository.findMenusUsingIngredients([ingredientIds[1] ?? ""]);

        expect([...lines].sort((a, b) => a.quantityPerPortion - b.quantityPerPortion)).toEqual([
            { menuId: created.id, ingredientId: ingredientIds[0], quantityPerPortion: 1.5 },
            { menuId: created.id, ingredientId: ingredientIds[1], quantityPerPortion: 4 },
        ]);
        expect(usages).toContainEqual({ ingredientId: ingredientIds[1], menuId: created.id, menuName: created.name });
        expect(await repository.findRecipeLines([])).toEqual([]);
        expect(await repository.findMenusUsingIngredients([])).toEqual([]);
    });
});
