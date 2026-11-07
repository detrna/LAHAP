import { describe, expect, it } from "vitest";
import type { UserSummary } from "../../users/domain/user.domain.js";
import type { ObstacleRecord } from "../service/interfaces/delivery.repository.js";
import { presentObstacles } from "./present-obstacles.js";

const record = (overrides: Partial<ObstacleRecord> = {}): ObstacleRecord => ({
    id: "ob-1",
    orderId: "o-1",
    authorId: "c-1",
    note: "Gerbang terkunci",
    photoKey: null,
    createdAt: Temporal.PlainDateTime.from("2026-11-09T05:30:00"),
    ...overrides,
});

const courier: UserSummary = { id: "c-1", name: "Budi", phone: "6281200000001", role: "COURIER" };

describe("presentObstacles (unit)", () => {
    it("renders the time in Asia/Jakarta, adds the author and uses the signed photo urls in order", () => {
        const obstacles = presentObstacles(
            [record(), record({ id: "ob-2", photoKey: "obstacles/2026/11/a.webp", authorId: "unknown" })],
            new Map([[courier.id, courier]]),
            [null, "https://cdn.test/a.webp"],
        );

        expect(obstacles).toEqual([
            {
                id: "ob-1",
                orderId: "o-1",
                authorId: "c-1",
                author: courier,
                note: "Gerbang terkunci",
                photoKey: null,
                photoUrl: null,
                createdAt: "2026-11-09T12:30:00.000+07:00",
            },
            {
                id: "ob-2",
                orderId: "o-1",
                authorId: "unknown",
                note: "Gerbang terkunci",
                photoKey: "obstacles/2026/11/a.webp",
                photoUrl: "https://cdn.test/a.webp",
                createdAt: "2026-11-09T12:30:00.000+07:00",
            },
        ]);
    });
});
