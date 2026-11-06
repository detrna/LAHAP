import { describe, expect, it } from "vitest";
import { buildSettingsRecord } from "../test-utils/factory/settings.factory.js";
import { setupSettingsService } from "../test-utils/setup/settings.setup.js";
import { BusinessNotConfiguredError } from "./interfaces/settings.repository.js";

describe("SettingsService.getBusinessInfo (unit)", () => {
    it("exposes only the name, address, location and contact", async () => {
        const { repository, service } = setupSettingsService();
        repository.find.mockResolvedValue(buildSettingsRecord());

        expect(await service.getBusinessInfo()).toEqual({
            name: "test name",
            address: "test address",
            latitude: -7.9406,
            longitude: 112.6219,
            whatsappNumber: "6281200000000",
        });
    });

    it("gives 500 BUSINESS_NOT_CONFIGURED when there is no business row", async () => {
        const { service } = setupSettingsService();

        await expect(service.getBusinessInfo()).rejects.toBeInstanceOf(BusinessNotConfiguredError);
    });
});
