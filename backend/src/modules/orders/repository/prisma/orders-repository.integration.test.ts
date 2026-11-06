import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestPackage, createTestSubscription } from "../../../../../tests/utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../../../tests/utils/fixtures/users.js";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import { PrismaOrdersRepository } from "./orders-repository.js";

describe("PrismaOrdersRepository (integration)", () => {
    let db: Db;
    let repository: PrismaOrdersRepository;
    let rows: CreatedRows;
    let churned: string;
    let recent: string;
    let pendingOnly: string;

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaOrdersRepository(db);
        rows = trackCreated(db);
        const packageId = await createTestPackage(db, rows);
        churned = await createTestUser(db, rows);
        recent = await createTestUser(db, rows);
        pendingOnly = await createTestUser(db, rows);
        const subscription = (userId: string, endDate: string, status: "Success" | "Pending" = "Success") =>
            createTestSubscription(db, rows, {
                userId,
                packageId,
                status,
                startDate: Temporal.PlainDate.from(endDate).subtract({ days: 5 }),
                endDate: Temporal.PlainDate.from(endDate),
            });
        await subscription(churned, "2026-10-01");
        await subscription(churned, "1990-11-05");
        await subscription(churned, "1990-12-01", "Pending");
        await subscription(recent, "2999-11-06");
        await subscription(pendingOnly, "1990-10-01", "Pending");
    });

    afterAll(async () => {
        await rows?.cleanup();
        await db?.close();
    });

    it("finds each user's last successful end date, ignoring other statuses", async () => {
        const dates = await repository.findLastSuccessEndDates([churned, recent, pendingOnly, randomUUID()]);

        expect(dates.get(churned)?.toString()).toBe("2026-10-01");
        expect(dates.get(recent)?.toString()).toBe("2999-11-06");
        expect(dates.has(pendingOnly)).toBe(false);
        expect((await repository.findLastSuccessEndDates([])).size).toBe(0);
    });

    it("finds the users whose last successful end date is before a date", async () => {
        const ids = await repository.findUserIdsWithLastSuccessEndBefore(Temporal.PlainDate.from("2026-10-02"));

        expect(ids).toContain(churned);
        expect(ids).not.toContain(recent);
        expect(ids).not.toContain(pendingOnly);
        expect(
            await repository.findUserIdsWithLastSuccessEndBefore(Temporal.PlainDate.from("2026-10-01")),
        ).not.toContain(churned);
    });
});
