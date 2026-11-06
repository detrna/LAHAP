import { describe, expect, it } from "vitest";
import { buildSettingsRecord } from "../test-utils/factory/settings.factory.js";
import { setupSettingsService } from "../test-utils/setup/settings.setup.js";
import { BusinessNotConfiguredError } from "./interfaces/settings.repository.js";

describe("SettingsService.getSettings (unit)", () => {
    it("returns every setting with updatedAt in Asia/Jakarta", async () => {
        const { repository, service } = setupSettingsService();
        repository.find.mockResolvedValue(buildSettingsRecord());

        expect(await service.getSettings()).toEqual({
            name: "test name",
            whatsappNumber: "6281200000000",
            address: "test address",
            latitude: -7.9406,
            longitude: 112.6219,
            deliveryFreeRadius: 1,
            deliveryMaxDistance: 10,
            deliveryPricePerKm: 5000,
            paymentTimeoutMinutes: 15,
            updatedAt: "2026-11-03T08:00:00.000+07:00",
        });
    });

    it("gives 500 BUSINESS_NOT_CONFIGURED when there is no business row", async () => {
        const { service } = setupSettingsService();

        await expect(service.getSettings()).rejects.toMatchObject({
            constructor: BusinessNotConfiguredError,
            code: "BUSINESS_NOT_CONFIGURED",
            statusCode: 500,
            message: "business settings are not configured",
        });
    });
});
