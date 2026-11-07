import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestMenu, createTestSchedule } from "../../../../../tests/utils/fixtures/schedules.js";
import { createTestSlots } from "../../../../../tests/utils/fixtures/slots.js";
import { createTestPackage } from "../../../../../tests/utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../../../tests/utils/fixtures/users.js";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import { OrderNotFoundError } from "../../../../shared/errors/order-not-found-error.js";
import { PrismaDeliveryRepository } from "./delivery-repository.js";

describe("PrismaDeliveryRepository (integration)", () => {
    let db: Db;
    let repository: PrismaDeliveryRepository;
    let rows: CreatedRows;
    let packageId: string;
    let menuId: string;
    let day = 0;
    const base = Temporal.PlainDate.from("2996-07-01");

    const slot = async (userId: string) => {
        const scheduleId = await createTestSchedule(db, rows, {
            packageId,
            date: base.add({ days: day++ }),
            deliveryTime: "07:00",
            isPublished: true,
            primaryMenuId: menuId,
        });
        const created = await createTestSlots(db, rows, {
            userId,
            packageId,
            status: "Success",
            isDelivery: true,
            slots: [{ scheduleId, status: "Diantar" }],
        });
        return created.slotIds[0]!;
    };

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaDeliveryRepository(db);
        rows = trackCreated(db);
        packageId = await createTestPackage(db, rows);
        menuId = await createTestMenu(db, rows);
    });

    afterAll(async () => {
        await rows?.cleanup();
        await db?.close();
    });

    it("saves an obstacle and lists the obstacles of several slots, oldest first", async () => {
        const customerId = await createTestUser(db, rows);
        const courierId = await createTestUser(db, rows, { role: "COURIER" });
        const [first, second, untouched] = [await slot(customerId), await slot(customerId), await slot(customerId)];

        const early = await repository.createObstacle({
            orderId: first,
            authorId: courierId,
            note: "Gerbang terkunci",
            photoKey: null,
        });
        const other = await repository.createObstacle({
            orderId: second,
            authorId: courierId,
            note: "Alamat tidak ditemukan",
            photoKey: "obstacles/seed/a.webp",
        });
        const late = await repository.createObstacle({
            orderId: first,
            authorId: courierId,
            note: "Hujan deras",
            photoKey: null,
        });

        expect(early).toEqual({
            id: expect.any(String),
            orderId: first,
            authorId: courierId,
            note: "Gerbang terkunci",
            photoKey: null,
            createdAt: expect.any(Temporal.PlainDateTime),
        });
        expect(other.photoKey).toBe("obstacles/seed/a.webp");

        const listed = await repository.listObstacles([first, second, untouched]);
        expect(listed.map(item => item.id).sort()).toEqual([early.id, other.id, late.id].sort());
        expect(listed.filter(item => item.orderId === first).map(item => item.id)).toEqual([early.id, late.id]);
        expect(await repository.listObstacles([untouched])).toEqual([]);
        expect(await repository.listObstacles([])).toEqual([]);
    });

    it("refuses an obstacle for a slot that does not exist", async () => {
        const courierId = await createTestUser(db, rows, { role: "COURIER" });

        await expect(
            repository.createObstacle({ orderId: randomUUID(), authorId: courierId, note: "x", photoKey: null }),
        ).rejects.toBeInstanceOf(OrderNotFoundError);
    });
});
