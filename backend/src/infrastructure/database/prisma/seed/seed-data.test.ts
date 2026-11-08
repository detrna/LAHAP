import { describe, expect, it } from "vitest";
import { z } from "zod";
import { isNormalizedPhone } from "../../../../shared/utils/phone/phone.js";
import { ALLERGIES } from "./modules/allergies/allergies.data.js";
import { BUSINESS } from "./modules/business/business.data.js";
import { INGREDIENTS } from "./modules/ingredients/ingredients.data.js";
import { MENUS } from "./modules/menus/menus.data.js";
import { MESSAGE_TEMPLATES } from "./modules/message-templates/message-templates.data.js";
import { PACKAGES } from "./modules/packages/packages.data.js";
import { PROMO_CODES } from "./modules/promo-codes/promo-codes.data.js";
import { PACKAGE_OPEN_DAYS_AGO } from "./modules/packages/packages.data.js";
import { ALTERNATIVES_BY_MEAL, PAST_DAYS, WEEKLY_PLANS } from "./modules/schedules/schedules.data.js";
import { TIERS } from "./modules/tiers/tiers.data.js";
import { USERS } from "./modules/users/users.data.js";

const allIds = [
    BUSINESS.id,
    ...Object.values(ALLERGIES).map(a => a.id),
    ...USERS.map(u => u.id),
    ...TIERS.map(t => t.id),
    ...Object.values(INGREDIENTS).map(i => i.id),
    ...Object.values(MENUS).map(m => m.id),
    ...Object.values(PACKAGES).map(p => p.id),
    ...PROMO_CODES.map(p => p.id),
    ...MESSAGE_TEMPLATES.map(t => t.id),
];

describe("seed data (unit)", () => {
    it("uses unique ids that pass the API's uuid validation", () => {
        expect(new Set(allIds).size).toBe(allIds.length);
        for (const id of allIds) expect(z.uuid().safeParse(id).success).toBe(true);
    });

    it("stores phones normalized to 62… and keeps them unique", () => {
        const phones = USERS.map(u => u.phone);
        expect(new Set(phones).size).toBe(phones.length);
        for (const phone of phones) expect(isNormalizedPhone(phone)).toBe(true);
    });

    it("keeps packages open and schedules published far enough back for the seeded order history", () => {
        expect(PAST_DAYS).toBeGreaterThanOrEqual(40);
        expect(PACKAGE_OPEN_DAYS_AGO).toBeGreaterThan(PAST_DAYS);
    });

    it("plans 7 days with one primary menu per package meal time", () => {
        for (const [key, plan] of Object.entries(WEEKLY_PLANS)) {
            const times = PACKAGES[key as keyof typeof PACKAGES].deliveryTimes.length;
            expect(plan).toHaveLength(7);
            for (const day of plan) {
                expect(day).toHaveLength(times);
                for (const menu of day) expect(MENUS[menu].isAlternative).toBe(false);
            }
        }
    });

    it("uses allergen-free alternative menus", () => {
        for (const key of ALTERNATIVES_BY_MEAL) {
            const menu = MENUS[key];
            expect(menu.isAlternative).toBe(true);
            const allergens = Object.keys(menu.ingredients).flatMap(
                i => INGREDIENTS[i as keyof typeof INGREDIENTS].allergies,
            );
            expect(allergens).toEqual([]);
        }
    });

    it("keeps tier thresholds unique and discounts within 0–100%", () => {
        const days = TIERS.map(t => t.requiredSubscriptionDays);
        expect(new Set(days).size).toBe(days.length);
        for (const tier of TIERS) expect(Number(tier.discountPercent)).toBeGreaterThanOrEqual(0);
        for (const tier of TIERS) expect(Number(tier.discountPercent)).toBeLessThanOrEqual(100);
    });

    describe("menu components", () => {
        const kitchenIds = USERS.filter(user => user.role === "KITCHEN").map(user => user.id);

        it("gives every menu at least one component with a unique, valid name", () => {
            for (const menu of Object.values(MENUS)) {
                expect(menu.components.length).toBeGreaterThan(0);
                const names = menu.components.map(component => component.name.trim().toLowerCase());
                expect(new Set(names).size).toBe(names.length);
                for (const component of menu.components) {
                    expect(component.name.trim()).toBe(component.name);
                    expect(component.name.length).toBeGreaterThan(0);
                    expect(component.name.length).toBeLessThanOrEqual(100);
                }
            }
        });

        it("assigns cooks only to seeded kitchen staff", () => {
            const cooks = Object.values(MENUS)
                .flatMap(menu => menu.components)
                .flatMap(component => (component.cookId === null ? [] : [component.cookId]));

            expect(kitchenIds.length).toBeGreaterThan(0);
            for (const cookId of cooks) expect(kitchenIds).toContain(cookId);
        });

        it("assigns a cook to some components and leaves others open", () => {
            const components = Object.values(MENUS).flatMap(menu => menu.components);

            expect(components.some(component => component.cookId !== null)).toBe(true);
            expect(components.some(component => component.cookId === null)).toBe(true);
        });
    });
});
