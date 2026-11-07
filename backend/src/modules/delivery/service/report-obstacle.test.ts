import { describe, expect, it } from "vitest";
import { InvalidStateError } from "../../../shared/errors/invalid-state-error.js";
import { OrderNotFoundError } from "../../../shared/errors/order-not-found-error.js";
import { ValidationError } from "../../../shared/errors/validation-error.js";
import { buildScheduleSummary } from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildUserSummary } from "../../users/test-utils/factory/users.factory.js";
import type { ObstacleSlot } from "../domain/courier-source.js";
import type { ObstacleRecord } from "./interfaces/delivery.repository.js";
import { setupDeliveryService } from "../test-utils/setup/delivery.setup.js";

const courier = { userId: "c-1", role: "COURIER" } as const;
const admin = { userId: "a-1", role: "ADMIN" } as const;

const slot = (overrides: Partial<ObstacleSlot> = {}): ObstacleSlot => ({
    userId: "u-1",
    courierId: "c-1",
    status: "Diantar",
    isDelivery: true,
    subscriptionStatus: "Success",
    menuScheduleId: "s-1",
    ...overrides,
});

const saved: ObstacleRecord = {
    id: "ob-1",
    orderId: "o-1",
    authorId: "c-1",
    note: "Gerbang terkunci",
    photoKey: "obstacles/2026/11/a.webp",
    createdAt: Temporal.PlainDateTime.from("2026-11-03T05:00:00"),
};

function arrange() {
    const setup = setupDeliveryService();
    setup.slots.getSlotForObstacle.mockResolvedValue(slot());
    setup.repository.createObstacle.mockResolvedValue(saved);
    setup.catalog.findSchedules.mockResolvedValue([
        buildScheduleSummary({ id: "s-1", date: "2026-11-09", deliveryTime: { time: "12:00", range: "Siang" } }),
    ]);
    setup.users.getSummaries.mockResolvedValue([
        buildUserSummary({ id: "c-1", name: "Budi", role: "COURIER", phone: "6281299999999" }),
    ]);
    return setup;
}

const input = { note: "Gerbang terkunci", photoKey: "obstacles/2026/11/a.webp" };

describe("DeliveryService.reportObstacle (unit)", () => {
    it("saves the note as the signed-in user and answers it with the author and a signed photo", async () => {
        const { service, repository, slots } = arrange();

        const obstacle = await service.reportObstacle(courier, "o-1", input);

        expect(slots.getSlotForObstacle).toHaveBeenCalledWith("o-1");
        expect(repository.createObstacle).toHaveBeenCalledWith({
            orderId: "o-1",
            authorId: "c-1",
            note: "Gerbang terkunci",
            photoKey: "obstacles/2026/11/a.webp",
        });
        expect(obstacle).toEqual({
            id: "ob-1",
            orderId: "o-1",
            authorId: "c-1",
            author: expect.objectContaining({ id: "c-1", name: "Budi" }),
            note: "Gerbang terkunci",
            photoKey: "obstacles/2026/11/a.webp",
            photoUrl: "https://storage.test/obstacles/2026/11/a.webp?signed",
            createdAt: "2026-11-03T12:00:00.000+07:00",
        });
    });

    it("saves a note without a photo", async () => {
        const { service, repository, photoKeys } = arrange();
        repository.createObstacle.mockResolvedValue({ ...saved, photoKey: null });

        const obstacle = await service.reportObstacle(courier, "o-1", { note: "Hujan" });

        expect(repository.createObstacle).toHaveBeenCalledWith(expect.objectContaining({ photoKey: null }));
        expect(photoKeys.assertPhotoKeyExists).not.toHaveBeenCalled();
        expect(obstacle.photoUrl).toBeNull();
    });

    it("lets an admin write on a slot of another courier", async () => {
        const { service, slots, repository } = arrange();
        slots.getSlotForObstacle.mockResolvedValue(slot({ courierId: "c-9", status: "Disiapkan" }));

        await service.reportObstacle(admin, "o-1", input);

        expect(repository.createObstacle).toHaveBeenCalledWith(expect.objectContaining({ authorId: "a-1" }));
    });

    it.each([
        ["an unknown slot", null],
        ["another courier's slot", slot({ courierId: "c-2" })],
        ["a pick-up slot", slot({ isDelivery: false, status: "Siap Diambil" })],
        ["a slot of an unpaid order", slot({ subscriptionStatus: "Pending" })],
    ])("answers order not found for %s and saves nothing", async (_name, found) => {
        const { service, slots, repository, photoKeys } = arrange();
        slots.getSlotForObstacle.mockResolvedValue(found);

        await expect(service.reportObstacle(courier, "o-1", input)).rejects.toBeInstanceOf(OrderNotFoundError);
        expect(photoKeys.assertPhotoKeyExists).not.toHaveBeenCalled();
        expect(repository.createObstacle).not.toHaveBeenCalled();
    });

    it("refuses a courier whose slot is not out for delivery", async () => {
        const { service, slots, repository } = arrange();
        slots.getSlotForObstacle.mockResolvedValue(slot({ status: "Disiapkan" }));

        const failure = await service.reportObstacle(courier, "o-1", input).catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(InvalidStateError);
        expect((failure as Error).message).toBe("slot is not out for delivery");
        expect(repository.createObstacle).not.toHaveBeenCalled();
    });

    it("refuses an admin on a finished slot", async () => {
        const { service, slots } = arrange();
        slots.getSlotForObstacle.mockResolvedValue(slot({ status: "Selesai" }));

        await expect(service.reportObstacle(admin, "o-1", input)).rejects.toBeInstanceOf(InvalidStateError);
    });

    it("checks that the photo exists before saving", async () => {
        const { service, photoKeys, repository } = arrange();
        photoKeys.assertPhotoKeyExists.mockRejectedValue(new ValidationError([]));

        await expect(service.reportObstacle(courier, "o-1", input)).rejects.toBeInstanceOf(ValidationError);
        expect(photoKeys.assertPhotoKeyExists).toHaveBeenCalledWith("obstacles/2026/11/a.webp");
        expect(repository.createObstacle).not.toHaveBeenCalled();
    });

    it("lets the repository's order not found through when the slot disappears in between", async () => {
        const { service, repository } = arrange();
        repository.createObstacle.mockRejectedValue(new OrderNotFoundError());

        await expect(service.reportObstacle(courier, "o-1", input)).rejects.toBeInstanceOf(OrderNotFoundError);
    });

    it("notifies the customer with the service day, meal time and note", async () => {
        const { service, notifier, catalog } = arrange();

        await service.reportObstacle(courier, "o-1", input);

        expect(catalog.findSchedules).toHaveBeenCalledWith({ ids: ["s-1"] });
        expect(notifier.notifyUser).toHaveBeenCalledWith({
            userId: "u-1",
            title: "Kendala pengantaran",
            body: "Senin, 9 Nov · 12:00 — Gerbang terkunci",
        });
    });

    it("sends only the note when the schedule cannot be found", async () => {
        const { service, notifier, catalog } = arrange();
        catalog.findSchedules.mockResolvedValue([]);

        await service.reportObstacle(courier, "o-1", input);

        expect(notifier.notifyUser).toHaveBeenCalledWith({
            userId: "u-1",
            title: "Kendala pengantaran",
            body: "Gerbang terkunci",
        });
    });

    it("publishes the obstacle to the customer and the admins", async () => {
        const { service, realtime } = arrange();

        const obstacle = await service.reportObstacle(courier, "o-1", input);

        expect(realtime.publish).toHaveBeenCalledWith(
            { userIds: ["u-1"], roles: ["ADMIN"] },
            { event: "slot.obstacle", data: obstacle },
        );
    });

    it("still answers, logs the failure and carries on when the notification fails", async () => {
        const { service, notifier, realtime, logger } = arrange();
        notifier.notifyUser.mockRejectedValue(new Error("down"));

        const obstacle = await service.reportObstacle(courier, "o-1", input);

        expect(obstacle.id).toBe("ob-1");
        expect(realtime.publish).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ orderId: "o-1" }), expect.any(String));
    });

    it("still answers and logs the failure when the realtime publish fails", async () => {
        const { service, notifier, realtime, logger } = arrange();
        realtime.publish.mockRejectedValue(new Error("redis down"));

        const obstacle = await service.reportObstacle(courier, "o-1", input);

        expect(obstacle.id).toBe("ob-1");
        expect(notifier.notifyUser).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ orderId: "o-1" }), expect.any(String));
    });

    it("still notifies, with only the note, when the schedule lookup fails", async () => {
        const { service, catalog, notifier, logger } = arrange();
        catalog.findSchedules.mockRejectedValue(new Error("db down"));

        await service.reportObstacle(courier, "o-1", input);

        expect(notifier.notifyUser).toHaveBeenCalledWith(expect.objectContaining({ body: "Gerbang terkunci" }));
        expect(logger.warn).toHaveBeenCalled();
    });
});
