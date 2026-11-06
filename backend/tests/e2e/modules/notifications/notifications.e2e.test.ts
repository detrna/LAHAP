import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import type { AnnouncementAudience } from "../../../../src/modules/notifications/service/interfaces/announcement-audience.js";
import type { RealtimePublisher } from "../../../../src/modules/notifications/service/interfaces/realtime-publisher.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import { createNotificationsContainer } from "../../../utils/app/notifications-container.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createAuthHeaders } from "../../../utils/factory/jwt/jwt.js";
import { createTestPackage } from "../../../utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../utils/fixtures/users.js";

const asUser = (role: Role, userId: string = randomUUID()) =>
    createAuthHeaders({ role, sub: { userId, name: `E2E ${role}` } });

interface NotificationBody {
    readonly id: string;
    readonly userId: string;
    readonly title: string;
    readonly isRead: boolean;
}

interface AnnouncementBody {
    readonly id: string;
    readonly title: string;
    readonly scope: string;
    readonly packageId: string | null;
    readonly menuScheduleId: string | null;
}

describe("notifications routes (e2e)", () => {
    let db: Db;
    let rows: CreatedRows;
    let testApp: TestApp;
    let app: Express;
    let customerId: string;
    let otherCustomerId: string;
    let inactiveCustomerId: string;
    let staffId: string;
    let packageId: string;
    let scheduleId: string;
    let concernedPackageIds: string[] = [];
    let concernedScheduleIds: string[] = [];
    let packageCustomerIds: string[] = [];
    let scheduleCustomerIds: string[] = [];
    const tag = randomUUID().slice(0, 8);
    const realtime = { publish: vi.fn(async () => undefined) } satisfies RealtimePublisher;

    const audience: AnnouncementAudience = {
        findCustomerIdsForPackage: async () => packageCustomerIds,
        findCustomerIdsForSchedule: async () => scheduleCustomerIds,
        findAnnouncementTargetsOf: async () => ({ packageIds: concernedPackageIds, scheduleIds: concernedScheduleIds }),
    };

    const admin = () => asUser("ADMIN");
    const customer = () => asUser("CUSTOMER", customerId);

    async function addNotification(userId: string, title: string): Promise<NotificationBody> {
        const created = await db.orm.public.Notification.create({ userId, title, body: "isi" });
        rows.track("Notification", created.id);
        return created;
    }

    async function broadcast(body: Record<string, unknown>) {
        const response = await request(app)
            .post("/api/admin/notifications/broadcast")
            .set(admin())
            .send({ title: `Zz ${tag}`, body: "isi pesan", ...body });
        const announcement = response.body.data?.announcement as AnnouncementBody | null | undefined;
        if (announcement) rows.track("Announcement", announcement.id);
        const notification = response.body.data?.notification as NotificationBody | null | undefined;
        if (notification) rows.track("Notification", notification.id);
        return response;
    }

    async function countActiveCustomers(): Promise<number> {
        const totals = await db.orm.public.User.where({ role: "CUSTOMER", isActive: true }).aggregate(aggregate => ({
            total: aggregate.count(),
        }));
        return totals.total;
    }

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        customerId = await createTestUser(db, rows, { name: `Zz ${tag} Customer` });
        otherCustomerId = await createTestUser(db, rows, { name: `Zz ${tag} Other` });
        inactiveCustomerId = await createTestUser(db, rows, { name: `Zz ${tag} Inactive` });
        await db.orm.public.User.where({ id: inactiveCustomerId }).update({ isActive: false });
        staffId = await createTestUser(db, rows, { name: `Zz ${tag} Staff`, role: "KITCHEN" });
        packageId = await createTestPackage(db, rows);
        const schedule = await db.orm.public.Schedule.create({
            packageId,
            date: Temporal.PlainDate.from("2099-06-01"),
            deliveryTime: Temporal.PlainTime.from("07:00"),
        });
        scheduleId = rows.track("Schedule", schedule.id);
        testApp = await createTestApp({
            db,
            mount: deps => [createNotificationsContainer(deps, { realtime, audience }).router],
        });
        app = testApp.app;
    });

    beforeEach(() => {
        realtime.publish.mockClear();
        realtime.publish.mockResolvedValue(undefined);
        concernedPackageIds = [];
        concernedScheduleIds = [];
        packageCustomerIds = [];
        scheduleCustomerIds = [];
    });

    afterAll(async () => {
        await rows?.cleanup();
        await testApp?.close();
        await db?.close();
    });

    describe("access", () => {
        const id = randomUUID();
        const routes = [
            ["get", "/api/me/notifications"],
            ["post", `/api/me/notifications/${id}/read`],
            ["post", "/api/me/notifications/read-all"],
            ["get", "/api/me/announcements"],
            ["post", "/api/admin/notifications/broadcast"],
            ["get", "/api/admin/announcements"],
            ["get", `/api/admin/announcements/${id}`],
            ["patch", `/api/admin/announcements/${id}`],
            ["delete", `/api/admin/announcements/${id}`],
        ] as const;

        it.each(routes)("answers 401 to %s %s without a token", async (method, path) => {
            expect((await request(app)[method](path)).status).toBe(401);
        });

        it.each(["CUSTOMER", "KITCHEN", "COURIER"] as const)("answers 403 to a %s on the admin routes", async role => {
            for (const [method, path] of routes.slice(4)) {
                expect((await request(app)[method](path).set(asUser(role)).send({})).status).toBe(403);
            }
        });

        it.each(["ADMIN", "KITCHEN", "COURIER"] as const)("answers 403 to a %s on /me/announcements", async role => {
            expect((await request(app).get("/api/me/announcements").set(asUser(role))).status).toBe(403);
        });
    });

    describe("my notifications", () => {
        it("lists a user's notifications newest first with the unread count, and filters by read state", async () => {
            const user = await createTestUser(db, rows, { name: `Zz ${tag} Reader` });
            const first = await addNotification(user, "pertama");
            const second = await addNotification(user, "kedua");
            await addNotification(otherCustomerId, "milik orang lain");
            await request(app).post(`/api/me/notifications/${first.id}/read`).set(asUser("CUSTOMER", user));

            const all = await request(app).get("/api/me/notifications").set(asUser("CUSTOMER", user));
            expect(all.status).toBe(200);
            expect((all.body.data as NotificationBody[]).map(item => item.title)).toEqual(["kedua", "pertama"]);
            expect(all.body.meta).toMatchObject({ page: 1, total: 2, unreadCount: 1 });

            const unread = await request(app).get("/api/me/notifications?isRead=false").set(asUser("CUSTOMER", user));
            expect((unread.body.data as NotificationBody[]).map(item => item.id)).toEqual([second.id]);

            const read = await request(app).get("/api/me/notifications?isRead=true").set(asUser("CUSTOMER", user));
            expect((read.body.data as NotificationBody[]).map(item => item.id)).toEqual([first.id]);
        });

        it("lets every role read its own notifications", async () => {
            await addNotification(staffId, "untuk dapur");

            const response = await request(app).get("/api/me/notifications").set(asUser("KITCHEN", staffId));

            expect(response.status).toBe(200);
            expect((response.body.data as NotificationBody[]).map(item => item.title)).toEqual(["untuk dapur"]);
        });

        it("rejects a bad isRead value and bad paging with 400", async () => {
            expect((await request(app).get("/api/me/notifications?isRead=yes").set(customer())).status).toBe(400);
            expect((await request(app).get("/api/me/notifications?limit=1000").set(customer())).status).toBe(400);
        });

        it("marks one notification as read", async () => {
            const user = await createTestUser(db, rows, { name: `Zz ${tag} Marker` });
            const notification = await addNotification(user, "tandai");

            const response = await request(app)
                .post(`/api/me/notifications/${notification.id}/read`)
                .set(asUser("CUSTOMER", user));

            expect(response.status).toBe(200);
            expect(response.body.data).toMatchObject({ id: notification.id, isRead: true });
        });

        it("answers 404 for another user's notification and for an unknown one", async () => {
            const theirs = await addNotification(otherCustomerId, "rahasia");

            expect((await request(app).post(`/api/me/notifications/${theirs.id}/read`).set(customer())).status).toBe(
                404,
            );
            const unknown = await request(app).post(`/api/me/notifications/${randomUUID()}/read`).set(customer());
            expect(unknown.status).toBe(404);
            expect(unknown.body.error.code).toBe("NOTIFICATION_NOT_FOUND");
            expect((await request(app).post("/api/me/notifications/nope/read").set(customer())).status).toBe(400);
        });

        it("marks only the caller's unread notifications with read-all", async () => {
            const user = await createTestUser(db, rows, { name: `Zz ${tag} All` });
            await addNotification(user, "a");
            await addNotification(user, "b");
            const untouched = await addNotification(otherCustomerId, "c");

            const response = await request(app).post("/api/me/notifications/read-all").set(asUser("CUSTOMER", user));
            expect(response.status).toBe(200);
            expect(response.body.data).toEqual({ updatedCount: 2 });

            const again = await request(app).post("/api/me/notifications/read-all").set(asUser("CUSTOMER", user));
            expect(again.body.data).toEqual({ updatedCount: 0 });

            const row = await db.orm.public.Notification.where({ id: untouched.id }).first();
            expect(row?.isRead).toBe(false);
        });
    });

    describe("broadcast", () => {
        it("announces GLOBAL to every active customer without loading ids", async () => {
            const expected = await countActiveCustomers();

            const response = await broadcast({ target: "GLOBAL" });

            expect(response.status).toBe(201);
            expect(response.body.data).toMatchObject({
                announcement: { scope: "GLOBAL", packageId: null, menuScheduleId: null },
                notification: null,
                recipientCount: expected,
            });
            expect(realtime.publish).toHaveBeenCalledWith(
                { roles: ["CUSTOMER"] },
                expect.objectContaining({ event: "announcement" }),
            );
        });

        it("announces to the active customers of a package, leaving out inactive and staff accounts", async () => {
            packageCustomerIds = [customerId, otherCustomerId, inactiveCustomerId, staffId];

            const response = await broadcast({ target: "PACKAGE", packageId });

            expect(response.status).toBe(201);
            expect(response.body.data).toMatchObject({
                announcement: { scope: "PACKAGE", packageId },
                recipientCount: 2,
            });
            const [audienceArg] = realtime.publish.mock.calls[0] as unknown as [{ userIds: string[] }];
            expect([...audienceArg.userIds].sort()).toEqual([customerId, otherCustomerId].sort());
        });

        it("announces to the customers with a slot on a schedule", async () => {
            scheduleCustomerIds = [customerId];

            const response = await broadcast({ target: "SCHEDULE", menuScheduleId: scheduleId });

            expect(response.status).toBe(201);
            expect(response.body.data).toMatchObject({
                announcement: { scope: "SCHEDULE", menuScheduleId: scheduleId },
                recipientCount: 1,
            });
        });

        it("notifies one customer and publishes to them", async () => {
            const response = await broadcast({ target: "CUSTOMER", userId: customerId, title: `Zz ${tag} pribadi` });

            expect(response.status).toBe(201);
            expect(response.body.data).toMatchObject({
                announcement: null,
                notification: { userId: customerId, title: `Zz ${tag} pribadi`, isRead: false },
                recipientCount: 1,
            });
            expect(realtime.publish).toHaveBeenCalledWith(
                { userIds: [customerId] },
                expect.objectContaining({ event: "notification" }),
            );

            const mine = await request(app).get("/api/me/notifications").set(customer());
            expect((mine.body.data as NotificationBody[]).map(item => item.title)).toContain(`Zz ${tag} pribadi`);
        });

        it("answers 404 for a staff, inactive or unknown customer, without revealing which", async () => {
            for (const userId of [staffId, inactiveCustomerId, randomUUID()]) {
                const response = await broadcast({ target: "CUSTOMER", userId });
                expect(response.status).toBe(404);
                expect(response.body.error.code).toBe("TARGET_NOT_FOUND");
            }
        });

        it("answers 404 for an unknown package or schedule", async () => {
            const missingPackage = await broadcast({ target: "PACKAGE", packageId: randomUUID() });
            expect(missingPackage.status).toBe(404);
            expect(missingPackage.body.error.code).toBe("TARGET_NOT_FOUND");

            expect((await broadcast({ target: "SCHEDULE", menuScheduleId: randomUUID() })).status).toBe(404);
        });

        it("answers 400 for a missing target id, a foreign id, a long body and an unknown target", async () => {
            expect((await broadcast({ target: "PACKAGE" })).status).toBe(400);
            expect((await broadcast({ target: "CUSTOMER" })).status).toBe(400);
            expect((await broadcast({ target: "GLOBAL", packageId })).status).toBe(400);
            expect((await broadcast({ target: "PACKAGE", packageId, userId: customerId })).status).toBe(400);
            expect((await broadcast({ target: "GLOBAL", body: "x".repeat(2001) })).status).toBe(400);
            expect((await broadcast({ target: "GLOBAL", title: "   " })).status).toBe(400);
            expect((await broadcast({ target: "COURIER" })).status).toBe(400);
            expect(realtime.publish).not.toHaveBeenCalled();
        });

        it("still saves the announcement when the live delivery fails", async () => {
            realtime.publish.mockRejectedValue(new Error("redis down"));

            const response = await broadcast({ target: "GLOBAL", title: `Zz ${tag} offline` });

            expect(response.status).toBe(201);
            const saved = await request(app)
                .get(`/api/admin/announcements/${response.body.data.announcement.id}`)
                .set(admin());
            expect(saved.status).toBe(200);
        });
    });

    describe("announcements", () => {
        it("lists announcements with the scope and package filters", async () => {
            const ownPackageId = await createTestPackage(db, rows);
            const forPackage = (await broadcast({ target: "PACKAGE", packageId: ownPackageId })).body.data
                .announcement as AnnouncementBody;

            const byPackage = await request(app).get(`/api/admin/announcements?packageId=${ownPackageId}`).set(admin());
            expect(byPackage.status).toBe(200);
            expect((byPackage.body.data as AnnouncementBody[]).map(item => item.id)).toEqual([forPackage.id]);
            expect(byPackage.body.meta).toMatchObject({ total: 1 });

            const byScope = await request(app).get("/api/admin/announcements?scope=PACKAGE&limit=100").set(admin());
            expect((byScope.body.data as AnnouncementBody[]).every(item => item.scope === "PACKAGE")).toBe(true);

            expect((await request(app).get("/api/admin/announcements?scope=ALL").set(admin())).status).toBe(400);
            expect((await request(app).get("/api/admin/announcements?packageId=x").set(admin())).status).toBe(400);
        });

        it("gets an announcement and answers 404 for an unknown one", async () => {
            const created = (await broadcast({ target: "GLOBAL" })).body.data.announcement as AnnouncementBody;

            const found = await request(app).get(`/api/admin/announcements/${created.id}`).set(admin());
            expect(found.status).toBe(200);
            expect(found.body.data.id).toBe(created.id);

            const missing = await request(app).get(`/api/admin/announcements/${randomUUID()}`).set(admin());
            expect(missing.status).toBe(404);
            expect(missing.body.error.code).toBe("ANNOUNCEMENT_NOT_FOUND");
            expect((await request(app).get("/api/admin/announcements/nope").set(admin())).status).toBe(400);
        });

        it("edits the text without sending anything again", async () => {
            const created = (await broadcast({ target: "GLOBAL" })).body.data.announcement as AnnouncementBody;
            realtime.publish.mockClear();

            const response = await request(app)
                .patch(`/api/admin/announcements/${created.id}`)
                .set(admin())
                .send({ title: `Zz ${tag} diedit`, body: "isi baru" });

            expect(response.status).toBe(200);
            expect(response.body.data).toMatchObject({ id: created.id, title: `Zz ${tag} diedit`, body: "isi baru" });
            expect(realtime.publish).not.toHaveBeenCalled();
        });

        it("retargets an announcement, checking the scope and the target", async () => {
            const created = (await broadcast({ target: "GLOBAL" })).body.data.announcement as AnnouncementBody;
            const patch = (body: Record<string, unknown>) =>
                request(app).patch(`/api/admin/announcements/${created.id}`).set(admin()).send(body);

            const moved = await patch({ scope: "PACKAGE", packageId });
            expect(moved.status).toBe(200);
            expect(moved.body.data).toMatchObject({ scope: "PACKAGE", packageId, menuScheduleId: null });

            const inconsistent = await patch({ scope: "SCHEDULE" });
            expect(inconsistent.status).toBe(400);
            expect(inconsistent.body.error.issues).toEqual(
                expect.arrayContaining([expect.objectContaining({ path: "menuScheduleId" })]),
            );

            const unknownPackage = await patch({ packageId: randomUUID() });
            expect(unknownPackage.status).toBe(404);
            expect(unknownPackage.body.error.code).toBe("TARGET_NOT_FOUND");

            const global = await patch({ scope: "GLOBAL", packageId: null });
            expect(global.body.data).toMatchObject({ scope: "GLOBAL", packageId: null });

            expect((await patch({})).status).toBe(400);
            expect((await patch({ body: "x".repeat(2001) })).status).toBe(400);
            expect(
                (await request(app).patch(`/api/admin/announcements/${randomUUID()}`).set(admin()).send({ title: "x" }))
                    .status,
            ).toBe(404);
        });

        it("deletes an announcement", async () => {
            const created = (await broadcast({ target: "GLOBAL" })).body.data.announcement as AnnouncementBody;

            expect((await request(app).delete(`/api/admin/announcements/${created.id}`).set(admin())).status).toBe(204);
            expect((await request(app).delete(`/api/admin/announcements/${created.id}`).set(admin())).status).toBe(404);
        });
    });

    describe("my announcements", () => {
        it("shows GLOBAL plus the announcements of the packages and schedules the customer qualifies for", async () => {
            const global = (await broadcast({ target: "GLOBAL" })).body.data.announcement as AnnouncementBody;
            const forPackage = (await broadcast({ target: "PACKAGE", packageId })).body.data
                .announcement as AnnouncementBody;
            const forSchedule = (await broadcast({ target: "SCHEDULE", menuScheduleId: scheduleId })).body.data
                .announcement as AnnouncementBody;

            const none = await request(app).get("/api/me/announcements?limit=100").set(customer());
            const noneIds = (none.body.data as AnnouncementBody[]).map(item => item.id);
            expect(none.status).toBe(200);
            expect(noneIds).toContain(global.id);
            expect(noneIds).not.toContain(forPackage.id);
            expect(noneIds).not.toContain(forSchedule.id);

            concernedPackageIds = [packageId];
            concernedScheduleIds = [scheduleId];
            const all = await request(app).get("/api/me/announcements?limit=100").set(customer());
            const allIds = (all.body.data as AnnouncementBody[]).map(item => item.id);
            expect(allIds).toEqual(expect.arrayContaining([global.id, forPackage.id, forSchedule.id]));
            expect(all.body.meta.total).toBe(allIds.length);
        });

        it("stops showing the announcement of a package that was deleted", async () => {
            const doomedPackageId = await createTestPackage(db, rows);
            const doomed = (await broadcast({ target: "PACKAGE", packageId: doomedPackageId })).body.data
                .announcement as AnnouncementBody;
            concernedPackageIds = [doomedPackageId];

            await db.orm.public.Package.where({ id: doomedPackageId }).deleteAndCount();

            const mine = await request(app).get("/api/me/announcements?limit=100").set(customer());
            expect((mine.body.data as AnnouncementBody[]).map(item => item.id)).not.toContain(doomed.id);
            const adminView = await request(app).get(`/api/admin/announcements/${doomed.id}`).set(admin());
            expect(adminView.body.data).toMatchObject({ scope: "PACKAGE", packageId: null });
        });
    });
});
