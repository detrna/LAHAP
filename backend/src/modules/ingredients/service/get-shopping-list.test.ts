import { describe, expect, it } from "vitest";
import { InvalidDateRangeError } from "../../../shared/time/date-range.js";
import { buildRecipeLine, buildScheduleSummary } from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildIngredientRecord } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";

const SCHEDULE_A = "schedule-a";
const SCHEDULE_B = "schedule-b";

describe("IngredientsService.getShoppingList (unit)", () => {
    it("defaults to the next Monday through the following Sunday", async () => {
        const { service, menus, clock } = setupIngredientsService();
        clock.set("2026-11-04T10:00:00+07:00[Asia/Jakarta]");

        await service.getShoppingList();

        expect(menus.findSchedules).toHaveBeenCalledWith({
            from: Temporal.PlainDate.from("2026-11-09"),
            to: Temporal.PlainDate.from("2026-11-15"),
            isPublished: true,
        });
    });

    it("starts the default range at the following Monday when today is a Monday", async () => {
        const { service, menus, clock } = setupIngredientsService();
        clock.set("2026-11-09T08:00:00+07:00[Asia/Jakarta]");

        await service.getShoppingList();

        expect(menus.findSchedules).toHaveBeenCalledWith({
            from: Temporal.PlainDate.from("2026-11-16"),
            to: Temporal.PlainDate.from("2026-11-22"),
            isPublished: true,
        });
    });

    it("keeps an explicit range and rejects one past 31 days or reversed", async () => {
        const { service, menus } = setupIngredientsService();
        const from = Temporal.PlainDate.from("2026-12-01");
        const to = Temporal.PlainDate.from("2026-12-31");

        await service.getShoppingList({ from, to });
        expect(menus.findSchedules).toHaveBeenCalledWith({ from, to, isPublished: true });

        await expect(
            service.getShoppingList({ from, to: Temporal.PlainDate.from("2027-01-01") }),
        ).rejects.toBeInstanceOf(InvalidDateRangeError);
        await expect(
            service.getShoppingList({ from, to: Temporal.PlainDate.from("2026-11-30") }),
        ).rejects.toBeInstanceOf(InvalidDateRangeError);
    });

    it("answers an empty list when no schedule is in range, without asking for portions", async () => {
        const { service, portions } = setupIngredientsService();

        expect(await service.getShoppingList()).toEqual([]);
        expect(portions.countPortionsBySchedule).not.toHaveBeenCalled();
    });

    it("answers an empty list when there are no portions", async () => {
        const { service, menus, portions, repository } = setupIngredientsService();
        menus.findSchedules.mockResolvedValue([buildScheduleSummary({ id: SCHEDULE_A })]);
        portions.countPortionsBySchedule.mockResolvedValue([]);

        expect(await service.getShoppingList()).toEqual([]);
        expect(menus.getRecipeLines).not.toHaveBeenCalled();
        expect(repository.findByIds).not.toHaveBeenCalled();
    });

    it("maps the portions to the served menu and lists only the shortages sorted by name", async () => {
        const { service, menus, portions, repository } = setupIngredientsService();
        menus.findSchedules.mockResolvedValue([
            buildScheduleSummary({ id: SCHEDULE_A, primaryMenuId: "menu-1", alternativeMenuId: "menu-2" }),
            buildScheduleSummary({ id: SCHEDULE_B, primaryMenuId: "menu-1", alternativeMenuId: null }),
        ]);
        portions.countPortionsBySchedule.mockResolvedValue([
            { scheduleId: SCHEDULE_A, usesAlternativeMenu: false, portions: 8 },
            { scheduleId: SCHEDULE_A, usesAlternativeMenu: true, portions: 2 },
            { scheduleId: SCHEDULE_B, usesAlternativeMenu: false, portions: 10 },
        ]);
        menus.getRecipeLines.mockResolvedValue([
            buildRecipeLine({ menuId: "menu-1", ingredientId: "rice", quantityPerPortion: 0.1 }),
            buildRecipeLine({ menuId: "menu-2", ingredientId: "rice", quantityPerPortion: 0.1 }),
            buildRecipeLine({ menuId: "menu-2", ingredientId: "tofu", quantityPerPortion: 0.5 }),
            buildRecipeLine({ menuId: "menu-1", ingredientId: "egg", quantityPerPortion: 1 }),
        ]);
        repository.findByIds.mockResolvedValue([
            buildIngredientRecord({ id: "rice", name: "Beras", unit: "kg", stock: 1 }),
            buildIngredientRecord({ id: "tofu", name: "Tahu", unit: "kg", stock: 5 }),
            buildIngredientRecord({ id: "egg", name: "Telur", unit: "butir", stock: 5 }),
        ]);

        const list = await service.getShoppingList();

        expect(portions.countPortionsBySchedule).toHaveBeenCalledWith([SCHEDULE_A, SCHEDULE_B]);
        expect(menus.getRecipeLines).toHaveBeenCalledWith(["menu-1", "menu-2"]);
        expect(repository.findByIds).toHaveBeenCalledWith(expect.arrayContaining(["rice", "tofu", "egg"]));
        expect(list).toEqual([
            {
                ingredientId: "rice",
                name: "Beras",
                unit: "kg",
                requiredQuantity: 2,
                currentStock: 1,
                shortageQuantity: 1,
            },
            {
                ingredientId: "egg",
                name: "Telur",
                unit: "butir",
                requiredQuantity: 18,
                currentStock: 5,
                shortageQuantity: 13,
            },
        ]);
    });

    it("skips a count whose served menu does not exist", async () => {
        const { service, menus, portions } = setupIngredientsService();
        menus.findSchedules.mockResolvedValue([
            buildScheduleSummary({ id: SCHEDULE_A, primaryMenuId: "menu-1", alternativeMenuId: null }),
        ]);
        portions.countPortionsBySchedule.mockResolvedValue([
            { scheduleId: SCHEDULE_A, usesAlternativeMenu: true, portions: 3 },
            { scheduleId: "unknown", usesAlternativeMenu: false, portions: 3 },
        ]);

        expect(await service.getShoppingList()).toEqual([]);
        expect(menus.getRecipeLines).not.toHaveBeenCalled();
    });

    it("lists nothing when the stock covers the requirement", async () => {
        const { service, menus, portions, repository } = setupIngredientsService();
        menus.findSchedules.mockResolvedValue([buildScheduleSummary({ id: SCHEDULE_A, primaryMenuId: "menu-1" })]);
        portions.countPortionsBySchedule.mockResolvedValue([
            { scheduleId: SCHEDULE_A, usesAlternativeMenu: false, portions: 4 },
        ]);
        menus.getRecipeLines.mockResolvedValue([
            buildRecipeLine({ menuId: "menu-1", ingredientId: "rice", quantityPerPortion: 0.5 }),
        ]);
        repository.findByIds.mockResolvedValue([buildIngredientRecord({ id: "rice", stock: 2 })]);

        expect(await service.getShoppingList()).toEqual([]);
    });
});
