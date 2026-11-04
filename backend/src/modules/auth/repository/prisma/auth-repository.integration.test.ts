import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../config/index.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import { PrismaAuthRepository } from "./auth-repository.js";

const at = (iso: string) => Temporal.PlainDateTime.from(iso);
const EXPIRES_AT = at("2026-11-10T01:00:00");
const REVOKED_AT = at("2026-11-04T01:00:00");

describe("PrismaAuthRepository (integration)", () => {
    let db: Db;
    let repository: PrismaAuthRepository;
    const userIds: string[] = [];

    const createUser = async () => {
        const user = await db.orm.public.User.create({
            name: "Refresh Token User",
            phone: `62899${Math.floor(Math.random() * 1e8)
                .toString()
                .padStart(8, "0")}`,
            password: "$2b$10$integrationhashintegrationhashintegrationhash1234",
            role: "CUSTOMER",
        });
        userIds.push(user.id);
        return user.id;
    };

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaAuthRepository(db);
    });

    afterAll(async () => {
        for (const id of userIds) await db.orm.public.User.where({ id }).deleteAll();
        await db?.close();
    });

    it("creates a refresh token and finds it by id", async () => {
        const userId = await createUser();
        const id = randomUUID();

        const created = await repository.createRefreshToken({ id, userId, expiresAt: EXPIRES_AT });

        expect(created).toMatchObject({ id, userId, revokedAt: null });
        expect(created.expiresAt.equals(EXPIRES_AT)).toBe(true);
        expect(await repository.findRefreshToken(id)).toEqual(created);
    });

    it("answers null for a token that was never stored", async () => {
        expect(await repository.findRefreshToken(randomUUID())).toBeNull();
    });

    it("revokes an active token once and reports false afterwards", async () => {
        const userId = await createUser();
        const id = randomUUID();
        await repository.createRefreshToken({ id, userId, expiresAt: EXPIRES_AT });

        expect(await repository.revokeRefreshToken(id, REVOKED_AT)).toBe(true);
        expect(await repository.revokeRefreshToken(id, at("2026-11-05T01:00:00"))).toBe(false);
        expect((await repository.findRefreshToken(id))?.revokedAt?.equals(REVOKED_AT)).toBe(true);
    });

    it("reports false when revoking a token that was never stored", async () => {
        expect(await repository.revokeRefreshToken(randomUUID(), REVOKED_AT)).toBe(false);
    });

    it("revokes only the active tokens of one user", async () => {
        const userId = await createUser();
        const otherUserId = await createUser();
        const [first, second, alreadyRevoked, other] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
        for (const id of [first, second, alreadyRevoked]) {
            await repository.createRefreshToken({ id, userId, expiresAt: EXPIRES_AT });
        }
        await repository.createRefreshToken({ id: other, userId: otherUserId, expiresAt: EXPIRES_AT });
        await repository.revokeRefreshToken(alreadyRevoked, at("2026-11-03T01:00:00"));

        expect(await repository.revokeRefreshTokensOfUser(userId, REVOKED_AT)).toBe(2);
        expect((await repository.findRefreshToken(first))?.revokedAt?.equals(REVOKED_AT)).toBe(true);
        expect((await repository.findRefreshToken(alreadyRevoked))?.revokedAt?.toString()).toBe("2026-11-03T01:00:00");
        expect((await repository.findRefreshToken(other))?.revokedAt).toBeNull();
    });

    it("deletes a user's tokens together with the user", async () => {
        const userId = await createUser();
        const id = randomUUID();
        await repository.createRefreshToken({ id, userId, expiresAt: EXPIRES_AT });

        await db.orm.public.User.where({ id: userId }).deleteAll();

        expect(await repository.findRefreshToken(id)).toBeNull();
    });
});
