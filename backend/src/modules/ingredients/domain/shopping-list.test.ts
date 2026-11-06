import { describe, expect, it } from "vitest";
import { buildShoppingList } from "./shopping-list.js";

const ingredient = (id: string, name: string, stock: number) => ({ id, name, unit: "kg" as const, stock });

describe("buildShoppingList (unit)", () => {
    it("keeps the shortage of each ingredient that is short", () => {
        const items = buildShoppingList(new Map([["i-1", 12]]), [ingredient("i-1", "Beras", 5)]);

        expect(items).toEqual([
            {
                ingredientId: "i-1",
                name: "Beras",
                unit: "kg",
                requiredQuantity: 12,
                currentStock: 5,
                shortageQuantity: 7,
            },
        ]);
    });

    it("drops ingredients the stock already covers, exactly or with a surplus", () => {
        const items = buildShoppingList(
            new Map([
                ["i-1", 5],
                ["i-2", 3],
            ]),
            [ingredient("i-1", "Beras", 5), ingredient("i-2", "Telur", 9)],
        );

        expect(items).toEqual([]);
    });

    it("rounds the shortage to two decimals without float noise", () => {
        const [item] = buildShoppingList(new Map([["i-1", 2.3]]), [ingredient("i-1", "Minyak", 1.1)]);

        expect(item?.shortageQuantity).toBe(1.2);
    });

    it("sorts by name", () => {
        const items = buildShoppingList(
            new Map([
                ["i-1", 5],
                ["i-2", 5],
                ["i-3", 5],
            ]),
            [ingredient("i-1", "Telur", 0), ingredient("i-2", "Ayam", 0), ingredient("i-3", "Beras", 0)],
        );

        expect(items.map(item => item.name)).toEqual(["Ayam", "Beras", "Telur"]);
    });

    it("skips ingredients that are not required", () => {
        expect(buildShoppingList(new Map(), [ingredient("i-1", "Beras", 0)])).toEqual([]);
    });
});
