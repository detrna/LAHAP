import { describe, expect, it, vi } from "vitest";
import { createMockLogger } from "../../../../../tests/utils/mocks/logger.js";
import { cleanSeed, SEED_IDS } from "./clean-seed.js";
import { ALLERGIES } from "./modules/allergies/allergies.data.js";
import { BUSINESS } from "./modules/business/business.data.js";
import { INGREDIENTS } from "./modules/ingredients/ingredients.data.js";
import { MENUS } from "./modules/menus/menus.data.js";
import { MESSAGE_TEMPLATES } from "./modules/message-templates/message-templates.data.js";
import { PACKAGES } from "./modules/packages/packages.data.js";
import { PROMO_CODES } from "./modules/promo-codes/promo-codes.data.js";
import { TIERS } from "./modules/tiers/tiers.data.js";
import { USERS } from "./modules/users/users.data.js";
import type { SeedTx } from "./seed-context.js";

interface RecordedOperation {
    readonly model: string;
    readonly action: "select" | "delete";
    readonly column: string;
    readonly values: readonly string[];
}

function createFakeSeedTx(
    options: {
        readonly userSubIds?: readonly string[];
        readonly pkgSubIds?: readonly string[];
        readonly scheduleIds?: readonly string[];
        readonly deleteCounts?: Readonly<Record<string, number>>;
    } = {},
) {
    const operations: RecordedOperation[] = [];
    const userSubCalls = { count: 0 };

    const makeModel = (model: string) => ({
        where: (predicate: (row: Record<string, { in: (vals: readonly string[]) => unknown }>) => unknown) => {
            let capturedColumn = "";
            let capturedValues: readonly string[] = [];
            const proxy = new Proxy(
                {},
                {
                    get(_target, prop: string) {
                        return {
                            in(vals: readonly string[]) {
                                capturedColumn = prop;
                                capturedValues = vals;
                                return {};
                            },
                        };
                    },
                },
            );
            predicate(proxy);

            return {
                select: () => ({
                    all: vi.fn(async () => {
                        operations.push({
                            model,
                            action: "select",
                            column: capturedColumn,
                            values: capturedValues,
                        });
                        if (model === "Subscription" && capturedColumn === "userId") {
                            userSubCalls.count += 1;
                            return (options.userSubIds ?? []).map(id => ({ id }));
                        }
                        if (model === "Subscription" && capturedColumn === "packageId") {
                            return (options.pkgSubIds ?? []).map(id => ({ id }));
                        }
                        if (model === "Schedule") {
                            return (options.scheduleIds ?? []).map(id => ({ id }));
                        }
                        return [];
                    }),
                }),
                deleteAndCount: vi.fn(async () => {
                    operations.push({
                        model,
                        action: "delete",
                        column: capturedColumn,
                        values: capturedValues,
                    });
                    return options.deleteCounts?.[model] ?? capturedValues.length;
                }),
            };
        },
    });

    const ormPublic = new Proxy(
        {},
        {
            get(_target, prop: string) {
                return makeModel(prop);
            },
        },
    );

    return {
        tx: { orm: { public: ormPublic } } as unknown as SeedTx,
        operations,
    };
}

describe("cleanSeed (unit)", () => {
    it("collects every seeded id across all static seed modules", () => {
        expect(SEED_IDS.business).toEqual([BUSINESS.id]);
        expect(SEED_IDS.allergies).toEqual(Object.values(ALLERGIES).map(a => a.id));
        expect(SEED_IDS.users).toEqual(USERS.map(u => u.id));
        expect(SEED_IDS.tiers).toEqual(Object.values(TIERS).map(t => t.id));
        expect(SEED_IDS.ingredients).toEqual(Object.values(INGREDIENTS).map(i => i.id));
        expect(SEED_IDS.menus).toEqual(Object.values(MENUS).map(m => m.id));
        expect(SEED_IDS.packages).toEqual(Object.values(PACKAGES).map(p => p.id));
        expect(SEED_IDS.promoCodes).toEqual(PROMO_CODES.map(p => p.id));
        expect(SEED_IDS.messageTemplates).toEqual(MESSAGE_TEMPLATES.map(t => t.id));
    });

    it("deletes dependent rows and seeded modules in reverse FK order using only seeded ids", async () => {
        const logger = createMockLogger();
        const { tx, operations } = createFakeSeedTx({
            userSubIds: ["sub-1", "sub-2"],
            pkgSubIds: ["sub-2", "sub-3"],
            scheduleIds: ["sched-1"],
            deleteCounts: {
                MessageTemplate: 3,
                PromoCode: 3,
                Schedule: 84,
                Package: 2,
                Menu: 10,
                Ingredient: 14,
                Tier: 3,
                User: 8,
                Allergy: 4,
                Business: 1,
            },
        });

        const totals = await cleanSeed(tx, logger);

        expect(totals).toEqual({
            "message-templates": 3,
            "promo-codes": 3,
            schedules: 84,
            packages: 2,
            menus: 10,
            ingredients: 14,
            tiers: 3,
            users: 8,
            allergies: 4,
            business: 1,
        });

        const deletes = operations.filter(op => op.action === "delete");
        expect(deletes).toEqual([
            { model: "DeliveryObstacle", action: "delete", column: "authorId", values: SEED_IDS.users },
            { model: "OrderStatusHistory", action: "delete", column: "changedById", values: SEED_IDS.users },
            { model: "IngredientStockHistory", action: "delete", column: "changedById", values: SEED_IDS.users },
            { model: "DeliveryMethodChange", action: "delete", column: "requestedById", values: SEED_IDS.users },
            {
                model: "DeliveryMethodChange",
                action: "delete",
                column: "subscriptionId",
                values: ["sub-1", "sub-2", "sub-3"],
            },
            { model: "Payment", action: "delete", column: "userId", values: SEED_IDS.users },
            { model: "Payment", action: "delete", column: "subscriptionId", values: ["sub-1", "sub-2", "sub-3"] },
            { model: "Order", action: "delete", column: "menuScheduleId", values: ["sched-1"] },
            { model: "Subscription", action: "delete", column: "id", values: ["sub-1", "sub-2", "sub-3"] },
            { model: "Membership", action: "delete", column: "tierId", values: SEED_IDS.tiers },
            { model: "Membership", action: "delete", column: "userId", values: SEED_IDS.users },
            { model: "ScheduleMenu", action: "delete", column: "menuId", values: SEED_IDS.menus },
            { model: "MenuIngredient", action: "delete", column: "ingredientId", values: SEED_IDS.ingredients },
            { model: "MessageTemplate", action: "delete", column: "id", values: SEED_IDS.messageTemplates },
            { model: "PromoCode", action: "delete", column: "id", values: SEED_IDS.promoCodes },
            { model: "Schedule", action: "delete", column: "packageId", values: SEED_IDS.packages },
            { model: "Package", action: "delete", column: "id", values: SEED_IDS.packages },
            { model: "Menu", action: "delete", column: "id", values: SEED_IDS.menus },
            { model: "Ingredient", action: "delete", column: "id", values: SEED_IDS.ingredients },
            { model: "Tier", action: "delete", column: "id", values: SEED_IDS.tiers },
            { model: "User", action: "delete", column: "id", values: SEED_IDS.users },
            { model: "Allergy", action: "delete", column: "id", values: SEED_IDS.allergies },
            { model: "Business", action: "delete", column: "id", values: SEED_IDS.business },
        ]);
        expect(logger.info).toHaveBeenCalledTimes(10);
    });

    it("skips subscription and schedule child deletes when no seeded subscriptions or schedules exist", async () => {
        const { tx, operations } = createFakeSeedTx();

        await cleanSeed(tx);

        const deletedModels = operations.filter(op => op.action === "delete").map(op => `${op.model}.${op.column}`);
        expect(deletedModels).not.toContain("DeliveryMethodChange.subscriptionId");
        expect(deletedModels).not.toContain("Payment.subscriptionId");
        expect(deletedModels).not.toContain("Order.menuScheduleId");
        expect(deletedModels).not.toContain("Subscription.id");
    });
});
