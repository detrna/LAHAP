import { describe, expect, it } from "vitest";
import { buildUserSummary } from "../../users/test-utils/factory/users.factory.js";
import { setupDeliveryService } from "../test-utils/setup/delivery.setup.js";

describe("DeliveryService.findObstaclesByOrderIds (unit)", () => {
    it("answers the obstacles of the slots, oldest first, with authors and signed photos", async () => {
        const { service, repository, users } = setupDeliveryService();
        repository.listObstacles.mockResolvedValue([
            {
                id: "ob-1",
                orderId: "o-1",
                authorId: "c-1",
                note: "Gerbang terkunci",
                photoKey: "obstacles/2026/11/a.webp",
                createdAt: Temporal.PlainDateTime.from("2026-11-03T05:00:00"),
            },
            {
                id: "ob-2",
                orderId: "o-2",
                authorId: "a-1",
                note: "Alamat salah",
                photoKey: null,
                createdAt: Temporal.PlainDateTime.from("2026-11-03T06:00:00"),
            },
        ]);
        users.getSummaries.mockResolvedValue([
            buildUserSummary({ id: "c-1", name: "Budi", role: "COURIER" }),
            buildUserSummary({ id: "a-1", name: "Owner", role: "ADMIN" }),
        ]);

        const obstacles = await service.findObstaclesByOrderIds(["o-1", "o-2"]);

        expect(repository.listObstacles).toHaveBeenCalledWith(["o-1", "o-2"]);
        expect(obstacles.map(item => [item.id, item.author?.name, item.photoUrl])).toEqual([
            ["ob-1", "Budi", "https://storage.test/obstacles/2026/11/a.webp?signed"],
            ["ob-2", "Owner", null],
        ]);
    });

    it("answers nothing without looking up any user when there are no obstacles", async () => {
        const { service, users } = setupDeliveryService();

        expect(await service.findObstaclesByOrderIds(["o-1"])).toEqual([]);
        expect(users.getSummaries).not.toHaveBeenCalled();
    });
});
