import { describe, expect, it } from "vitest";
import { buildAllergy, buildMenu } from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildCustomerAllergyProfile } from "../test-utils/factory/kitchen.factory.js";
import { buildServedSlot } from "../test-utils/served-slot.js";
import { buildSpecialCategory } from "./special-category.js";

const peanut = buildAllergy({ id: "a-peanut", name: "Kacang" });
const egg = buildAllergy({ id: "a-egg", name: "Telur" });
const shrimp = buildAllergy({ id: "a-shrimp", name: "Udang" });

const menus = new Map([
    ["m-1", buildMenu({ id: "m-1", allergies: [shrimp, peanut, egg] })],
    ["m-2", buildMenu({ id: "m-2", isAlternative: true, allergies: [] })],
]);
const packageNames = new Map([["p-1", "Diet Sehat"]]);

interface ServeOptions {
    readonly orderId?: string;
    readonly userId?: string;
    readonly recipientName?: string;
    readonly notes?: string | null;
    readonly alt?: boolean;
    readonly isDelivery?: boolean;
    readonly time?: "07:00" | "12:00";
}

function serve(options: ServeOptions = {}) {
    const time = options.time ?? "07:00";
    return buildServedSlot({
        schedule: {
            id: "s-1",
            packageId: "p-1",
            deliveryTime: { time, range: time === "07:00" ? "Pagi" : "Siang" },
            primaryMenuId: "m-1",
            alternativeMenuId: "m-2",
        },
        slot: {
            orderId: options.orderId ?? "o-1",
            userId: options.userId ?? "u-1",
            recipientName: options.recipientName ?? "Bu Rina",
            notes: options.notes ?? null,
            usesAlternativeMenu: options.alt ?? false,
            isDelivery: options.isDelivery ?? false,
        },
    });
}

function profiles(...items: Parameters<typeof buildCustomerAllergyProfile>[0][]) {
    return new Map(items.map(item => [item?.userId ?? "u-1", buildCustomerAllergyProfile(item)]));
}

describe("buildSpecialCategory (unit)", () => {
    it("flags a customer whose allergies meet the primary menu's allergens, sorted by allergen name", () => {
        const result = buildSpecialCategory([serve()], {
            menus,
            packageNames,
            profiles: profiles({ userId: "u-1", allergyIds: ["a-shrimp", "a-peanut", "a-other"] }),
        });

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ reasons: ["ALLERGY_CLASH"], conflictingAllergies: [peanut, shrimp] });
        expect(result[0]).not.toHaveProperty("allergyNote");
        expect(result[0]).not.toHaveProperty("note");
    });

    it("leaves out a customer whose allergies do not meet the menu", () => {
        const result = buildSpecialCategory([serve()], {
            menus,
            packageNames,
            profiles: profiles({ userId: "u-1", allergyIds: ["a-other"] }),
        });

        expect(result).toEqual([]);
    });

    it("flags any customer with a free-text allergy note, trimmed", () => {
        const result = buildSpecialCategory([serve()], {
            menus,
            packageNames,
            profiles: profiles({ userId: "u-1", allergyNote: "  allergic to mango " }),
        });

        expect(result[0]).toMatchObject({ reasons: ["ALLERGY_NOTE"], allergyNote: "allergic to mango" });
        expect(result[0]).not.toHaveProperty("conflictingAllergies");
    });

    it("flags an order with a note, trimmed", () => {
        const result = buildSpecialCategory([serve({ notes: " no chili " })], {
            menus,
            packageNames,
            profiles: profiles({ userId: "u-1" }),
        });

        expect(result[0]).toMatchObject({ reasons: ["NOTE"], note: "no chili" });
    });

    it("does not flag blank notes", () => {
        const result = buildSpecialCategory([serve({ notes: "   " })], {
            menus,
            packageNames,
            profiles: profiles({ userId: "u-1", allergyNote: "  " }),
        });

        expect(result).toEqual([]);
    });

    it("lists every reason that applies, in a fixed order", () => {
        const result = buildSpecialCategory([serve({ notes: "ring the bell" })], {
            menus,
            packageNames,
            profiles: profiles({ userId: "u-1", allergyIds: ["a-egg"], allergyNote: "also mango" }),
        });

        expect(result[0]?.reasons).toEqual(["ALLERGY_CLASH", "ALLERGY_NOTE", "NOTE"]);
    });

    it("still flags a slot already switched to the alternative, judged by the primary menu", () => {
        const result = buildSpecialCategory([serve({ alt: true })], {
            menus,
            packageNames,
            profiles: profiles({ userId: "u-1", allergyIds: ["a-egg"] }),
        });

        expect(result[0]).toMatchObject({
            reasons: ["ALLERGY_CLASH"],
            primaryMenuId: "m-1",
            alternativeMenuId: "m-2",
            usesAlternativeMenu: true,
        });
    });

    it("describes the slot", () => {
        const [entry] = buildSpecialCategory(
            [serve({ orderId: "o-9", recipientName: "Pak Andi", isDelivery: true, time: "12:00", notes: "gate" })],
            { menus, packageNames, profiles: profiles({ userId: "u-1" }) },
        );

        expect(entry).toEqual({
            orderId: "o-9",
            recipientName: "Pak Andi",
            isDelivery: true,
            deliveryTime: { time: "12:00", range: "Siang" },
            reasons: ["NOTE"],
            note: "gate",
            primaryMenuId: "m-1",
            alternativeMenuId: "m-2",
            usesAlternativeMenu: false,
            packageName: "Diet Sehat",
        });
    });

    it("judges a customer with no profile by the order note only", () => {
        const result = buildSpecialCategory([serve({ notes: "extra rice" })], {
            menus,
            packageNames,
            profiles: new Map(),
        });

        expect(result[0]?.reasons).toEqual(["NOTE"]);
    });

    it("sorts the entries by meal time, then recipient name", () => {
        const result = buildSpecialCategory(
            [
                serve({ orderId: "o-1", recipientName: "Zahra", time: "07:00", notes: "x" }),
                serve({ orderId: "o-2", recipientName: "Budi", time: "12:00", notes: "x" }),
                serve({ orderId: "o-3", recipientName: "Andi", time: "07:00", notes: "x" }),
            ],
            { menus, packageNames, profiles: new Map() },
        );

        expect(result.map(entry => entry.orderId)).toEqual(["o-3", "o-1", "o-2"]);
    });

    it("answers an empty list when nothing is served", () => {
        expect(buildSpecialCategory([], { menus, packageNames, profiles: new Map() })).toEqual([]);
    });
});
