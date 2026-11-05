import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/index.js";
import { trackCreated } from "./cleanup.js";
import { loadDatabase, type Db } from "./db.js";

describe("trackCreated (integration)", () => {
    let db: Db;
    const tag = () => `Zz Cleanup ${randomUUID().slice(0, 8)}`;

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
    });

    afterAll(async () => {
        await db?.close();
    });

    it("deletes tracked rows in reverse order, so children go before restricted parents", async () => {
        const rows = trackCreated(db);
        const ingredient = await db.orm.public.Ingredient.create({
            name: tag(),
            unit: "gram",
            photoKey: "test/a.webp",
        });
        rows.track("Ingredient", ingredient.id);
        const menu = await db.orm.public.Menu.create({
            name: tag(),
            description: "test",
            tags: [],
            photoKey: "test/b.webp",
        });
        rows.track("Menu", menu.id);
        const line = await db.orm.public.MenuIngredient.create({
            menuId: menu.id,
            ingredientId: ingredient.id,
            quantityPerPortion: "1.00",
        });
        rows.track("MenuIngredient", line.id);

        await rows.cleanup();

        expect(await db.orm.public.Ingredient.where({ id: ingredient.id }).first()).toBeNull();
        expect(await db.orm.public.Menu.where({ id: menu.id }).first()).toBeNull();
        expect(await db.orm.public.MenuIngredient.where({ id: line.id }).first()).toBeNull();
    });

    it("returns the id it tracks and ignores rows that are already gone", async () => {
        const rows = trackCreated(db);
        const id = rows.track("Allergy", (await db.orm.public.Allergy.create({ name: tag() })).id);
        await db.orm.public.Allergy.where({ id }).deleteAll();

        await expect(rows.cleanup()).resolves.toBeUndefined();
    });

    it("forgets rows once cleaned up", async () => {
        const rows = trackCreated(db);
        rows.track("Allergy", (await db.orm.public.Allergy.create({ name: tag() })).id);
        await rows.cleanup();
        const id = (await db.orm.public.Allergy.create({ name: tag() })).id;

        await rows.cleanup();

        expect(await db.orm.public.Allergy.where({ id }).first()).not.toBeNull();
        await db.orm.public.Allergy.where({ id }).deleteAll();
    });
});
