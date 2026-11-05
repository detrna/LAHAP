import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import { AuthContainer } from "../../../../src/modules/auth/container/auth.container.js";
import { UsersContainer } from "../../../../src/modules/users/container/users.container.js";
import type { UsersService } from "../../../../src/modules/users/service/users.service.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import type { ObjectStorage } from "../../../../src/shared/ports/object-storage/object-storage.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { withOtherAdminsInactive } from "../../../utils/fixtures/admins.js";

const PASSWORD = "password123";
const randomLocalPhone = () =>
    `0898${Math.floor(Math.random() * 1e8)
        .toString()
        .padStart(8, "0")}`;

const objectStorage = {
    getSignedUrl: async (key: string) => `https://storage.test/${key}`,
} as unknown as ObjectStorage;

interface Account {
    readonly id: string;
    readonly phone: string;
    readonly accessToken: string;
    readonly refreshToken: string;
}

const bearer = (account: Account) => ({ Authorization: `Bearer ${account.accessToken}` });

describe("users routes (e2e)", () => {
    let db: Db;
    let rows: CreatedRows;
    let testApp: TestApp;
    let app: Express;
    let usersService: UsersService;
    let admin: Account;

    async function login(identifier: string, password = PASSWORD) {
        return request(app).post("/api/auth/login").send({ identifier, password });
    }

    async function createAccount(role: Role): Promise<Account> {
        const phone = randomLocalPhone();
        const user = await usersService.createUser({ phone, password: PASSWORD, role, name: `Zz E2E ${role}` });
        rows.track("User", user.id);
        const response = await login(phone);
        expect(response.status).toBe(200);
        return {
            id: user.id,
            phone: user.phone,
            accessToken: response.body.data.accessToken,
            refreshToken: response.body.data.refreshToken,
        };
    }

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        testApp = await createTestApp({
            db,
            http: { AUTH_RATE_LIMIT_MAX: 1000 },
            adapters: { objectStorage },
            mount: deps => {
                const users: UsersContainer = new UsersContainer({
                    ...deps,
                    sessions: { revokeSessionsOfUser: userId => auth.service.revokeSessionsOfUser(userId) },
                });
                const auth: AuthContainer = new AuthContainer({ ...deps, users: users.service });
                usersService = users.service;
                return [auth.router, users.router];
            },
        });
        app = testApp.app;
        admin = await createAccount("ADMIN");
    });

    afterAll(async () => {
        await rows?.cleanup();
        await testApp?.close();
        await db?.close();
    });

    it("lets a customer read and edit their profile", async () => {
        const customer = await createAccount("CUSTOMER");
        const email = `users-${randomUUID().slice(0, 8)}@lahap.test`;

        const me = await request(app).get("/api/me").set(bearer(customer));
        const updated = await request(app).patch("/api/me").set(bearer(customer)).send({
            name: "Rina Putri",
            email: email.toUpperCase(),
            latitude: -7.9393,
            longitude: 112.6094,
            role: "ADMIN",
        });

        expect(me.status).toBe(200);
        expect(me.body.data).toMatchObject({ id: customer.id, role: "CUSTOMER", membership: null, allergies: [] });
        expect(me.body.data).not.toHaveProperty("isChurned");
        expect(updated.status).toBe(200);
        expect(updated.body.data).toMatchObject({
            name: "Rina Putri",
            email,
            latitude: -7.9393,
            longitude: 112.6094,
            role: "CUSTOMER",
        });
    });

    it("rejects an empty or half-coordinate profile update and a phone another user holds", async () => {
        const customer = await createAccount("CUSTOMER");
        const other = await createAccount("CUSTOMER");

        const empty = await request(app).patch("/api/me").set(bearer(customer)).send({});
        const half = await request(app).patch("/api/me").set(bearer(customer)).send({ latitude: null });
        const taken = await request(app).patch("/api/me").set(bearer(customer)).send({ phone: other.phone });

        expect(empty.status).toBe(400);
        expect(half.status).toBe(400);
        expect(taken.status).toBe(409);
        expect(taken.body.error.code).toBe("CONFLICT");
    });

    it("changes the password, revokes refresh tokens, and only the new password logs in", async () => {
        const customer = await createAccount("CUSTOMER");
        const changePassword = (body: Record<string, string>) =>
            request(app).put("/api/me/password").set(bearer(customer)).send(body);

        const wrong = await changePassword({ currentPassword: "wrong-password", newPassword: "new-password-1" });
        const same = await changePassword({ currentPassword: PASSWORD, newPassword: PASSWORD });
        const changed = await changePassword({ currentPassword: PASSWORD, newPassword: "new-password-1" });
        const refreshed = await request(app).post("/api/auth/refresh").send({ refreshToken: customer.refreshToken });

        expect(wrong.status).toBe(422);
        expect(wrong.body.error.code).toBe("INVALID_STATE");
        expect(same.status).toBe(400);
        expect(same.body.error.issues).toEqual([expect.objectContaining({ path: "newPassword" })]);
        expect(changed.status).toBe(204);
        expect(refreshed.status).toBe(401);
        expect((await login(customer.phone)).status).toBe(401);
        expect((await login(customer.phone, "new-password-1")).status).toBe(200);
    });

    it("lets an admin create a staff account that can log in", async () => {
        const phone = randomLocalPhone();

        const created = await request(app)
            .post("/api/admin/users")
            .set(bearer(admin))
            .send({ phone, password: PASSWORD, role: "COURIER", name: "Budi Kurir" });
        if (created.status === 201) rows.track("User", created.body.data.id);

        expect(created.status).toBe(201);
        expect(created.body.data).toMatchObject({ role: "COURIER", isActive: true, name: "Budi Kurir" });
        expect((await login(phone)).body.data.user).toMatchObject({ role: "COURIER" });
    });

    it("lists and filters users by several roles, and shows the detail", async () => {
        const kitchen = await createAccount("KITCHEN");
        const courier = await createAccount("COURIER");

        const listed = await request(app)
            .get("/api/admin/users")
            .query({ role: ["KITCHEN", "COURIER"], search: "Zz E2E", limit: 100 })
            .set(bearer(admin));
        const detail = await request(app).get(`/api/admin/users/${kitchen.id}`).set(bearer(admin));
        const missing = await request(app).get(`/api/admin/users/${randomUUID()}`).set(bearer(admin));

        expect(listed.status).toBe(200);
        const ids = listed.body.data.map((user: { id: string }) => user.id);
        expect(ids).toEqual(expect.arrayContaining([kitchen.id, courier.id]));
        expect(ids).not.toContain(admin.id);
        expect(listed.body.meta).toMatchObject({ page: 1, limit: 100 });
        expect(listed.body.data[0]).toHaveProperty("isChurned", false);
        expect(detail.status).toBe(200);
        expect(detail.body.data).toMatchObject({ id: kitchen.id, membership: null, isChurned: false });
        expect(missing.status).toBe(404);
    });

    it("deactivates a user, who can then neither log in nor refresh", async () => {
        const customer = await createAccount("CUSTOMER");

        const deactivated = await request(app)
            .patch(`/api/admin/users/${customer.id}`)
            .set(bearer(admin))
            .send({ isActive: false });
        const refreshed = await request(app).post("/api/auth/refresh").send({ refreshToken: customer.refreshToken });
        const loggedIn = await login(customer.phone);

        expect(deactivated.status).toBe(200);
        expect(deactivated.body.data).toMatchObject({ isActive: false, isChurned: false });
        expect(refreshed.status).toBe(401);
        expect(refreshed.body.error.code).toBe("INVALID_TOKEN");
        expect(loggedIn.status).toBe(401);
        expect(loggedIn.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("refuses to remove the last active admin", async () => {
        const response = await withOtherAdminsInactive(db, [admin.id], () =>
            request(app).patch(`/api/admin/users/${admin.id}`).set(bearer(admin)).send({ role: "KITCHEN" }),
        );

        expect(response.status).toBe(422);
        expect(response.body.error.code).toBe("INVALID_STATE");
    });

    it("requires a token, and the admin role on admin routes", async () => {
        const customer = await createAccount("CUSTOMER");

        expect((await request(app).get("/api/me")).status).toBe(401);
        expect((await request(app).patch("/api/me").send({ name: "Rina" })).status).toBe(401);
        expect((await request(app).put("/api/me/password").send({})).status).toBe(401);
        expect((await request(app).get("/api/admin/users")).status).toBe(401);
        expect((await request(app).get("/api/admin/users").set(bearer(customer))).status).toBe(403);
        expect(
            (
                await request(app)
                    .patch(`/api/admin/users/${customer.id}`)
                    .set(bearer(customer))
                    .send({ isActive: false })
            ).status,
        ).toBe(403);
    });
});
