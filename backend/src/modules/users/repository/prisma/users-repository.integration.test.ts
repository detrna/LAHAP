import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { withOtherAdminsInactive } from "../../../../../tests/utils/fixtures/admins.js";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import type { NewUserRecord, UserListQuery } from "../../service/interfaces/users.repository.js";
import { UserAlreadyExistsError } from "../../service/interfaces/users.repository.js";
import { PrismaUsersRepository } from "./users-repository.js";

const randomPhone = () =>
    `62899${Math.floor(Math.random() * 1e8)
        .toString()
        .padStart(8, "0")}`;

describe("PrismaUsersRepository (integration)", () => {
    let db: Db;
    let repository: PrismaUsersRepository;
    let rows: CreatedRows;
    const allergyIds: string[] = [];
    const createdUserIds: string[] = [];

    const newUser = (overrides: Partial<NewUserRecord> = {}): NewUserRecord => ({
        name: "Integration User",
        email: null,
        phone: randomPhone(),
        passwordHash: "$2b$10$integrationhashintegrationhashintegrationhash1234",
        role: "CUSTOMER",
        address: "Jl. Test",
        latitude: -7.9393,
        longitude: 112.6094,
        allergyNote: null,
        isActive: true,
        allergyIds: [],
        ...overrides,
    });

    const create = async (overrides: Partial<NewUserRecord> = {}) => {
        const record = await repository.create(newUser(overrides));
        createdUserIds.push(record.id);
        return record;
    };

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaUsersRepository(db);
        rows = trackCreated(db);
        for (const name of ["Zz Test Allergy B", "Zz Test Allergy A"]) {
            const allergy = await db.orm.public.Allergy.create({ name: `${name} ${randomUUID().slice(0, 8)}` });
            allergyIds.push(allergy.id);
        }
    });

    afterEach(async () => {
        await rows.cleanup();
        for (const id of createdUserIds.splice(0)) await db.orm.public.User.where({ id }).deleteAll();
    });

    afterAll(async () => {
        for (const id of allergyIds) await db.orm.public.Allergy.where({ id }).deleteAll();
        await db?.close();
    });

    it("creates a user with allergies and reads it back by id", async () => {
        const created = await create({ allergyIds });

        expect(created).toMatchObject({
            name: "Integration User",
            role: "CUSTOMER",
            latitude: -7.9393,
            isActive: true,
        });
        expect([...created.allergyIds].sort()).toEqual([...allergyIds].sort());
        expect(await repository.findById(created.id)).toEqual(created);
    });

    it("returns null for an unknown id", async () => {
        expect(await repository.findById(randomUUID())).toBeNull();
    });

    it("finds credentials by phone and by email, including the password hash", async () => {
        const email = `it-${randomUUID()}@lahap.test`;
        const created = await create({ email });

        const byPhone = await repository.findCredentialsByPhone(created.phone);
        const byEmail = await repository.findCredentialsByEmail(email);

        expect(byPhone?.user.id).toBe(created.id);
        expect(byPhone?.passwordHash).toBe(newUser().passwordHash);
        expect(byEmail?.user.id).toBe(created.id);
        expect(await repository.findCredentialsByPhone(randomPhone())).toBeNull();
    });

    it("reports whether a phone or email is taken", async () => {
        const email = `it-${randomUUID()}@lahap.test`;
        const created = await create({ email });

        expect(await repository.existsByPhone(created.phone)).toBe(true);
        expect(await repository.existsByEmail(email)).toBe(true);
        expect(await repository.existsByPhone(randomPhone())).toBe(false);
        expect(await repository.existsByEmail(`nobody-${randomUUID()}@lahap.test`)).toBe(false);
    });

    it("maps a duplicate phone or email to UserAlreadyExistsError", async () => {
        const email = `it-${randomUUID()}@lahap.test`;
        const created = await create({ email });

        await expect(repository.create(newUser({ phone: created.phone }))).rejects.toMatchObject({
            constructor: UserAlreadyExistsError,
            field: "phone",
        });
        await expect(repository.create(newUser({ email }))).rejects.toMatchObject({ field: "email" });
    });

    it("rolls back the user when an allergy insert fails", async () => {
        const phone = randomPhone();

        await expect(repository.create(newUser({ phone, allergyIds: [randomUUID()] }))).rejects.toMatchObject({
            code: "USERS_REPOSITORY_FAILURE",
        });
        expect(await repository.existsByPhone(phone)).toBe(false);
    });

    it("updates only the given columns and keeps the allergies when allergyIds is not sent", async () => {
        const created = await create({ allergyIds: [allergyIds[0] ?? ""] });

        const updated = await repository.update(created.id, { name: "Renamed", latitude: null, longitude: null });

        expect(updated).toMatchObject({ name: "Renamed", latitude: null, longitude: null, phone: created.phone });
        expect(updated?.allergyIds).toEqual([allergyIds[0]]);
        expect(updated?.updatedAt).not.toEqual(created.updatedAt);
    });

    it("replaces or clears the allergy set, also without column changes", async () => {
        const created = await create({ allergyIds: [allergyIds[0] ?? ""] });

        const replaced = await repository.update(created.id, {}, { allergyIds: [allergyIds[1] ?? ""] });
        const cleared = await repository.update(created.id, {}, { allergyIds: [] });

        expect(replaced?.allergyIds).toEqual([allergyIds[1]]);
        expect(cleared?.allergyIds).toEqual([]);
    });

    it("returns null when updating an unknown id", async () => {
        expect(await repository.update(randomUUID(), { name: "Nobody" })).toBeNull();
        expect(await repository.update(randomUUID(), {}, { allergyIds: [] })).toBeNull();
    });

    it("maps a duplicate phone or email on update to UserAlreadyExistsError", async () => {
        const email = `it-${randomUUID()}@lahap.test`;
        const first = await create({ email });
        const second = await create();

        await expect(repository.update(second.id, { phone: first.phone })).rejects.toMatchObject({
            constructor: UserAlreadyExistsError,
            field: "phone",
        });
        await expect(repository.update(second.id, { email })).rejects.toMatchObject({ field: "email" });
    });

    it("finds a phone or email conflict with other users only", async () => {
        const email = `it-${randomUUID()}@lahap.test`;
        const created = await create({ email });
        const other = await create();

        expect(await repository.findConflict({ phone: created.phone, email, exceptId: created.id })).toBeNull();
        expect(await repository.findConflict({ phone: created.phone, exceptId: other.id })).toBe("phone");
        expect(await repository.findConflict({ email, exceptId: other.id })).toBe("email");
    });

    it("finds credentials by id and updates the password hash", async () => {
        const created = await create();

        expect(await repository.updatePasswordHash(created.id, "new-hash")).toBe(true);
        expect((await repository.findCredentialsById(created.id))?.passwordHash).toBe("new-hash");
        expect(await repository.updatePasswordHash(randomUUID(), "new-hash")).toBe(false);
    });

    describe("the last active admin", () => {
        it("refuses to demote or deactivate the only active admin", async () => {
            const admin = await create({ role: "ADMIN" });

            await withOtherAdminsInactive(db, [admin.id], async () => {
                await expect(
                    repository.update(admin.id, { role: "CUSTOMER" }, { ensureActiveAdminRemains: true }),
                ).rejects.toBeInstanceOf(InvalidStateError);
                await expect(
                    repository.update(admin.id, { isActive: false }, { ensureActiveAdminRemains: true }),
                ).rejects.toMatchObject({ statusCode: 422 });
            });
            expect((await repository.findById(admin.id))?.role).toBe("ADMIN");
        });

        it("lets one of two admins go, but not both at once", async () => {
            const first = await create({ role: "ADMIN" });
            const second = await create({ role: "ADMIN" });

            const results = await withOtherAdminsInactive(db, [first.id, second.id], () =>
                Promise.allSettled([
                    repository.update(first.id, { role: "KITCHEN" }, { ensureActiveAdminRemains: true }),
                    repository.update(second.id, { isActive: false }, { ensureActiveAdminRemains: true }),
                ]),
            );

            expect(results.map(result => result.status).sort()).toEqual(["fulfilled", "rejected"]);
            const rejected = results.find(result => result.status === "rejected");
            expect(rejected?.status === "rejected" ? rejected.reason : null).toBeInstanceOf(InvalidStateError);
        });
    });

    describe("list", () => {
        const tag = randomUUID().slice(0, 8);
        const query = (overrides: Partial<UserListQuery> = {}): UserListQuery => ({
            search: `Zz List ${tag}`,
            skip: 0,
            take: 50,
            ...overrides,
        });
        const names = async (overrides: Partial<UserListQuery> = {}) =>
            (await repository.list(query(overrides))).items.map(item => item.name);

        it("searches name, email and phone, newest first, with the total", async () => {
            const older = await create({ name: `Zz List ${tag} Older` });
            const newer = await create({ name: `Zz List ${tag} Newer`, email: `zz-${tag}@lahap.test` });

            const page = await repository.list(query({ take: 1 }));

            expect(page.total).toBe(2);
            expect(page.items.map(item => item.id)).toEqual([newer.id]);
            expect(await names({ search: `zz-${tag}@LAHAP` })).toEqual([newer.name]);
            expect(await names({ search: older.phone.slice(2) })).toEqual([older.name]);
        });

        it("finds a phone by its local form through phoneSearch", async () => {
            const created = await create({ name: `Zz List ${tag} Phone` });
            const local = `0${created.phone.slice(2)}`;

            expect(await names({ search: local, phoneSearch: `62${local.slice(1)}` })).toEqual([created.name]);
            expect(await names({ search: local })).toEqual([]);
        });

        it("matches % and _ literally", async () => {
            await create({ name: `Zz List ${tag} 50% off` });
            await create({ name: `Zz List ${tag} 50x off` });

            expect(await names({ search: `${tag} 50%` })).toEqual([`Zz List ${tag} 50% off`]);
            expect(await names({ search: `${tag} 50_` })).toEqual([]);
        });

        it("filters by several roles and by active state", async () => {
            await create({ name: `Zz List ${tag} Kitchen`, role: "KITCHEN" });
            await create({ name: `Zz List ${tag} Courier`, role: "COURIER", isActive: false });
            await create({ name: `Zz List ${tag} Customer` });

            expect((await names({ roles: ["KITCHEN", "COURIER"] })).sort()).toEqual([
                `Zz List ${tag} Courier`,
                `Zz List ${tag} Kitchen`,
            ]);
            expect(await names({ roles: ["COURIER"], isActive: true })).toEqual([]);
        });

        it("filters churned customers by the given user ids, counting customers only", async () => {
            const churned = await create({ name: `Zz List ${tag} Churned` });
            const recent = await create({ name: `Zz List ${tag} Recent` });
            const staff = await create({ name: `Zz List ${tag} Staff`, role: "KITCHEN" });
            const userIds = [churned.id, staff.id];

            expect(await names({ churned: { userIds, isChurned: true } })).toEqual([churned.name]);
            expect((await names({ churned: { userIds, isChurned: false } })).sort()).toEqual(
                [recent.name, staff.name].sort(),
            );
            expect(await names({ churned: { userIds: [], isChurned: true } })).toEqual([]);
            expect(await names({ churned: { userIds: [], isChurned: false } })).toHaveLength(3);
        });

        it("returns each user's allergy ids", async () => {
            const created = await create({ name: `Zz List ${tag} Allergic`, allergyIds });

            const [item] = (await repository.list(query({ search: created.name }))).items;

            expect([...(item?.allergyIds ?? [])].sort()).toEqual([...allergyIds].sort());
        });
    });
});
