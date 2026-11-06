import { randomUUID } from "node:crypto";
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createUsersContainer } from "../../../utils/app/users-container.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import type { HttpConfig } from "../../../../src/config/http.js";
import { loadConfig } from "../../../../src/config/index.js";
import { trackCreated, type CreatedRows } from "../../../../src/infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import { AuthContainer } from "../../../../src/modules/auth/container/auth.container.js";

const PASSWORD = "password123";
const randomLocalPhone = () =>
    `0899${Math.floor(Math.random() * 1e8)
        .toString()
        .padStart(8, "0")}`;

function findCookie(response: request.Response, name: string): string {
    const header = response.headers["set-cookie"];
    const cookies = Array.isArray(header) ? header : header ? [header] : [];
    const cookie = cookies.find(value => value.startsWith(`${name}=`));
    if (cookie === undefined) throw new Error(`no ${name} cookie in the response`);
    return cookie;
}

describe("auth routes (e2e)", () => {
    let db: Db;
    let rows: CreatedRows;
    const testApps: TestApp[] = [];
    let allergyId: string;
    let app: Express;

    async function buildApp(http: Partial<HttpConfig> = {}): Promise<Express> {
        const testApp = await createTestApp({
            db,
            http: {
                AUTH_RATE_LIMIT_MAX: 1000,
                AUTH_COOKIE_NAME: "lahap_refresh",
                AUTH_COOKIE_SAME_SITE: "lax",
                AUTH_COOKIE_SECURE: false,
                ...http,
            },
            mount: deps => {
                const users = createUsersContainer(deps);
                return [new AuthContainer({ ...deps, users: users.service }).router];
            },
        });
        testApps.push(testApp);
        return testApp.app;
    }

    async function register(body: Record<string, unknown> = {}) {
        const response = await request(app)
            .post("/api/auth/register")
            .send({ phone: randomLocalPhone(), password: PASSWORD, confirmPassword: PASSWORD, ...body });
        if (response.status === 201) rows.track("User", response.body.data.user.id);
        return response;
    }

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        allergyId = rows.track(
            "Allergy",
            (await db.orm.public.Allergy.create({ name: `Zz Auth Test ${randomUUID().slice(0, 8)}` })).id,
        );
        app = await buildApp();
    });

    afterAll(async () => {
        await rows?.cleanup();
        for (const testApp of testApps) await testApp.close();
        await db?.close();
    });

    it("registers, logs in by phone and by email, refreshes and logs out", async () => {
        const email = `auth-${randomUUID().slice(0, 8)}@lahap.test`;
        const registered = await register({ name: "Rina", email: email.toUpperCase(), allergyIds: [allergyId] });

        expect(registered.status).toBe(201);
        const { user } = registered.body.data;
        expect(registered.body.data).toMatchObject({ tokenType: "Bearer", expiresIn: 3600 });
        expect(user).toMatchObject({ name: "Rina", email, role: "CUSTOMER", isActive: true });
        expect(user.phone).toMatch(/^628/);
        expect(user.allergies).toEqual([expect.objectContaining({ id: allergyId })]);
        expect(user.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+07:00$/);
        expect(user).not.toHaveProperty("password");

        const byPhone = await request(app)
            .post("/api/auth/login")
            .send({ identifier: `0${user.phone.slice(2)}`, password: PASSWORD });
        expect(byPhone.status).toBe(200);
        expect(byPhone.body.data.user.id).toBe(user.id);

        const byEmail = await request(app)
            .post("/api/auth/login")
            .send({ identifier: email.toUpperCase(), password: PASSWORD });
        expect(byEmail.status).toBe(200);

        const refreshed = await request(app)
            .post("/api/auth/refresh")
            .send({ refreshToken: byEmail.body.data.refreshToken });
        expect(refreshed.status).toBe(200);
        expect(refreshed.body.data.user.id).toBe(user.id);

        const loggedOut = await request(app)
            .post("/api/auth/logout")
            .send({ refreshToken: refreshed.body.data.refreshToken });
        expect(loggedOut.status).toBe(204);
        expect(loggedOut.text).toBe("");

        const afterLogout = await request(app)
            .post("/api/auth/refresh")
            .send({ refreshToken: refreshed.body.data.refreshToken });
        expect(afterLogout.status).toBe(401);
        expect(afterLogout.body.error.code).toBe("INVALID_TOKEN");
    });

    it("stores each issued refresh token and rotates it on refresh", async () => {
        const registered = await register();
        const { user, refreshToken } = registered.body.data;

        const refreshed = await request(app).post("/api/auth/refresh").send({ refreshToken });
        const replayed = await request(app).post("/api/auth/refresh").send({ refreshToken });

        expect(refreshed.status).toBe(200);
        expect(refreshed.body.data.refreshToken).not.toBe(refreshToken);
        expect(replayed.status).toBe(401);
        expect(replayed.body.error).toEqual({ code: "INVALID_TOKEN", message: "refresh token has been revoked" });
        const rows = await db.orm.public.RefreshToken.where({ userId: user.id }).all();
        expect(rows).toHaveLength(2);
        expect(rows.every(row => row.revokedAt !== null)).toBe(true);
    });

    it("revokes every session of the user when a rotated refresh token is reused", async () => {
        const registered = await register();
        const { user, refreshToken } = registered.body.data;
        const otherDevice = await request(app)
            .post("/api/auth/login")
            .send({ identifier: user.phone, password: PASSWORD });
        const refreshed = await request(app).post("/api/auth/refresh").send({ refreshToken });

        await request(app).post("/api/auth/refresh").send({ refreshToken });

        for (const token of [refreshed.body.data.refreshToken, otherDevice.body.data.refreshToken]) {
            const response = await request(app).post("/api/auth/refresh").send({ refreshToken: token });
            expect(response.status).toBe(401);
        }
    });

    it("sets the refresh token as an HttpOnly cookie and refreshes with the cookie alone", async () => {
        const registered = await register();
        const login = await request(app)
            .post("/api/auth/login")
            .send({ identifier: registered.body.data.user.phone, password: PASSWORD });

        const cookie = findCookie(login, "lahap_refresh");
        expect(cookie).toContain(`lahap_refresh=${login.body.data.refreshToken}`);
        expect(cookie).toMatch(/; Max-Age=604800;/);
        expect(cookie).toMatch(/; Path=\/api\/auth;/);
        expect(cookie).toMatch(/; HttpOnly/);
        expect(cookie).toMatch(/; SameSite=Lax/);
        expect(cookie).not.toMatch(/; Secure/);
        expect(login.body.data.refreshExpiresIn).toBe(604800);

        const refreshed = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", cookie.split(";")[0] ?? "");

        expect(refreshed.status).toBe(200);
        expect(refreshed.body.data.user.id).toBe(registered.body.data.user.id);
        expect(findCookie(refreshed, "lahap_refresh")).toContain(`lahap_refresh=${refreshed.body.data.refreshToken}`);
    });

    it("answers 401 MISSING_TOKEN when refresh gets neither a body token nor a cookie", async () => {
        const response = await request(app).post("/api/auth/refresh");

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe("MISSING_TOKEN");
    });

    it("revokes the cookie's refresh token and clears the cookie on logout", async () => {
        const registered = await register();
        const sessionCookie = findCookie(registered, "lahap_refresh").split(";")[0] ?? "";

        const loggedOut = await request(app).post("/api/auth/logout").set("Cookie", sessionCookie);

        expect(loggedOut.status).toBe(204);
        const cookie = findCookie(loggedOut, "lahap_refresh");
        expect(cookie).toMatch(/^lahap_refresh=;/);
        expect(cookie).toMatch(/; Path=\/api\/auth;/);
        expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
        const refreshed = await request(app).post("/api/auth/refresh").set("Cookie", sessionCookie);
        expect(refreshed.status).toBe(401);
    });

    it("answers 204 to logout without a refresh token, an access token or a valid token", async () => {
        const withoutToken = await request(app).post("/api/auth/logout");
        const withGarbage = await request(app).post("/api/auth/logout").send({ refreshToken: "not-a-jwt" });

        expect(withoutToken.status).toBe(204);
        expect(withGarbage.status).toBe(204);
    });

    it("answers 204 when the same refresh token logs out twice", async () => {
        const { refreshToken } = (await register()).body.data;

        const first = await request(app).post("/api/auth/logout").send({ refreshToken });
        const second = await request(app).post("/api/auth/logout").send({ refreshToken });

        expect([first.status, second.status]).toEqual([204, 204]);
    });

    it("answers 409 CONFLICT for a phone that is already registered", async () => {
        const first = await register();
        const phone = `0${first.body.data.user.phone.slice(2)}`;

        const second = await request(app)
            .post("/api/auth/register")
            .send({ phone, password: PASSWORD, confirmPassword: PASSWORD });

        expect(second.status).toBe(409);
        expect(second.body.error).toEqual({ code: "CONFLICT", message: "phone is already registered" });
    });

    it("answers 400 UNKNOWN_ALLERGY for an allergy that does not exist", async () => {
        const response = await register({ allergyIds: [randomUUID()] });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("UNKNOWN_ALLERGY");
    });

    it("answers 400 VALIDATION_ERROR when the passwords differ", async () => {
        const response = await register({ confirmPassword: "password124" });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.issues).toEqual([expect.objectContaining({ path: "confirmPassword" })]);
    });

    it("answers the same 401 INVALID_CREDENTIALS for a wrong password, an unknown user and an inactive account", async () => {
        const registered = await register();
        const { user, refreshToken } = registered.body.data;
        const identifier = user.phone;

        const wrongPassword = await request(app)
            .post("/api/auth/login")
            .send({ identifier, password: "wrong-password" });
        const unknownUser = await request(app)
            .post("/api/auth/login")
            .send({ identifier: randomLocalPhone(), password: PASSWORD });

        await db.orm.public.User.where({ id: user.id }).updateAll({ isActive: false });
        const inactive = await request(app).post("/api/auth/login").send({ identifier, password: PASSWORD });
        const inactiveRefresh = await request(app).post("/api/auth/refresh").send({ refreshToken });

        for (const response of [wrongPassword, unknownUser, inactive]) {
            expect(response.status).toBe(401);
            expect(response.body.error).toEqual({ code: "INVALID_CREDENTIALS", message: "invalid credentials" });
        }
        expect(inactiveRefresh.status).toBe(401);
    });

    it("refuses an access token at the refresh endpoint", async () => {
        const registered = await register();

        const response = await request(app)
            .post("/api/auth/refresh")
            .send({ refreshToken: registered.body.data.accessToken });

        expect(response.status).toBe(401);
    });

    it("rate-limits login per client with 429 and Retry-After", async () => {
        const limitedApp = await buildApp({ AUTH_RATE_LIMIT_MAX: 2, AUTH_RATE_LIMIT_WINDOW_SECONDS: 60 });
        const attempt = () =>
            request(limitedApp).post("/api/auth/login").send({ identifier: randomLocalPhone(), password: PASSWORD });

        expect((await attempt()).status).toBe(401);
        expect((await attempt()).status).toBe(401);
        const blocked = await attempt();

        expect(blocked.status).toBe(429);
        expect(blocked.body.error.code).toBe("TOO_MANY_REQUESTS");
        expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    });
});
