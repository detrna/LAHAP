import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/index.js";
import { trackCreated, type CreatedRows } from "./cleanup.js";
import { loadDatabase, type Db } from "./db.js";
import { getForeignKeyViolationConstraint, getUniqueViolationConstraint } from "./sql-errors.js";

describe("sql error helpers against Postgres (integration)", () => {
    let db: Db;
    let rows: CreatedRows;

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
    });

    afterAll(async () => {
        await rows.cleanup();
        await db?.close();
    });

    it("names the restrict foreign key when a referenced row is deleted", async () => {
        const name = `Zz Fk ${randomUUID().slice(0, 8)}`;
        const ingredient = await db.orm.public.Ingredient.create({ name, unit: "gram", photoKey: "test/a.webp" });
        rows.track("Ingredient", ingredient.id);
        const menu = await db.orm.public.Menu.create({ name, description: "test", tags: [], photoKey: "test/b.webp" });
        rows.track("Menu", menu.id);
        rows.track(
            "MenuIngredient",
            (
                await db.orm.public.MenuIngredient.create({
                    menuId: menu.id,
                    ingredientId: ingredient.id,
                    quantityPerPortion: "1.00",
                })
            ).id,
        );

        const error = await db.orm.public.Ingredient.where({ id: ingredient.id })
            .deleteAll()
            .then(
                () => null,
                (cause: unknown) => cause,
            );

        expect(getForeignKeyViolationConstraint(error)).toBe("menu_ingredient_ingredient_id_fkey");
        expect(getUniqueViolationConstraint(error)).toBeNull();
    });

    it("names the foreign key when a write references a missing row", async () => {
        const error = await db.orm.public.UserAllergy.create({ userId: randomUUID(), allergyId: randomUUID() }).then(
            () => null,
            (cause: unknown) => cause,
        );

        expect(getForeignKeyViolationConstraint(error)).toMatch(/^user_allergy_.*_fkey$/);
    });
});
