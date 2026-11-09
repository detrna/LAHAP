import { describe, expect, it } from "vitest";
import { buildMenuRecord, buildScheduleRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.presentSchedules (unit)", () => {
    it("loads every schedule's menus once, primary first, without recipe lines", async () => {
        const { repository, service } = setupCatalogService();
        repository.findMenusByIds.mockResolvedValue([
            buildMenuRecord({ id: "m-primary" }),
            buildMenuRecord({ id: "m-alt", isAlternative: true }),
        ]);

        const [first, second] = await service.presentSchedules(
            [
                buildScheduleRecord({ id: "s-1", primaryMenuId: "m-primary", alternativeMenuId: "m-alt" }),
                buildScheduleRecord({ id: "s-2", primaryMenuId: "m-primary" }),
            ],
            "staff",
        );

        expect(repository.findMenusByIds).toHaveBeenCalledTimes(1);
        expect(repository.findMenusByIds).toHaveBeenCalledWith(["m-primary", "m-alt"]);
        expect(first).toMatchObject({
            id: "s-1",
            date: "2026-11-12",
            deliveryTime: { time: "07:00", range: "Pagi" },
            createdAt: "2026-11-01T07:00:00.000+07:00",
        });
        expect(first?.menus?.map(menu => [menu.menuId, menu.isPrimary])).toEqual([
            ["m-primary", true],
            ["m-alt", false],
        ]);
        expect(first?.menus?.[0]?.menu?.ingredients).toBeUndefined();
        expect(first?.menus?.[0]?.menu?.allergies).toEqual([]);
        expect(second?.menus).toHaveLength(1);
    });

    it("returns no menus for a schedule without links", async () => {
        const { repository, service } = setupCatalogService();

        const [schedule] = await service.presentSchedules([buildScheduleRecord({ primaryMenuId: null })], "staff");

        expect(schedule?.menus).toEqual([]);
        expect(repository.findMenusByIds).toHaveBeenCalledWith([]);
    });

    describe("cooks", () => {
        const component = { id: "k-1", name: "Ayam Bakar", cookId: "c-1" };
        const siti = { id: "c-1", name: "Siti", phone: "628120000001", role: "KITCHEN" } as const;

        it("shows staff each component's cook id and name, without the phone", async () => {
            const { repository, cooks, service } = setupCatalogService();
            repository.findMenusByIds.mockResolvedValue([buildMenuRecord({ id: "m-1", components: [component] })]);
            cooks.getSummaries.mockResolvedValue([siti]);

            const [schedule] = await service.presentSchedules([buildScheduleRecord({ primaryMenuId: "m-1" })], "staff");

            expect(schedule?.menus?.[0]?.menu?.components).toEqual([
                { id: "k-1", name: "Ayam Bakar", cook: { id: "c-1", name: "Siti" } },
            ]);
        });

        it("shows customers component names only and never looks a cook up", async () => {
            const { repository, cooks, service } = setupCatalogService();
            repository.findMenusByIds.mockResolvedValue([buildMenuRecord({ id: "m-1", components: [component] })]);

            const [schedule] = await service.presentSchedules(
                [buildScheduleRecord({ primaryMenuId: "m-1" })],
                "customer",
            );

            expect(cooks.getSummaries).not.toHaveBeenCalled();
            expect(schedule?.menus?.[0]?.menu?.components).toEqual([{ id: "k-1", name: "Ayam Bakar" }]);
            expect(schedule?.menus?.[0]?.menu).not.toHaveProperty("ingredients");
        });
    });
});
