import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPackage } from "../../../../../tests/utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../../../tests/utils/fixtures/users.js";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import {
    AnnouncementTargetNotFoundError,
    type AnnouncementRecord,
    type NewAnnouncementRecord,
    type NotificationRecord,
} from "../../service/interfaces/notifications.repository.js";
import { PrismaNotificationsRepository } from "./notifications-repository.js";

describe("PrismaNotificationsRepository (integration)", () => {
    let db: Db;
    let repository: PrismaNotificationsRepository;
    let rows: CreatedRows;
    let userId: string;
    let otherUserId: string;
    const tag = randomUUID().slice(0, 8);

    const notify = async (target: string, title = `Zz ${tag} notification`): Promise<NotificationRecord> => {
        const record = await repository.createNotification({ userId: target, title, body: "body" });
        rows.track("Notification", record.id);
        return record;
    };

    const announce = async (overrides: Partial<NewAnnouncementRecord> = {}): Promise<AnnouncementRecord> => {
        const record = await repository.createAnnouncement({
            title: `Zz ${tag} announcement`,
            body: "body",
            scope: "GLOBAL",
            packageId: null,
            menuScheduleId: null,
            ...overrides,
        });
        rows.track("Announcement", record.id);
        return record;
    };

    const createSchedule = async (packageId: string, day: string): Promise<string> => {
        const schedule = await db.orm.public.Schedule.create({
            packageId,
            date: Temporal.PlainDate.from(day),
            deliveryTime: Temporal.PlainTime.from("07:00"),
        });
        return rows.track("Schedule", schedule.id);
    };

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaNotificationsRepository(db);
        rows = trackCreated(db);
        userId = await createTestUser(db, rows, { name: `Zz ${tag} Owner` });
        otherUserId = await createTestUser(db, rows, { name: `Zz ${tag} Other` });
    });

    afterEach(async () => {
        await db.orm.public.Notification.where({ userId }).deleteAll();
        await db.orm.public.Notification.where({ userId: otherUserId }).deleteAll();
    });

    afterAll(async () => {
        await rows.cleanup();
        await db.close();
    });

    describe("notifications", () => {
        it("creates one notification and many in one call, unread", async () => {
            const single = await notify(userId);
            const many = await repository.createNotifications([
                { userId, title: "a", body: "x" },
                { userId: otherUserId, title: "b", body: "y" },
            ]);

            expect(single).toMatchObject({ userId, isRead: false });
            expect(many.map(item => item.userId).sort()).toEqual([userId, otherUserId].sort());
            expect(await repository.createNotifications([])).toEqual([]);
        });

        it("maps a missing user to a target not found error", async () => {
            await expect(
                repository.createNotification({ userId: randomUUID(), title: "a", body: "x" }),
            ).rejects.toBeInstanceOf(AnnouncementTargetNotFoundError);
        });

        it("lists only the user's notifications, newest first, with the read filter and total", async () => {
            const first = await notify(userId, "first");
            const second = await notify(userId, "second");
            await notify(otherUserId, "someone else's");
            await repository.markNotificationRead({ id: first.id, userId });

            const all = await repository.listNotificationsForUser({ userId, skip: 0, take: 10 });
            expect(all.total).toBe(2);
            expect(all.items.map(item => item.title)).toEqual(["second", "first"]);

            const unread = await repository.listNotificationsForUser({ userId, isRead: false, skip: 0, take: 10 });
            expect(unread.items.map(item => item.id)).toEqual([second.id]);
            expect(unread.total).toBe(1);

            const page = await repository.listNotificationsForUser({ userId, skip: 1, take: 1 });
            expect(page.items.map(item => item.title)).toEqual(["first"]);
            expect(page.total).toBe(2);
        });

        it("counts unread notifications per user", async () => {
            const read = await notify(userId);
            await notify(userId);
            await notify(otherUserId);
            await repository.markNotificationRead({ id: read.id, userId });

            expect(await repository.countUnreadNotifications(userId)).toBe(1);
            expect(await repository.countUnreadNotifications(otherUserId)).toBe(1);
        });

        it("marks only the owner's notification as read", async () => {
            const mine = await notify(userId);
            const theirs = await notify(otherUserId);

            expect(await repository.markNotificationRead({ id: theirs.id, userId })).toBeNull();
            expect(await repository.markNotificationRead({ id: randomUUID(), userId })).toBeNull();
            expect(await repository.markNotificationRead({ id: mine.id, userId })).toMatchObject({
                id: mine.id,
                isRead: true,
            });
            expect(await repository.countUnreadNotifications(otherUserId)).toBe(1);
        });

        it("marks all of a user's unread notifications and counts them", async () => {
            await notify(userId);
            await notify(userId);
            await notify(otherUserId);

            expect(await repository.markAllNotificationsRead(userId)).toBe(2);
            expect(await repository.markAllNotificationsRead(userId)).toBe(0);
            expect(await repository.countUnreadNotifications(userId)).toBe(0);
            expect(await repository.countUnreadNotifications(otherUserId)).toBe(1);
        });
    });

    describe("announcements", () => {
        it("creates, finds, updates and deletes an announcement", async () => {
            const packageId = await createTestPackage(db, rows);
            const created = await announce({ scope: "PACKAGE", packageId });

            expect(await repository.findAnnouncementById(created.id)).toMatchObject({ scope: "PACKAGE", packageId });
            expect(await repository.findAnnouncementById(randomUUID())).toBeNull();

            const updated = await repository.updateAnnouncement(created.id, {
                title: "Baru",
                scope: "GLOBAL",
                packageId: null,
            });
            expect(updated).toMatchObject({ title: "Baru", scope: "GLOBAL", packageId: null });
            expect(await repository.updateAnnouncement(created.id, {})).toMatchObject({ title: "Baru" });
            expect(await repository.updateAnnouncement(randomUUID(), { title: "x" })).toBeNull();

            expect(await repository.deleteAnnouncement(created.id)).toBe(true);
            expect(await repository.deleteAnnouncement(created.id)).toBe(false);
        });

        it("maps a missing package or schedule to a target not found error", async () => {
            const missing = randomUUID();
            const existing = await announce();

            await expect(
                repository.createAnnouncement({
                    title: "x",
                    body: "y",
                    scope: "PACKAGE",
                    packageId: missing,
                    menuScheduleId: null,
                }),
            ).rejects.toMatchObject({ code: "TARGET_NOT_FOUND", message: `package not found: "${missing}"` });
            await expect(
                repository.updateAnnouncement(existing.id, { scope: "SCHEDULE", menuScheduleId: missing }),
            ).rejects.toMatchObject({ code: "TARGET_NOT_FOUND", message: `schedule not found: "${missing}"` });
        });

        it("lists announcements with the scope and package filters", async () => {
            const packageId = await createTestPackage(db, rows);
            const otherPackageId = await createTestPackage(db, rows);
            const global = await announce();
            const forPackage = await announce({ scope: "PACKAGE", packageId });
            await announce({ scope: "PACKAGE", packageId: otherPackageId });

            const byPackage = await repository.listAnnouncements({ packageId, skip: 0, take: 10 });
            expect(byPackage.items.map(item => item.id)).toEqual([forPackage.id]);
            expect(byPackage.total).toBe(1);

            const byScope = await repository.listAnnouncements({ scope: "GLOBAL", skip: 0, take: 100 });
            expect(byScope.items.map(item => item.id)).toContain(global.id);
            expect(byScope.items.every(item => item.scope === "GLOBAL")).toBe(true);
            expect(byScope.total).toBeGreaterThanOrEqual(1);
        });

        it("lists the announcements for an audience: global plus its packages and schedules", async () => {
            const packageId = await createTestPackage(db, rows);
            const otherPackageId = await createTestPackage(db, rows);
            const scheduleId = await createSchedule(packageId, "2099-05-01");
            const otherScheduleId = await createSchedule(packageId, "2099-05-02");
            const global = await announce({ title: `Zz ${tag} global` });
            const forPackage = await announce({ scope: "PACKAGE", packageId });
            const forSchedule = await announce({ scope: "SCHEDULE", menuScheduleId: scheduleId });
            await announce({ scope: "PACKAGE", packageId: otherPackageId });
            await announce({ scope: "SCHEDULE", menuScheduleId: otherScheduleId });

            const found = await repository.listAnnouncementsForAudience({
                packageIds: [packageId],
                scheduleIds: [scheduleId],
                skip: 0,
                take: 1000,
            });
            const ids = found.items.map(item => item.id);

            expect(ids).toEqual(expect.arrayContaining([global.id, forPackage.id, forSchedule.id]));
            expect(
                found.items
                    .filter(item => item.scope !== "GLOBAL")
                    .map(item => item.id)
                    .sort(),
            ).toEqual([forPackage.id, forSchedule.id].sort());
            expect(found.total).toBe(found.items.length);

            const globalOnly = await repository.listAnnouncementsForAudience({
                packageIds: [],
                scheduleIds: [],
                skip: 0,
                take: 1000,
            });
            expect(globalOnly.items.every(item => item.scope === "GLOBAL")).toBe(true);
            expect(globalOnly.items.map(item => item.id)).toContain(global.id);
        });

        it("orders the audience list newest first and pages it", async () => {
            const first = await announce({ title: `Zz ${tag} older` });
            const second = await announce({ title: `Zz ${tag} newer` });

            const page = await repository.listAnnouncementsForAudience({
                packageIds: [],
                scheduleIds: [],
                skip: 0,
                take: 2,
            });

            expect(page.items.map(item => item.id)).toEqual([second.id, first.id]);
            expect(page.total).toBeGreaterThanOrEqual(2);
        });

        it("keeps an announcement without a target when its package is deleted", async () => {
            const packageId = await createTestPackage(db, rows);
            const created = await announce({ scope: "PACKAGE", packageId });

            await db.orm.public.Package.where({ id: packageId }).deleteAndCount();

            expect(await repository.findAnnouncementById(created.id)).toMatchObject({
                scope: "PACKAGE",
                packageId: null,
            });
            const audience = await repository.listAnnouncementsForAudience({
                packageIds: [packageId],
                scheduleIds: [],
                skip: 0,
                take: 1000,
            });
            expect(audience.items.map(item => item.id)).not.toContain(created.id);
        });
    });
});
