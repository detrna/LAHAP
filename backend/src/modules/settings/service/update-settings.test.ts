import { describe, expect, it } from "vitest";
import { buildSettingsRecord } from "../test-utils/factory/settings.factory.js";
import { setupSettingsService } from "../test-utils/setup/settings.setup.js";

describe("SettingsService.updateSettings (unit)", () => {
    it("saves the changes and returns the stored settings", async () => {
        const { repository, service } = setupSettingsService();
        const { updatedAt: _updatedAt, ...changes } = buildSettingsRecord({ deliveryPricePerKm: 6500 });
        repository.save.mockResolvedValue(buildSettingsRecord({ deliveryPricePerKm: 6500 }));

        const settings = await service.updateSettings(changes);

        expect(repository.save).toHaveBeenCalledWith(changes);
        expect(settings).toMatchObject({ deliveryPricePerKm: 6500, updatedAt: "2026-11-03T08:00:00.000+07:00" });
    });
});
