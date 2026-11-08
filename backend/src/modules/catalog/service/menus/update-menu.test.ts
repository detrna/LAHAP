import { describe, expect, it } from "vitest";
import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { ValidationError } from "../../../../shared/errors/validation-error.js";
import { buildMenuRecord, buildScheduleRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { MenuNotFoundError, UnknownIngredientError } from "../interfaces/catalog.repository.js";

const EXISTING = buildMenuRecord({
    id: "m-1",
    isAlternative: true,
    photoKey: "menus/2026/11/old.webp",
    ingredients: [{ ingredientId: "i-1", quantityPerPortion: 0.25 }],
});

function setup() {
    const context = setupCatalogService();
    context.repository.findMenuById.mockResolvedValue(EXISTING);
    context.repository.updateMenu.mockResolvedValue(EXISTING);
    return context;
}

describe("CatalogService.updateMenu (unit)", () => {
    it("throws MenuNotFoundError when missing", async () => {
        const { service } = setupCatalogService();

        await expect(service.updateMenu("missing", { name: "x" })).rejects.toBeInstanceOf(MenuNotFoundError);
    });

    it("throws MenuNotFoundError when the row disappears before the update", async () => {
        const { repository, service } = setup();
        repository.updateMenu.mockResolvedValue(null);

        await expect(service.updateMenu("m-1", { name: "x" })).rejects.toBeInstanceOf(MenuNotFoundError);
    });

    it("sends the changes without the change reason", async () => {
        const { repository, service } = setup();

        await service.updateMenu("m-1", { name: "Baru", tags: [], changeReason: "stok habis" });

        expect(repository.updateMenu).toHaveBeenCalledWith("m-1", { name: "Baru", tags: [] });
    });

    it("checks a new photo key only", async () => {
        const { photoKeys, service } = setup();

        await service.updateMenu("m-1", { photoKey: "menus/2026/11/old.webp" });
        expect(photoKeys.assertPhotoKeyExists).not.toHaveBeenCalled();

        await service.updateMenu("m-1", { photoKey: "menus/2026/11/new.webp" });
        expect(photoKeys.assertPhotoKeyExists).toHaveBeenCalledWith("menus/2026/11/new.webp");
    });

    it("throws UnknownIngredientError for new ingredients that don't exist", async () => {
        const { ingredients, service } = setup();
        ingredients.findMissingIngredientIds.mockResolvedValue(["i-9"]);

        await expect(
            service.updateMenu("m-1", { ingredients: [{ ingredientId: "i-9", quantityPerPortion: 1 }] }),
        ).rejects.toBeInstanceOf(UnknownIngredientError);
    });

    describe("turning the alternative flag off", () => {
        it("gives 422 while the menu is some schedule's alternative", async () => {
            const { repository, service } = setup();
            repository.findScheduleIdsUsingMenu.mockResolvedValue(["s-1"]);

            await expect(service.updateMenu("m-1", { isAlternative: false })).rejects.toBeInstanceOf(InvalidStateError);
            expect(repository.findScheduleIdsUsingMenu).toHaveBeenCalledWith("m-1", "alternative");
            expect(repository.updateMenu).not.toHaveBeenCalled();
        });

        it("is allowed when no schedule uses it as the alternative", async () => {
            const { repository, service } = setup();

            await service.updateMenu("m-1", { isAlternative: false });

            expect(repository.updateMenu).toHaveBeenCalledWith("m-1", { isAlternative: false });
        });
    });

    describe("changing the recipe of a menu on paid schedules", () => {
        const NEW_RECIPE = [{ ingredientId: "i-1", quantityPerPortion: 0.5 }];

        it("requires a change reason", async () => {
            const { repository, orderActivity, service } = setup();
            repository.findScheduleIdsUsingMenu.mockResolvedValue(["s-1", "s-2"]);
            orderActivity.findSchedulesWithOrders.mockResolvedValue(["s-2"]);

            const error = await service
                .updateMenu("m-1", { ingredients: NEW_RECIPE })
                .catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(ValidationError);
            expect((error as ValidationError).issues[0]).toMatchObject({
                path: "changeReason",
                code: "change_reason_required",
            });
            expect(orderActivity.findSchedulesWithOrders).toHaveBeenCalledWith(["s-1", "s-2"], ["Success"]);
        });

        it("accepts the change with a reason", async () => {
            const { repository, orderActivity, service } = setup();
            repository.findScheduleIdsUsingMenu.mockResolvedValue(["s-1"]);
            orderActivity.findSchedulesWithOrders.mockResolvedValue(["s-1"]);

            await service.updateMenu("m-1", { ingredients: NEW_RECIPE, changeReason: "bahan diganti" });

            expect(repository.updateMenu).toHaveBeenCalledWith("m-1", { ingredients: NEW_RECIPE });
        });

        it("announces the change on each paid schedule that uses the menu, with the reason", async () => {
            const { repository, orderActivity, announcer, service } = setup();
            repository.findScheduleIdsUsingMenu.mockResolvedValue(["s-1", "s-2"]);
            orderActivity.findSchedulesWithOrders.mockResolvedValue(["s-2"]);
            repository.findSchedules.mockResolvedValue([buildScheduleRecord({ id: "s-2" })]);

            await service.updateMenu("m-1", { ingredients: NEW_RECIPE, changeReason: "bahan diganti" });

            expect(announcer.announce).toHaveBeenCalledTimes(1);
            expect(announcer.announce.mock.calls[0]?.[0]).toMatchObject({ scope: "SCHEDULE", menuScheduleId: "s-2" });
            expect(announcer.announce.mock.calls[0]?.[0].body).toContain("bahan diganti");
        });

        it("announces nothing when no schedule has paid orders", async () => {
            const { repository, announcer, service } = setup();
            repository.findScheduleIdsUsingMenu.mockResolvedValue(["s-1"]);

            await service.updateMenu("m-1", { ingredients: NEW_RECIPE });

            expect(announcer.announce).not.toHaveBeenCalled();
        });

        it("announces nothing when the update is refused", async () => {
            const { repository, orderActivity, announcer, service } = setup();
            repository.findScheduleIdsUsingMenu.mockResolvedValue(["s-1"]);
            orderActivity.findSchedulesWithOrders.mockResolvedValue(["s-1"]);

            await expect(service.updateMenu("m-1", { ingredients: NEW_RECIPE })).rejects.toBeInstanceOf(
                ValidationError,
            );

            expect(announcer.announce).not.toHaveBeenCalled();
        });

        it("needs no reason when the recipe is resent unchanged", async () => {
            const { repository, orderActivity, service } = setup();

            await service.updateMenu("m-1", { ingredients: EXISTING.ingredients });

            expect(repository.findScheduleIdsUsingMenu).not.toHaveBeenCalled();
            expect(orderActivity.findSchedulesWithOrders).not.toHaveBeenCalled();
        });

        it("needs no reason when no schedule uses the menu", async () => {
            const { orderActivity, service } = setup();

            await service.updateMenu("m-1", { ingredients: NEW_RECIPE });

            expect(orderActivity.findSchedulesWithOrders).not.toHaveBeenCalled();
        });
    });

    describe("components", () => {
        it("replaces the list, mapping a missing cook to null", async () => {
            const { repository, cooks, service } = setup();

            await service.updateMenu("m-1", {
                components: [{ name: "Nasi Putih" }, { name: "Ayam Bakar", cookId: "c-1" }],
            });

            expect(cooks.filterActiveUserIds).toHaveBeenCalledWith(["c-1"], "KITCHEN");
            expect(repository.updateMenu).toHaveBeenCalledWith("m-1", {
                components: [
                    { name: "Nasi Putih", cookId: null },
                    { name: "Ayam Bakar", cookId: "c-1" },
                ],
            });
        });

        it("clears the list when an empty one is sent", async () => {
            const { repository, cooks, service } = setup();

            await service.updateMenu("m-1", { components: [] });

            expect(cooks.filterActiveUserIds).not.toHaveBeenCalled();
            expect(repository.updateMenu).toHaveBeenCalledWith("m-1", { components: [] });
        });

        it("leaves components alone when none are sent", async () => {
            const { repository, service } = setup();

            await service.updateMenu("m-1", { name: "Baru" });

            expect(repository.updateMenu).toHaveBeenCalledWith("m-1", { name: "Baru" });
        });

        it("gives 422 when a cook is not an active kitchen staff, writing nothing", async () => {
            const { repository, cooks, service } = setup();
            cooks.filterActiveUserIds.mockResolvedValue([]);

            await expect(
                service.updateMenu("m-1", { components: [{ name: "Ayam Bakar", cookId: "c-1" }] }),
            ).rejects.toThrow(new InvalidStateError("cook is not an active kitchen staff"));
            expect(repository.updateMenu).not.toHaveBeenCalled();
        });

        it("needs no change reason and announces nothing, even on a menu with paid orders", async () => {
            const { repository, orderActivity, announcer, service } = setup();
            repository.findScheduleIdsUsingMenu.mockResolvedValue(["s-1"]);
            orderActivity.findSchedulesWithOrders.mockResolvedValue(["s-1"]);

            await service.updateMenu("m-1", { components: [{ name: "Ayam Bakar", cookId: "c-1" }] });

            expect(orderActivity.findSchedulesWithOrders).not.toHaveBeenCalled();
            expect(announcer.announce).not.toHaveBeenCalled();
        });
    });
});
