import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildSettings } from "../test-utils/factory/settings.factory.js";
import { setupSettingsController } from "../test-utils/setup/settings.setup.js";

describe("SettingsController.getSettings (unit)", () => {
    it("answers with the full settings", async () => {
        const { settingsService, controller } = setupSettingsController();
        const settings = buildSettings();
        settingsService.getSettings.mockResolvedValue(settings);
        const res = createMockResponse();

        await controller.getSettings(createMockRequest(), res);

        expect(res.json).toHaveBeenCalledWith({ data: settings });
    });
});
