import { describe, expect, it } from "vitest";
import {
    buildAllergy,
    buildMenu,
    buildPackage,
    buildScheduleSummary,
} from "../../../catalog/test-utils/factory/catalog.factory.js";
import { buildSettings } from "../../../settings/test-utils/factory/settings.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";
import type { CheckoutInput } from "./checkout-input.js";

const NOW = "2026-11-06T10:00:00+07:00[Asia/Jakarta]";
const KITCHEN = { latitude: -7.9666, longitude: 112.6326 };
const KM_PER_DEGREE_LAT = 111.19508;
const PACKAGE_ID = "10000000-0000-4000-8000-000000000001";
const PRIMARY_ID = "20000000-0000-4000-8000-000000000001";
const ALTERNATIVE_ID = "20000000-0000-4000-8000-000000000002";
const EGG = buildAllergy({ id: "30000000-0000-4000-8000-000000000001", name: "Telur" });
const NUTS = buildAllergy({ id: "30000000-0000-4000-8000-000000000002", name: "Kacang" });

const pkg = buildPackage({
    id: PACKAGE_ID,
    basePrice: 15000,
    periods: ["Harian", "Mingguan"],
    deliveryTimes: [
        { time: "07:00", range: "Pagi" },
        { time: "12:00", range: "Siang" },
    ],
    isAvailable: true,
});
const menu = buildMenu({ id: PRIMARY_ID, allergies: [EGG, NUTS] });
const schedule = (id: string, date: string, time = "12:00") =>
    buildScheduleSummary({
        id,
        packageId: PACKAGE_ID,
        date,
        deliveryTime: { time, range: time === "07:00" ? "Pagi" : "Siang" },
        isPublished: true,
        primaryMenuId: PRIMARY_ID,
        alternativeMenuId: null,
    });
const MON = schedule("40000000-0000-4000-8000-000000000001", "2026-11-09");
const TUE = schedule("40000000-0000-4000-8000-000000000002", "2026-11-10");

const daily = (overrides: Partial<CheckoutInput> = {}): CheckoutInput =>
    ({
        period: "Harian",
        menuScheduleIds: [TUE.id, MON.id],
        packageId: PACKAGE_ID,
        purchaseType: "Online",
        isDelivery: false,
        recipientName: "Budi",
        deliveryAddress: null,
        deliveryLatitude: null,
        deliveryLongitude: null,
        notes: null,
        promoCode: null,
        paymentMethod: "MIDTRANS",
        ...overrides,
    }) as CheckoutInput;

function setup() {
    const context = setupOrdersService(NOW);
    context.settings.getSettings.mockResolvedValue(
        buildSettings({ ...KITCHEN, deliveryFreeRadius: 3, deliveryMaxDistance: 10, deliveryPricePerKm: 2000 }),
    );
    context.catalog.getPackagesByIds.mockResolvedValue([pkg]);
    context.catalog.findSchedules.mockResolvedValue([TUE, MON]);
    context.catalog.getMenusByIds.mockResolvedValue([menu]);
    context.customers.getAllergyProfiles.mockResolvedValue([
        { userId: "user-1", allergyIds: [NUTS.id], allergyNote: null },
    ]);
    return context;
}

describe("OrdersService.previewCheckout (unit)", () => {
    it("prices the chosen slots in date order with allergy warnings and the cut-off", async () => {
        const { service, catalog } = setup();

        const preview = await service.previewCheckout("user-1", daily());

        expect(catalog.findSchedules).toHaveBeenCalledWith({ ids: [TUE.id, MON.id] });
        expect(preview.slots.map(slot => slot.menuScheduleId)).toEqual([MON.id, TUE.id]);
        expect(preview.slots[0]).toMatchObject({
            date: "2026-11-09",
            hasAlternative: false,
            clashingAllergies: [NUTS],
        });
        expect(preview).toMatchObject({
            slotCount: 2,
            startDate: "2026-11-09",
            endDate: "2026-11-10",
            cutoffAt: "2026-11-08T23:59:59.999+07:00",
            promo: null,
            pricePerPortion: 15000,
            foodSubtotal: 30000,
            tierDiscount: 0,
            promoDiscount: 0,
            deliveryFeePerSlot: 0,
            deliveryFeeTotal: 0,
            totalPrice: 30000,
            delivery: { available: false, distanceKm: null, maxDistanceKm: 10, feePerSlot: 0 },
        });
    });

    it("quotes delivery from the kitchen to the pin and charges it per slot", async () => {
        const { service } = setup();

        const preview = await service.previewCheckout(
            "user-1",
            daily({
                isDelivery: true,
                deliveryAddress: "Jl. Ijen",
                deliveryLatitude: KITCHEN.latitude + 5.5 / KM_PER_DEGREE_LAT,
                deliveryLongitude: KITCHEN.longitude,
            }),
        );

        expect(preview.delivery).toEqual({ available: true, distanceKm: 6, maxDistanceKm: 10, feePerSlot: 6000 });
        expect(preview.deliveryFeeTotal).toBe(12000);
        expect(preview.totalPrice).toBe(42000);
    });

    it("reports delivery as unavailable past the max distance without failing", async () => {
        const { service } = setup();

        const preview = await service.previewCheckout(
            "user-1",
            daily({
                isDelivery: true,
                deliveryAddress: "Jauh",
                deliveryLatitude: KITCHEN.latitude + 11.5 / KM_PER_DEGREE_LAT,
                deliveryLongitude: KITCHEN.longitude,
            }),
        );

        expect(preview.delivery).toMatchObject({ available: false, distanceKm: 12 });
    });

    it("applies the tier discount, then the promo", async () => {
        const { service, tierDiscounts, promoChecker } = setup();
        tierDiscounts.getActiveDiscount.mockResolvedValue({ tierId: "tier-silver", discountPercent: 5 });
        promoChecker.checkPromo.mockResolvedValue({
            valid: true,
            promoCode: {
                id: "promo-1",
                code: "MERDEKA",
                discountType: "Nominal",
                discountValue: 5000,
                allowStackWithTier: true,
                quota: 10,
            },
        });

        const preview = await service.previewCheckout("user-1", daily({ promoCode: "merdeka" }));

        expect(promoChecker.checkPromo).toHaveBeenCalledWith({
            code: "merdeka",
            userId: "user-1",
            foodSubtotal: 30000,
        });
        expect(preview).toMatchObject({
            promo: { code: "MERDEKA", applied: true, reason: null },
            tierDiscount: 1500,
            promoDiscount: 5000,
            totalPrice: 23500,
        });
    });

    it("reports a non-stacking promo the tier beats as TIER_DISCOUNT_LARGER", async () => {
        const { service, tierDiscounts, promoChecker } = setup();
        tierDiscounts.getActiveDiscount.mockResolvedValue({ tierId: "tier-gold", discountPercent: 10 });
        promoChecker.checkPromo.mockResolvedValue({
            valid: true,
            promoCode: {
                id: "promo-1",
                code: "KECIL",
                discountType: "Nominal",
                discountValue: 1000,
                allowStackWithTier: false,
                quota: 10,
            },
        });

        const quote = await service.quoteCheckout("user-1", daily({ promoCode: "KECIL" }));

        expect(quote.preview.promo).toEqual({ code: "KECIL", applied: false, reason: "TIER_DISCOUNT_LARGER" });
        expect(quote.preview.tierDiscount).toBe(3000);
        expect(quote.promoCodeId).toBeNull();
        expect(quote.total.tierId).toBe("tier-gold");
    });

    it("returns an invalid promo's reason without failing", async () => {
        const { service, promoChecker } = setup();
        promoChecker.checkPromo.mockResolvedValue({ valid: false, code: "NOPE", reason: "NOT_FOUND" });

        const preview = await service.previewCheckout("user-1", daily({ promoCode: "nope" }));

        expect(preview.promo).toEqual({ code: "NOPE", applied: false, reason: "NOT_FOUND" });
        expect(preview.totalPrice).toBe(30000);
    });

    it("refuses an unavailable or unknown package", async () => {
        const { service, catalog } = setup();
        catalog.getPackagesByIds.mockResolvedValueOnce([{ ...pkg, isAvailable: false }]);
        await expect(service.previewCheckout("user-1", daily())).rejects.toMatchObject({
            statusCode: 422,
            message: "package is not available",
        });

        catalog.getPackagesByIds.mockResolvedValueOnce([]);
        await expect(service.previewCheckout("user-1", daily())).rejects.toMatchObject({ statusCode: 422 });
    });

    it("refuses a period the package does not offer", async () => {
        const { service } = setup();

        await expect(
            service.previewCheckout("user-1", {
                ...daily(),
                period: "Bulanan",
                periodStart: Temporal.PlainDate.from("2026-12-01"),
                deliveryTimes: [Temporal.PlainTime.from("12:00")],
            } as CheckoutInput),
        ).rejects.toMatchObject({ statusCode: 422, message: "package does not offer this period" });
    });

    it.each([
        ["an unknown slot", [MON], "slot is not available"],
        ["an unpublished slot", [MON, { ...TUE, isPublished: false }], "slot is not available"],
        ["a slot of another package", [MON, { ...TUE, packageId: "other" }], "slot is not available"],
        ["a slot dated today", [MON, { ...TUE, date: "2026-11-06" }], "cut-off has passed"],
    ])("refuses %s", async (_, found, message) => {
        const { service, catalog } = setup();
        catalog.findSchedules.mockResolvedValue(found);

        await expect(service.previewCheckout("user-1", daily())).rejects.toMatchObject({ statusCode: 422, message });
    });

    describe("weekly orders", () => {
        const weekly = (periodStart: string, times: readonly string[]) =>
            ({
                ...daily(),
                period: "Mingguan",
                periodStart: Temporal.PlainDate.from(periodStart),
                deliveryTimes: times.map(time => Temporal.PlainTime.from(time)),
            }) as CheckoutInput;

        it("takes the week's published slots at the chosen times", async () => {
            const { service, catalog } = setup();
            const breakfast = schedule("40000000-0000-4000-8000-000000000003", "2026-11-09", "07:00");
            catalog.findSchedules.mockResolvedValue([TUE, breakfast, MON]);

            const preview = await service.previewCheckout("user-1", weekly("2026-11-09", ["12:00"]));

            expect(catalog.findSchedules).toHaveBeenCalledWith({
                packageId: PACKAGE_ID,
                from: Temporal.PlainDate.from("2026-11-09"),
                to: Temporal.PlainDate.from("2026-11-15"),
                isPublished: true,
            });
            expect(preview.slots.map(slot => slot.menuScheduleId)).toEqual([MON.id, TUE.id]);
        });

        it("starts a week already under way from tomorrow", async () => {
            const { service, catalog } = setup();

            await service.previewCheckout("user-1", weekly("2026-11-02", ["12:00"])).catch(() => undefined);

            expect(catalog.findSchedules).toHaveBeenCalledWith(
                expect.objectContaining({ from: Temporal.PlainDate.from("2026-11-07") }),
            );
        });

        it("refuses a week that is over", async () => {
            const { service, catalog } = setup();

            await expect(service.previewCheckout("user-1", weekly("2026-10-26", ["12:00"]))).rejects.toMatchObject({
                statusCode: 422,
                message: "no slots to order",
            });
            expect(catalog.findSchedules).not.toHaveBeenCalled();
        });

        it("refuses a meal time the package does not offer", async () => {
            const { service } = setup();

            await expect(service.previewCheckout("user-1", weekly("2026-11-09", ["18:30"]))).rejects.toMatchObject({
                statusCode: 422,
                message: "package does not offer delivery time 18:30",
            });
        });

        it("refuses a week with no published slots", async () => {
            const { service, catalog } = setup();
            catalog.findSchedules.mockResolvedValue([]);

            await expect(service.previewCheckout("user-1", weekly("2026-11-09", ["12:00"]))).rejects.toMatchObject({
                message: "no slots to order",
            });
        });
    });

    it("marks slots that have an alternative menu", async () => {
        const { service, catalog } = setup();
        catalog.findSchedules.mockResolvedValue([{ ...MON, alternativeMenuId: ALTERNATIVE_ID }]);

        const preview = await service.previewCheckout("user-1", daily({ menuScheduleIds: [MON.id] }));

        expect(preview.slots[0]?.hasAlternative).toBe(true);
    });
});
