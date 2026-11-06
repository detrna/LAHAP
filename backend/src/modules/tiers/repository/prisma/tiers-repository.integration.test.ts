import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser } from "../../../../../tests/utils/fixtures/users.js";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import { PrismaTiersRepository } from "./tiers-repository.js";

describe("PrismaTiersRepository (integration)", () => {
    let db: Db;
    let repository: PrismaTiersRepository;
    let rows: CreatedRows;

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaTiersRepository(db);
        rows = trackCreated(db);
    });

    afterAll(async () => {
        await rows?.cleanup();
        await db?.close();
    });

    describe("findMembershipByUserId", () => {
        it("reads the membership with its tier, active or expired", async () => {
            const userId = await createTestUser(db, rows);
            const tier = await db.orm.public.Tier.create({
                name: `Zz Tier ${randomUUID().slice(0, 8)}`,
                requiredSubscriptionDays: 100000 + Math.floor(Math.random() * 1e6),
                durationDays: 30,
                discountPercent: "12.50",
            });
            rows.track("Tier", tier.id);
            const membership = await db.orm.public.Membership.create({
                userId,
                tierId: tier.id,
                startedAt: Temporal.PlainDateTime.from("2026-01-01T00:00:00"),
                expiresAt: Temporal.PlainDateTime.from("2026-01-31T00:00:00"),
            });
            rows.track("Membership", membership.id);

            expect(await repository.findMembershipByUserId(userId)).toMatchObject({
                tierId: tier.id,
                tier: { id: tier.id, discountPercent: 12.5, durationDays: 30, photoKey: null },
                expiresAt: Temporal.PlainDateTime.from("2026-01-31T00:00:00"),
            });
            expect(await repository.findMembershipByUserId(randomUUID())).toBeNull();
        });
    });
});
