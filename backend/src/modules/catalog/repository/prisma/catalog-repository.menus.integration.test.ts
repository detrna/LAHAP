import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestSchedule } from "../../../../../tests/utils/fixtures/schedules.js";
import { createTestPackage } from "../../../../../tests/utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../../../tests/utils/fixtures/users.js";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import {
    CatalogRepositoryFailureError,
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
        components: [],
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

    describe("components", () => {
        let cookId: string;
        let otherCookId: string;

        beforeAll(async () => {
            cookId = await createTestUser(db, rows, { role: "KITCHEN" });
            otherCookId = await createTestUser(db, rows, { role: "KITCHEN" });
        });

        const names = (menu: MenuRecord | null | undefined) => menu?.components.map(component => component.name);

        it("creates a menu with its components, with and without a cook, ordered by name", async () => {
            const created = await createMenu("Components Create", {
                components: [
                    { name: "Sambal", cookId: null },
                    { name: "Ayam Bakar", cookId },
                    { name: "Nasi Putih", cookId: null },
                ],
            });

            expect(created.components.map(({ name, cookId: cook }) => ({ name, cookId: cook }))).toEqual([
                { name: "Ayam Bakar", cookId },
                { name: "Nasi Putih", cookId: null },
                { name: "Sambal", cookId: null },
            ]);
            expect(created.components.every(component => component.id.length > 0)).toBe(true);
            expect(await repository.findMenuById(created.id)).toEqual(created);
        });

        it("creates a menu without components", async () => {
            const created = await createMenu("Components None");

            expect(created.components).toEqual([]);
        });

        it("maps an unknown cook to a 422 and writes no menu", async () => {
            const name = `Zz Menu ${tag} Components Unknown Cook`;
            const error = await repository
                .createMenu(
                    newMenu("Components Unknown Cook", { components: [{ name: "Ayam", cookId: randomUUID() }] }),
                )
                .catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(InvalidStateError);
            expect((error as InvalidStateError).message).toBe("cook is not an active kitchen staff");
            expect(await db.orm.public.Menu.where({ name }).first()).toBeNull();
        });

        it("replaces the components when a list is sent, and clears them with an empty one", async () => {
            const created = await createMenu("Components Replace", {
                components: [{ name: "Nasi Putih", cookId: null }],
            });

            const replaced = await repository.updateMenu(created.id, {
                components: [
                    { name: "Tumis Buncis", cookId: otherCookId },
                    { name: "Ayam Bakar", cookId },
                ],
            });
            expect(names(replaced)).toEqual(["Ayam Bakar", "Tumis Buncis"]);
            expect(replaced?.components.map(component => component.cookId)).toEqual([cookId, otherCookId]);

            const cleared = await repository.updateMenu(created.id, { components: [] });
            expect(cleared?.components).toEqual([]);
            expect(await db.orm.public.MenuComponent.where({ menuId: created.id }).first()).toBeNull();
        });

        it("keeps the components when an update doesn't send them", async () => {
            const created = await createMenu("Components Keep", {
                components: [{ name: "Nasi Putih", cookId }],
            });

            const updated = await repository.updateMenu(created.id, { description: "changed" });

            expect(updated?.description).toBe("changed");
            expect(updated?.components).toEqual(created.components);
        });

        it("updates only the components of a menu, leaving its recipe alone", async () => {
            const created = await createMenu("Components Only");

            const updated = await repository.updateMenu(created.id, { components: [{ name: "Nasi", cookId: null }] });

            expect(names(updated)).toEqual(["Nasi"]);
            expect(updated?.ingredients).toEqual(created.ingredients);
        });

        it("rolls the whole update back when a cook is unknown", async () => {
            const created = await createMenu("Components Rollback", {
                components: [{ name: "Nasi Putih", cookId: null }],
            });

            const error = await repository
                .updateMenu(created.id, {
                    description: "should not stick",
                    components: [{ name: "Ayam", cookId: randomUUID() }],
                })
                .catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(InvalidStateError);
            const after = await repository.findMenuById(created.id);
            expect(after?.description).toBe("integration menu");
            expect(names(after)).toEqual(["Nasi Putih"]);
        });

        it("reads components with menus found by id and in lists", async () => {
            const created = await createMenu("Components List", {
                components: [
                    { name: "Nasi Putih", cookId: null },
                    { name: "Ayam", cookId },
                ],
            });

            const [byId] = await repository.findMenusByIds([created.id]);
            const listed = await repository.listMenus({ search: `${tag} Components List`, skip: 0, take: 10 });

            expect(names(byId)).toEqual(["Ayam", "Nasi Putih"]);
            expect(names(listed.items[0])).toEqual(["Ayam", "Nasi Putih"]);
        });

        it("refuses two components with the same name on one menu", async () => {
            const error = await repository
                .createMenu(
                    newMenu("Components Duplicate", {
                        components: [
                            { name: "Nasi", cookId: null },
                            { name: "Nasi", cookId: null },
                        ],
                    }),
                )
                .catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(CatalogRepositoryFailureError);
            expect(await db.orm.public.Menu.where({ name: `Zz Menu ${tag} Components Duplicate` }).first()).toBeNull();
        });

        it("deletes the components with their menu", async () => {
            const created = await repository.createMenu(
                newMenu("Components Delete", { components: [{ name: "Nasi Putih", cookId }] }),
            );

            expect(await repository.deleteMenu(created.id)).toBe(true);
            expect(await db.orm.public.MenuComponent.where({ menuId: created.id }).first()).toBeNull();
        });

        it("keeps a component but forgets its cook when the cook is deleted", async () => {
            const leavingCookId = await createTestUser(db, rows, { role: "KITCHEN" });
            const created = await createMenu("Components Cook Leaves", {
                components: [{ name: "Ayam", cookId: leavingCookId }],
            });

            await db.orm.public.User.where({ id: leavingCookId }).deleteAndCount();

            const after = await repository.findMenuById(created.id);
            expect(after?.components.map(({ name, cookId: cook }) => ({ name, cookId: cook }))).toEqual([
                { name: "Ayam", cookId: null },
            ]);
        });
    });
});
