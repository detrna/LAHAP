import { describe, expect, it } from "vitest";
import { buildScheduleRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { MenuScheduleNotFoundError } from "../interfaces/catalog.repository.js";

describe("CatalogService.getSchedule (unit)", () => {
    it("returns the schedule", async () => {
        const { repository, service } = setupCatalogService();
        repository.findScheduleById.mockResolvedValue(buildScheduleRecord({ id: "s-1" }));

        expect((await service.getSchedule("s-1")).id).toBe("s-1");
    });

    it("throws MenuScheduleNotFoundError when missing", async () => {
        const { service } = setupCatalogService();

        await expect(service.getSchedule("missing")).rejects.toBeInstanceOf(MenuScheduleNotFoundError);
    });
});
