import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildSettings } from "../test-utils/factory/settings.factory.js";
import { setupSettingsController } from "../test-utils/setup/settings.setup.js";

describe("SettingsController.updateSettings (unit)", () => {
    it("saves the validated body and answers with the stored settings", async () => {
        const { settingsService, controller } = setupSettingsController();
        const body = buildSettings();
        settingsService.updateSettings.mockResolvedValue(body);
        const res = createMockResponse();

        await controller.updateSettings(createMockRequest({ body }), res);

        expect(settingsService.updateSettings).toHaveBeenCalledWith(body);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ data: body });
    });
});
