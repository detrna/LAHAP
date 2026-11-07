import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestMenu, createTestSchedule } from "../../../../../../tests/utils/fixtures/schedules.js";
import { createTestSlots } from "../../../../../../tests/utils/fixtures/slots.js";
import { createTestPackage } from "../../../../../../tests/utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../../../../tests/utils/fixtures/users.js";
import { loadConfig } from "../../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../../infrastructure/database/prisma/db.js";
import { PrismaOrdersRepository } from "../orders-repository.js";

describe("PrismaOrdersRepository provided queries (integration)", () => {
    let db: Db;
    let repository: PrismaOrdersRepository;
    let rows: CreatedRows;
    let packageId: string;
    let otherPackageId: string;
    let s1: string;
    let s2: string;
    let s3: string;
    let s4: string;
    let s5: string;
    let u1: string;
    let u2: string;
    let u3: string;
    let slotOfExpired: string;
    let slotOfCancelled: string;
    let slotOfPaid: string;

    const d = (day: number) => Temporal.PlainDate.from(`2996-03-0${day}`);

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaOrdersRepository(db);
        rows = trackCreated(db);
        packageId = await createTestPackage(db, rows, { basePrice: 15000 });
        otherPackageId = await createTestPackage(db, rows, { basePrice: 15000 });
        const menuId = await createTestMenu(db, rows);
        const schedule = (day: number) =>
            createTestSchedule(db, rows, { packageId, date: d(day), isPublished: true, primaryMenuId: menuId });
        s1 = await schedule(3);
        s2 = await schedule(4);
        s3 = await schedule(5);
        s4 = await schedule(6);
        s5 = await schedule(7);
        u1 = await createTestUser(db, rows);
        u2 = await createTestUser(db, rows);
        u3 = await createTestUser(db, rows);

        await createTestSlots(db, rows, {
            userId: u1,
            packageId,
            status: "Success",
            slots: [{ scheduleId: s1 }, { scheduleId: s2, status: "Dilewati", skipReason: "travelling" }],
        });
        const paidWithAlternative = await createTestSlots(db, rows, {
            userId: u2,
            packageId,
            status: "Success",
            slots: [{ scheduleId: s1 }, { scheduleId: s3, usesAlternativeMenu: true }],
        });
        slotOfPaid = paidWithAlternative.slotIds[1]!;
        await createTestSlots(db, rows, {
            userId: u3,
            packageId,
            status: "Pending",
            slots: [{ scheduleId: s1 }, { scheduleId: s4 }],
        });
        const expired = await createTestSlots(db, rows, {
            userId: u3,
            packageId,
            status: "Expire",
            slots: [{ scheduleId: s2 }],
        });
        slotOfExpired = expired.slotIds[0]!;
        const cancelled = await createTestSlots(db, rows, {
            userId: u1,
            packageId,
            status: "Dibatalkan",
            slots: [{ scheduleId: s3 }],
        });
        slotOfCancelled = cancelled.slotIds[0]!;
        await createTestSlots(db, rows, {
            userId: u1,
            packageId,
            status: "Success",
            slots: [{ scheduleId: s4 }],
        });
    });

    afterAll(async () => {
        await rows?.cleanup();
        await db?.close();
    });

    describe("countActiveSubscribers", () => {
        it("counts each customer once per package, for paid subscriptions that have not ended", async () => {
            const counts = await repository.countActiveSubscribers({
                packageIds: [packageId, otherPackageId],
                subscriptionStatuses: ["Success"],
                endDateFrom: d(4),
            });

            expect(counts.get(packageId)).toBe(2);
            expect(counts.has(otherPackageId)).toBe(false);
        });

        it("leaves out subscriptions that ended before the date", async () => {
            const counts = await repository.countActiveSubscribers({
                packageIds: [packageId],
                subscriptionStatuses: ["Success"],
                endDateFrom: d(6),
            });
            const none = await repository.countActiveSubscribers({
                packageIds: [packageId],
                subscriptionStatuses: ["Success"],
                endDateFrom: d(8),
            });

            expect(counts.get(packageId)).toBe(1);
            expect(none.size).toBe(0);
        });

        it("answers an empty map for no packages", async () => {
            expect(
                (
                    await repository.countActiveSubscribers({
                        packageIds: [],
                        subscriptionStatuses: ["Success"],
                        endDateFrom: d(1),
                    })
                ).size,
            ).toBe(0);
        });
    });

    describe("findScheduleIdsWithSlots", () => {
        it("returns the schedules with a slot from a subscription in the given statuses, skipped slots included", async () => {
            const all = [s1, s2, s3, s4, s5];

            expect([...(await repository.findScheduleIdsWithSlots(all, ["Success"]))].sort()).toEqual(
                [s1, s2, s3, s4].sort(),
            );
            expect([...(await repository.findScheduleIdsWithSlots(all, ["Pending"]))].sort()).toEqual([s1, s4].sort());
            expect([...(await repository.findScheduleIdsWithSlots(all, ["Expire", "Dibatalkan"]))].sort()).toEqual(
                [s2, s3].sort(),
            );
        });

        it("answers nothing for no schedules or no statuses", async () => {
            expect(await repository.findScheduleIdsWithSlots([], ["Success"])).toEqual([]);
            expect(await repository.findScheduleIdsWithSlots([s1], [])).toEqual([]);
        });
    });

    describe("findScheduleIdsUsingAlternative", () => {
        it("returns the schedules where a slot of the given subscriptions uses the alternative menu", async () => {
            const all = [s1, s2, s3, s4, s5];

            expect(await repository.findScheduleIdsUsingAlternative(all, ["Success"])).toEqual([s3]);
            expect(await repository.findScheduleIdsUsingAlternative(all, ["Dibatalkan"])).toEqual([]);
            expect(await repository.findScheduleIdsUsingAlternative([], ["Success"])).toEqual([]);
        });
    });

    describe("findSubscriptionPeriods", () => {
        it("returns one period per subscription with a slot on the schedules, from its first to its last slot", async () => {
            const periods = await repository.findSubscriptionPeriods([s1, s2], ["Pending", "Success"]);

            const key = (period: { scheduleId: string; startDate: Temporal.PlainDate; endDate: Temporal.PlainDate }) =>
                `${period.scheduleId}:${period.startDate.toString()}:${period.endDate.toString()}`;
            expect(periods.map(key).sort()).toEqual(
                [
                    `${s1}:${d(3).toString()}:${d(4).toString()}`,
                    `${s1}:${d(3).toString()}:${d(5).toString()}`,
                    `${s1}:${d(3).toString()}:${d(6).toString()}`,
                    `${s2}:${d(3).toString()}:${d(4).toString()}`,
                ].sort(),
            );
        });

        it("answers nothing for no schedules or no statuses", async () => {
            expect(await repository.findSubscriptionPeriods([], ["Success"])).toEqual([]);
            expect(await repository.findSubscriptionPeriods([s1], [])).toEqual([]);
        });
    });

    describe("findCustomerIdsByPackage", () => {
        it("returns each customer with a paid subscription on the package that has not ended once", async () => {
            const ids = await repository.findCustomerIdsByPackage({
                packageId,
                subscriptionStatuses: ["Success"],
                endDateFrom: d(4),
            });
            const later = await repository.findCustomerIdsByPackage({
                packageId,
                subscriptionStatuses: ["Success"],
                endDateFrom: d(6),
            });
            const none = await repository.findCustomerIdsByPackage({
                packageId: otherPackageId,
                subscriptionStatuses: ["Success"],
                endDateFrom: d(1),
            });

            expect([...ids].sort()).toEqual([u1, u2].sort());
            expect(later).toEqual([u1]);
            expect(none).toEqual([]);
        });
    });

    describe("findCustomerIdsBySchedule", () => {
        it("returns customers with a paid subscription and a slot that is not excluded", async () => {
            const query = (scheduleId: string) =>
                repository.findCustomerIdsBySchedule({
                    scheduleId,
                    subscriptionStatuses: ["Success"],
                    excludedSlotStatuses: ["Dilewati"],
                });

            expect([...(await query(s1))].sort()).toEqual([u1, u2].sort());
            expect(await query(s2)).toEqual([]);
            expect(await query(s3)).toEqual([u2]);
            expect(await query(s5)).toEqual([]);
        });
    });

    describe("findAnnouncementTargets", () => {
        it("returns the packages and schedules a customer currently qualifies for", async () => {
            const targets = await repository.findAnnouncementTargets({
                userId: u1,
                subscriptionStatuses: ["Success"],
                packageEndDateFrom: d(4),
                excludedSlotStatuses: ["Dilewati"],
            });

            expect(targets.packageIds).toEqual([packageId]);
            expect([...targets.scheduleIds].sort()).toEqual([s1, s4].sort());
        });

        it("drops the package once every subscription has ended, but keeps the schedules", async () => {
            const targets = await repository.findAnnouncementTargets({
                userId: u1,
                subscriptionStatuses: ["Success"],
                packageEndDateFrom: d(8),
                excludedSlotStatuses: ["Dilewati"],
            });

            expect(targets.packageIds).toEqual([]);
            expect([...targets.scheduleIds].sort()).toEqual([s1, s4].sort());
        });

        it("returns nothing for a customer without a paid subscription", async () => {
            expect(
                await repository.findAnnouncementTargets({
                    userId: u3,
                    subscriptionStatuses: ["Success"],
                    packageEndDateFrom: d(1),
                    excludedSlotStatuses: ["Dilewati"],
                }),
            ).toEqual({ packageIds: [], scheduleIds: [] });
        });
    });

    describe("deleteSlotsOfSubscriptions", () => {
        it("deletes only the slots of subscriptions in the given statuses, on the given schedules", async () => {
            await repository.deleteSlotsOfSubscriptions([s1, s2, s3, s4], ["Expire", "Dibatalkan"]);

            const remaining = await db.orm.public.Order.where(order =>
                order.id.in([slotOfExpired, slotOfCancelled, slotOfPaid] as Varchar<36>[]),
            )
                .select("id")
                .all();
            expect(remaining.map(order => order.id)).toEqual([slotOfPaid]);
        });

        it("does nothing for no schedules or no statuses", async () => {
            await repository.deleteSlotsOfSubscriptions([], ["Expire"]);
            await repository.deleteSlotsOfSubscriptions([s3], []);

            const paid = await db.orm.public.Order.where({ id: slotOfPaid }).select("id").first();
            expect(paid).not.toBeNull();
        });
    });
});
