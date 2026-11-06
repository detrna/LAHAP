import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildBusinessInfo } from "../test-utils/factory/settings.factory.js";
import { setupSettingsController } from "../test-utils/setup/settings.setup.js";

describe("SettingsController.getBusinessInfo (unit)", () => {
    it("answers with the public business profile", async () => {
        const { settingsService, controller } = setupSettingsController();
        const info = buildBusinessInfo();
        settingsService.getBusinessInfo.mockResolvedValue(info);
        const res = createMockResponse();

        await controller.getBusinessInfo(createMockRequest(), res);

        expect(res.json).toHaveBeenCalledWith({ data: info });
    });
});
