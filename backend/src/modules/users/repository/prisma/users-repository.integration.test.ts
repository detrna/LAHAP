import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../config/index.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import type { NewUserRecord } from "../../service/interfaces/users.repository.js";
import { UserAlreadyExistsError } from "../../service/interfaces/users.repository.js";
import { PrismaUsersRepository } from "./users-repository.js";

const randomPhone = () =>
    `62899${Math.floor(Math.random() * 1e8)
        .toString()
        .padStart(8, "0")}`;

describe("PrismaUsersRepository (integration)", () => {
    let db: Db;
    let repository: PrismaUsersRepository;
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
        for (const name of ["Zz Test Allergy B", "Zz Test Allergy A"]) {
            const allergy = await db.orm.public.Allergy.create({ name: `${name} ${randomUUID().slice(0, 8)}` });
            allergyIds.push(allergy.id);
        }
    });

    afterEach(async () => {
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
        expect(created.allergies.map(allergy => allergy.id).sort()).toEqual([...allergyIds].sort());
        expect(created.allergies[0]?.name.startsWith("Zz Test Allergy A")).toBe(true);
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

    it("lists only the allergy ids that do not exist", async () => {
        const unknown = randomUUID();

        expect(await repository.findMissingAllergyIds([...allergyIds, unknown])).toEqual([unknown]);
        expect(await repository.findMissingAllergyIds([])).toEqual([]);
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
});
