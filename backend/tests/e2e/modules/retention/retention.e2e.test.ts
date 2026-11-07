import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import { toNumeric } from "../../../../src/infrastructure/database/prisma/numeric.js";
import { createModules } from "../../../../src/modules/create-modules.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import type { PaymentGateway } from "../../../../src/shared/ports/payment-gateway/payment-gateway.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createAuthHeaders } from "../../../utils/factory/jwt/jwt.js";
import { createTestPackage, createTestSubscription } from "../../../utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../utils/fixtures/users.js";

interface ChurnBody {
    readonly userId: string;
    readonly name: string;
    readonly phone: string;
    readonly lastPackageName: string;
    readonly lastEndDate: string;
    readonly daysSinceLastOrder: number;
    readonly totalSubscriptions: number;
}

interface TemplateBody {
    readonly id: string;
    readonly name: string;
    readonly body: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

describe("retention routes (e2e)", () => {
    let db: Db;
    let rows: CreatedRows;
    let testApp: TestApp;
    let app: Express;
    const tag = randomUUID().slice(0, 8);
    const today = Temporal.Now.plainDateISO("Asia/Jakarta");
    const daysAgo = (days: number) => today.subtract({ days });

    let packageName: string;
    let churnedId: string;
    let olderChurnedId: string;
    let notYetChurnedId: string;
    let inactiveId: string;
    let returnedId: string;
    let pendingOnlyId: string;
    let promoUserId: string;
    let activeCode: string;
    let inactiveCode: string;
    let fullCode: string;

    const as = (role: Role, userId: string = randomUUID()) =>
        createAuthHeaders({ role, sub: { userId, name: `E2E ${role}` } });
    const admin = () => as("ADMIN");
    const uniqueName = (label: string) => `Zz ${tag} ${label} ${randomUUID().slice(0, 6)}`;

    async function createTemplate(body: string, name = uniqueName("template")): Promise<TemplateBody> {
        const response = await request(app).post("/api/admin/message-templates").set(admin()).send({ name, body });
        expect(response.status).toBe(201);
        const created = response.body.data as TemplateBody;
        rows.track("MessageTemplate", created.id);
        return created;
    }

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        testApp = await createTestApp({
            db,
            adapters: {
                objectStorage: {
                    getSignedUrl: async (key: string) => `https://storage.test/${key}`,
                    exists: async () => true,
                },
                paymentGateway: { createTransaction: vi.fn(), verifyNotification: vi.fn() } as PaymentGateway,
            } as never,
            mount: deps => [createModules(deps).retention.router],
        });
        app = testApp.app;

        packageName = `Zz ${tag} Paket`;
        const packageId = await createTestPackage(db, rows, { name: packageName });
        const customer = (label: string) => createTestUser(db, rows, { name: `Zz ${tag} ${label}` });
        const subscription = (
            userId: string,
            endedDaysAgo: number,
            status: "Success" | "Pending" | "Expire" = "Success",
        ) =>
            createTestSubscription(db, rows, {
                userId,
                packageId,
                status,
                startDate: daysAgo(endedDaysAgo + 4),
                endDate: daysAgo(endedDaysAgo),
            });

        churnedId = await customer("Churned");
        await subscription(churnedId, 40);
        await subscription(churnedId, 15);
        await subscription(churnedId, 5, "Expire");
        olderChurnedId = await customer("Older");
        await subscription(olderChurnedId, 60);
        notYetChurnedId = await customer("Fourteen");
        await subscription(notYetChurnedId, 14);
        inactiveId = await customer("Inactive");
        await subscription(inactiveId, 30);
        await db.orm.public.User.where({ id: inactiveId }).update({ isActive: false });
        returnedId = await customer("Returned");
        await subscription(returnedId, 30);
        await subscription(returnedId, -3);
        pendingOnlyId = await customer("Pending");
        await subscription(pendingOnlyId, 30, "Pending");

        const promoCode = async (label: string, options: { readonly isActive?: boolean; readonly quota?: number }) => {
            const created = await db.orm.public.PromoCode.create({
                code: `ZZ${tag.toUpperCase()}${label}`,
                discountType: "Persen",
                discountValue: toNumeric(10, 2),
                minPurchase: toNumeric(1000000, 2),
                allowStackWithTier: true,
                validUntil: Temporal.Now.plainDateTimeISO("UTC").add({ days: 30 }),
                quota: options.quota ?? 10,
                isActive: options.isActive ?? true,
            });
            rows.track("PromoCode", created.id);
            return created;
        };
        const active = await promoCode("OK", {});
        activeCode = active.code;
        inactiveCode = (await promoCode("OFF", { isActive: false })).code;
        fullCode = (await promoCode("FULL", { quota: 0 })).code;
        promoUserId = await customer("Promo user");
        await createTestSubscription(db, rows, {
            userId: promoUserId,
            packageId,
            status: "Success",
            startDate: daysAgo(34),
            endDate: daysAgo(30),
            promoCodeId: active.id,
            promoDiscount: 1000,
        });
    });

    afterAll(async () => {
        await rows?.cleanup();
        await testApp?.close();
        await db?.close();
    });

    describe("access", () => {
        const id = randomUUID();

        it.each([
            ["get", "/api/admin/message-templates"],
            ["post", "/api/admin/message-templates"],
            ["get", `/api/admin/message-templates/${id}`],
            ["patch", `/api/admin/message-templates/${id}`],
            ["delete", `/api/admin/message-templates/${id}`],
            ["get", "/api/admin/retention/churn"],
            ["post", `/api/admin/retention/churn/${id}/follow-up`],
        ] as const)("answers 401 to %s %s without a token and 403 to a non-admin", async (method, path) => {
            expect((await request(app)[method](path)).status).toBe(401);
            expect((await request(app)[method](path).set(as("KITCHEN"))).status).toBe(403);
        });
    });

    describe("message templates", () => {
        it("creates, reads, lists, updates and deletes a template", async () => {
            const name = uniqueName("crud");
            const created = await createTemplate("  Halo {nama}, pakai {kode_promo}!  ", `  ${name} `);
            expect(created).toMatchObject({ name, body: "Halo {nama}, pakai {kode_promo}!" });
            expect(created.createdAt).toMatch(/\+07:00$/);

            const read = await request(app).get(`/api/admin/message-templates/${created.id}`).set(admin());
            expect(read.status).toBe(200);
            expect(read.body.data).toEqual(created);

            const list = await request(app).get("/api/admin/message-templates").query({ limit: 100 }).set(admin());
            expect(list.status).toBe(200);
            expect(list.body.meta).toMatchObject({ page: 1, limit: 100 });
            expect((list.body.data as TemplateBody[]).map(item => item.id)).toContain(created.id);

            const updated = await request(app)
                .patch(`/api/admin/message-templates/${created.id}`)
                .set(admin())
                .send({ body: "Halo {nama}" });
            expect(updated.status).toBe(200);
            expect(updated.body.data).toMatchObject({ id: created.id, name, body: "Halo {nama}" });

            const deleted = await request(app).delete(`/api/admin/message-templates/${created.id}`).set(admin());
            expect(deleted.status).toBe(204);
            expect((await request(app).get(`/api/admin/message-templates/${created.id}`).set(admin())).status).toBe(
                404,
            );
        });

        it("answers 409 for a name another template uses, ignoring case, but lets a template keep its own", async () => {
            const name = uniqueName("Duplicate");
            const first = await createTemplate("Halo", name);
            const second = await createTemplate("Halo");

            const create = await request(app)
                .post("/api/admin/message-templates")
                .set(admin())
                .send({ name: name.toUpperCase(), body: "Halo" });
            expect(create.status).toBe(409);
            expect(create.body.error.code).toBe("CONFLICT");

            const rename = await request(app)
                .patch(`/api/admin/message-templates/${second.id}`)
                .set(admin())
                .send({ name: name.toLowerCase() });
            expect(rename.status).toBe(409);

            const keep = await request(app)
                .patch(`/api/admin/message-templates/${first.id}`)
                .set(admin())
                .send({ name: name.toLowerCase() });
            expect(keep.status).toBe(200);
        });

        it("answers 400 for an unknown placeholder, a body over 2000 characters and an empty update", async () => {
            const unknown = await request(app)
                .post("/api/admin/message-templates")
                .set(admin())
                .send({ name: uniqueName("typo"), body: "Halo {nma}" });
            expect(unknown.status).toBe(400);
            expect(unknown.body.error.code).toBe("VALIDATION_ERROR");
            expect(JSON.stringify(unknown.body.error.issues)).toContain("{nma}");

            const long = await request(app)
                .post("/api/admin/message-templates")
                .set(admin())
                .send({ name: uniqueName("long"), body: "a".repeat(2001) });
            expect(long.status).toBe(400);

            const created = await createTemplate("Halo");
            const empty = await request(app).patch(`/api/admin/message-templates/${created.id}`).set(admin()).send({});
            expect(empty.status).toBe(400);
        });

        it("answers 404 for an unknown template", async () => {
            const id = randomUUID();
            expect((await request(app).get(`/api/admin/message-templates/${id}`).set(admin())).status).toBe(404);
            const patch = await request(app)
                .patch(`/api/admin/message-templates/${id}`)
                .set(admin())
                .send({ body: "x" });
            expect(patch.status).toBe(404);
            expect(patch.body.error.code).toBe("MESSAGE_TEMPLATE_NOT_FOUND");
            expect((await request(app).delete(`/api/admin/message-templates/${id}`).set(admin())).status).toBe(404);
        });
    });

    describe("churn list", () => {
        const churnList = (query: Record<string, string | number> = {}) =>
            request(app)
                .get("/api/admin/retention/churn")
                .query({ search: `Zz ${tag}`, ...query })
                .set(admin());

        it("lists active customers whose last paid order ended more than 14 days ago, most recent first", async () => {
            const response = await churnList();

            expect(response.status).toBe(200);
            expect(response.body.meta).toMatchObject({ page: 1, total: 3 });
            const items = response.body.data as ChurnBody[];
            expect(items.map(item => item.userId)).toEqual([churnedId, promoUserId, olderChurnedId]);
            expect(items[0]).toEqual({
                userId: churnedId,
                name: `Zz ${tag} Churned`,
                phone: expect.stringMatching(/^62/),
                lastPackageName: packageName,
                lastEndDate: daysAgo(15).toString(),
                daysSinceLastOrder: 15,
                totalSubscriptions: 2,
            });
            const ids = items.map(item => item.userId);
            for (const id of [notYetChurnedId, inactiveId, returnedId, pendingOnlyId]) expect(ids).not.toContain(id);
        });

        it("searches and pages", async () => {
            const searched = await churnList({ search: `${tag} older` });
            expect((searched.body.data as ChurnBody[]).map(item => item.userId)).toEqual([olderChurnedId]);

            const second = await churnList({ page: 2, limit: 1 });
            expect(second.body.meta).toMatchObject({ page: 2, limit: 1, total: 3 });
            expect((second.body.data as ChurnBody[]).map(item => item.userId)).toEqual([promoUserId]);
        });
    });

    describe("follow-up", () => {
        const followUp = (userId: string, body: Record<string, unknown>) =>
            request(app).post(`/api/admin/retention/churn/${userId}/follow-up`).set(admin()).send(body);

        it("fills the template and returns a wa.me link that decodes back to the message", async () => {
            const template = await createTemplate(
                "Halo {nama}, sudah {lama_tidak_memesan} sejak {paket_terakhir} berakhir. Pakai {kode_promo} & hemat!",
            );

            const response = await followUp(churnedId, {
                templateId: template.id,
                promoCode: activeCode.toLowerCase(),
            });

            expect(response.status).toBe(200);
            const { message, whatsappUrl } = response.body.data as { message: string; whatsappUrl: string };
            expect(message).toBe(
                `Halo Zz ${tag} Churned, sudah 15 hari sejak ${packageName} berakhir. Pakai ${activeCode} & hemat!`,
            );
            const url = new URL(whatsappUrl);
            expect(url.origin).toBe("https://wa.me");
            expect(url.pathname).toMatch(/^\/62\d+$/);
            expect(url.searchParams.get("text")).toBe(message);
        });

        it("answers 404 for an unknown user, a staff account and an unknown template", async () => {
            const template = await createTemplate("Halo {nama}");
            const courierId = await createTestUser(db, rows, { role: "COURIER" });

            const unknown = await followUp(randomUUID(), { templateId: template.id });
            expect(unknown.status).toBe(404);
            expect(unknown.body.error.code).toBe("USER_NOT_FOUND");
            expect((await followUp(courierId, { templateId: template.id })).status).toBe(404);

            const noTemplate = await followUp(churnedId, { templateId: randomUUID() });
            expect(noTemplate.status).toBe(404);
            expect(noTemplate.body.error.code).toBe("MESSAGE_TEMPLATE_NOT_FOUND");
        });

        it("answers 422 for a customer who isn't churned and an inactive account", async () => {
            const template = await createTemplate("Halo {nama}");

            for (const userId of [notYetChurnedId, returnedId, pendingOnlyId, inactiveId]) {
                const response = await followUp(userId, { templateId: template.id });
                expect(response.status).toBe(422);
                expect(response.body.error.code).toBe("INVALID_STATE");
            }
            expect((await followUp(inactiveId, { templateId: template.id })).body.error.message).toBe(
                "customer account is inactive",
            );
        });

        it("answers 422 for a promo code the customer can't use and a {kode_promo} template without one", async () => {
            const template = await createTemplate("Pakai {kode_promo}");
            const reject = async (userId: string, body: Record<string, unknown>, message: string) => {
                const response = await followUp(userId, { templateId: template.id, ...body });
                expect(response.status).toBe(422);
                expect(response.body.error.message).toBe(message);
            };

            await reject(churnedId, { promoCode: inactiveCode }, "promo code is not active");
            await reject(churnedId, { promoCode: "ZZ-NO-SUCH-CODE" }, "promo code is not active");
            await reject(churnedId, { promoCode: fullCode }, "promo code quota is exhausted");
            await reject(promoUserId, { promoCode: activeCode }, "customer already used this promo code");
            await reject(churnedId, {}, "template needs a promo code");
            await reject(churnedId, { promoCode: "" }, "template needs a promo code");
        });

        it("answers 400 for a template id that is not a uuid", async () => {
            expect((await followUp(churnedId, { templateId: "t1" })).status).toBe(400);
        });
    });
});
