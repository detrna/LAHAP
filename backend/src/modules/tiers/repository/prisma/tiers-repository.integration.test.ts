import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser } from "../../../../../tests/utils/fixtures/users.js";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { TierAlreadyExistsError, type NewTierRecord } from "../../service/interfaces/tiers.repository.js";
import { PrismaTiersRepository } from "./tiers-repository.js";

const LOW_DAYS = 900001;
const HIGH_DAYS = 900002;

const at = (value: string) => Temporal.PlainDateTime.from(value);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe("PrismaTiersRepository (integration)", () => {
    let db: Db;
    let repository: PrismaTiersRepository;
    let rows: CreatedRows;
    const tag = randomUUID().slice(0, 8);

    const newTier = (overrides: Partial<NewTierRecord> = {}): NewTierRecord => ({
        name: `Zz Tier ${tag} ${randomUUID().slice(0, 8)}`,
        description: null,
        requiredSubscriptionDays: 100000 + Math.floor(Math.random() * 1e6),
        durationDays: 30,
        discountPercent: 12.5,
        photoKey: null,
        ...overrides,
    });

    async function createTier(overrides: Partial<NewTierRecord> = {}) {
        const tier = await repository.createTier(newTier(overrides));
        rows.track("Tier", tier.id);
        return tier;
    }

    async function createMembership(userId: string, tierId: string, startedAt: string, expiresAt: string) {
        const membership = await db.orm.public.Membership.create({
            userId,
            tierId,
            startedAt: at(startedAt),
            expiresAt: at(expiresAt),
        });
        rows.track("Membership", membership.id);
        return membership;
    }

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
            const tier = await createTier();
            await createMembership(userId, tier.id, "2026-01-01T00:00:00", "2026-01-31T00:00:00");

            expect(await repository.findMembershipByUserId(userId)).toMatchObject({
                tierId: tier.id,
                tier: { id: tier.id, discountPercent: 12.5, durationDays: 30, photoKey: null },
                expiresAt: at("2026-01-31T00:00:00"),
            });
            expect(await repository.findMembershipByUserId(randomUUID())).toBeNull();
        });
    });

    describe("tier CRUD", () => {
        it("creates, finds and updates a tier, rounding the discount to 2 decimals", async () => {
            const created = await createTier({
                description: "Top",
                photoKey: "tiers/seed/x.webp",
                discountPercent: 7.255,
            });

            expect(created).toMatchObject({ description: "Top", photoKey: "tiers/seed/x.webp", discountPercent: 7.26 });
            expect(await repository.findTierById(created.id)).toEqual(created);

            const updated = await repository.updateTier(created.id, {
                discountPercent: 9,
                description: null,
                photoKey: null,
            });

            expect(updated).toMatchObject({ id: created.id, discountPercent: 9, description: null, photoKey: null });
            expect(updated?.updatedAt).toBeDefined();
        });

        it("answers null for a missing tier on find and update", async () => {
            expect(await repository.findTierById(randomUUID())).toBeNull();
            expect(await repository.updateTier(randomUUID(), { name: "x" })).toBeNull();
            expect(await repository.updateTier(randomUUID(), {})).toBeNull();
        });

        it("returns the tier unchanged for an update with no columns", async () => {
            const created = await createTier();

            expect(await repository.updateTier(created.id, {})).toEqual(created);
        });

        it("maps each unique column to TierAlreadyExistsError", async () => {
            const first = await createTier();
            const second = await createTier();

            await expect(createTier({ name: first.name })).rejects.toMatchObject({ field: "name" });
            await expect(
                repository.createTier(newTier({ requiredSubscriptionDays: first.requiredSubscriptionDays })),
            ).rejects.toMatchObject({ field: "requiredSubscriptionDays" });
            await expect(repository.updateTier(second.id, { name: first.name })).rejects.toBeInstanceOf(
                TierAlreadyExistsError,
            );
            await expect(
                repository.updateTier(second.id, { requiredSubscriptionDays: first.requiredSubscriptionDays }),
            ).rejects.toMatchObject({ field: "requiredSubscriptionDays" });
        });

        it("lists tiers sorted by threshold, paginated, with the total", async () => {
            const high = await createTier({ requiredSubscriptionDays: 2000000000 });
            const low = await createTier({ requiredSubscriptionDays: 1999999999 });

            const all = await repository.listAllTiers();
            const ids = all.map(tier => tier.id);
            expect(ids.indexOf(low.id)).toBeGreaterThanOrEqual(0);
            expect(ids.indexOf(low.id)).toBeLessThan(ids.indexOf(high.id));
            expect(all.map(tier => tier.requiredSubscriptionDays)).toEqual(
                [...all.map(tier => tier.requiredSubscriptionDays)].sort((a, b) => a - b),
            );

            const page = await repository.listTiers({ skip: all.length - 1, take: 5 });
            expect(page.total).toBe(all.length);
            expect(page.items.map(tier => tier.id)).toEqual([high.id]);
        });
    });

    describe("deleteTier", () => {
        it("answers false for a missing tier", async () => {
            expect(await repository.deleteTier(randomUUID())).toBe(false);
        });

        it("moves its members to the previous tier, keeping their dates, then deletes it", async () => {
            const lower = await createTier({ requiredSubscriptionDays: LOW_DAYS });
            const upper = await createTier({ requiredSubscriptionDays: HIGH_DAYS });
            const userId = await createTestUser(db, rows);
            await createMembership(userId, upper.id, "2026-03-01T00:00:00", "2026-03-31T00:00:00");

            expect(await repository.deleteTier(upper.id)).toBe(true);

            expect(await repository.findTierById(upper.id)).toBeNull();
            expect(await repository.findMembershipByUserId(userId)).toMatchObject({
                tierId: lower.id,
                startedAt: at("2026-03-01T00:00:00"),
                expiresAt: at("2026-03-31T00:00:00"),
            });
        });

        it("removes the memberships when there is no lower tier", async ctx => {
            const baseTier = await db.orm.public.Tier.where({ requiredSubscriptionDays: 0 }).first();
            if (baseTier !== null) ctx.skip();

            const lowest = await createTier({ requiredSubscriptionDays: 0 });
            const userId = await createTestUser(db, rows);
            await createMembership(userId, lowest.id, "2026-03-01T00:00:00", "2026-03-31T00:00:00");

            expect(await repository.deleteTier(lowest.id)).toBe(true);

            expect(await repository.findMembershipByUserId(userId)).toBeNull();
        });

        it("leaves subscriptions' tier alone for other tiers", async () => {
            const keep = await createTier();
            const drop = await createTier();

            await repository.deleteTier(drop.id);

            expect(await repository.findTierById(keep.id)).not.toBeNull();
        });
    });

    describe("memberships", () => {
        it("upserts: inserts, then updates the same row in place", async () => {
            const userId = await createTestUser(db, rows);
            const first = await createTier();
            const second = await createTier();

            await repository.upsertMembership({
                userId,
                tierId: first.id,
                startedAt: at("2026-05-01T00:00:00"),
                expiresAt: at("2026-05-31T00:00:00"),
            });
            const inserted = await db.orm.public.Membership.where({ userId }).first();
            if (inserted !== null) rows.track("Membership", inserted.id);
            await repository.upsertMembership({
                userId,
                tierId: second.id,
                startedAt: at("2026-06-01T00:00:00"),
                expiresAt: at("2026-07-01T00:00:00"),
            });

            const stored = await db.orm.public.Membership.where({ userId }).all();
            expect(stored).toHaveLength(1);
            expect(stored[0]).toMatchObject({
                id: inserted?.id,
                tierId: second.id,
                startedAt: at("2026-06-01T00:00:00"),
                expiresAt: at("2026-07-01T00:00:00"),
            });
        });

        it("changes only the tier, keeping the dates", async () => {
            const userId = await createTestUser(db, rows);
            const from = await createTier();
            const to = await createTier();
            await createMembership(userId, from.id, "2026-05-01T00:00:00", "2026-05-31T00:00:00");

            await repository.changeMembershipTier(userId, to.id);

            expect(await repository.findMembershipByUserId(userId)).toMatchObject({
                tierId: to.id,
                startedAt: at("2026-05-01T00:00:00"),
                expiresAt: at("2026-05-31T00:00:00"),
            });
        });

        it("deletes a membership, and is quiet when there is none", async () => {
            const userId = await createTestUser(db, rows);
            const tier = await createTier();
            await createMembership(userId, tier.id, "2026-05-01T00:00:00", "2026-05-31T00:00:00");

            await repository.deleteMembership(userId);
            await repository.deleteMembership(userId);

            expect(await repository.findMembershipByUserId(userId)).toBeNull();
        });

        it("lists every membership's window", async () => {
            const userId = await createTestUser(db, rows);
            const tier = await createTier();
            await createMembership(userId, tier.id, "2026-05-01T00:00:00", "2026-05-31T00:00:00");

            expect(await repository.listMembershipWindows()).toContainEqual({
                tierId: tier.id,
                startedAt: at("2026-05-01T00:00:00"),
                expiresAt: at("2026-05-31T00:00:00"),
            });
        });
    });

    describe("withUserLock", () => {
        it("runs two calls for one user one after the other", async () => {
            const userId = randomUUID();
            const events: string[] = [];
            const run = (name: string) =>
                repository.withUserLock(userId, async () => {
                    events.push(`${name} start`);
                    await sleep(150);
                    events.push(`${name} end`);
                });

            await Promise.all([run("a"), run("b")]);

            expect(events).toHaveLength(4);
            expect(events[0]?.split(" ")[0]).toBe(events[1]?.split(" ")[0]);
            expect(events[2]?.split(" ")[0]).toBe(events[3]?.split(" ")[0]);
        });

        it("lets different users run at the same time", async () => {
            const events: string[] = [];
            const run = (userId: string, name: string) =>
                repository.withUserLock(userId, async () => {
                    events.push(`${name} start`);
                    await sleep(150);
                    events.push(`${name} end`);
                });

            await Promise.all([run(randomUUID(), "a"), run(randomUUID(), "b")]);

            expect(events.slice(0, 2).sort()).toEqual(["a start", "b start"]);
        });

        it("hands work a store that writes inside the transaction, rolling back on failure", async () => {
            const userId = await createTestUser(db, rows);
            const tier = await createTier();

            await expect(
                repository.withUserLock(userId, async store => {
                    await store.upsertMembership({
                        userId,
                        tierId: tier.id,
                        startedAt: at("2026-05-01T00:00:00"),
                        expiresAt: at("2026-05-31T00:00:00"),
                    });
                    expect(await store.findMembershipByUserId(userId)).not.toBeNull();
                    throw new InvalidStateError("stop");
                }),
            ).rejects.toBeInstanceOf(InvalidStateError);

            expect(await repository.findMembershipByUserId(userId)).toBeNull();
        });

        it("commits the work's writes and returns its result", async () => {
            const userId = await createTestUser(db, rows);
            const tier = await createTier();

            const result = await repository.withUserLock(userId, async store => {
                await store.upsertMembership({
                    userId,
                    tierId: tier.id,
                    startedAt: at("2026-05-01T00:00:00"),
                    expiresAt: at("2026-05-31T00:00:00"),
                });
                return "done";
            });
            const stored = await db.orm.public.Membership.where({ userId }).first();
            if (stored !== null) rows.track("Membership", stored.id);

            expect(result).toBe("done");
            expect(await repository.findMembershipByUserId(userId)).toMatchObject({ tierId: tier.id });
        });
    });
});
