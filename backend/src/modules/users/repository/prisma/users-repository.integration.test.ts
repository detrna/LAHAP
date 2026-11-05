import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { withOtherAdminsInactive } from "../../../../../tests/utils/fixtures/admins.js";
import { createTestPackage, createTestSubscription } from "../../../../../tests/utils/fixtures/subscriptions.js";
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

    it("updates only the given columns and keeps the allergies when allergyIds is not sent", async () => {
        const created = await create({ allergyIds: [allergyIds[0] ?? ""] });

        const updated = await repository.update(created.id, { name: "Renamed", latitude: null, longitude: null });

        expect(updated).toMatchObject({ name: "Renamed", latitude: null, longitude: null, phone: created.phone });
        expect(updated?.allergies.map(allergy => allergy.id)).toEqual([allergyIds[0]]);
        expect(updated?.updatedAt).not.toEqual(created.updatedAt);
    });

    it("replaces or clears the allergy set, also without column changes", async () => {
        const created = await create({ allergyIds: [allergyIds[0] ?? ""] });

        const replaced = await repository.update(created.id, {}, { allergyIds: [allergyIds[1] ?? ""] });
        const cleared = await repository.update(created.id, {}, { allergyIds: [] });

        expect(replaced?.allergies.map(allergy => allergy.id)).toEqual([allergyIds[1]]);
        expect(cleared?.allergies).toEqual([]);
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
            churnCutoff: Temporal.PlainDate.from("2026-11-06"),
            skip: 0,
            take: 50,
            ...overrides,
        });
        const names = async (overrides: Partial<UserListQuery> = {}) =>
            (await repository.list(query(overrides))).items.map(item => item.user.name);

        it("searches name, email and phone, newest first, with the total", async () => {
            const older = await create({ name: `Zz List ${tag} Older` });
            const newer = await create({ name: `Zz List ${tag} Newer`, email: `zz-${tag}@lahap.test` });

            const page = await repository.list(query({ take: 1 }));

            expect(page.total).toBe(2);
            expect(page.items.map(item => item.user.id)).toEqual([newer.id]);
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

        it("filters churned customers and reports each user's last successful end date", async () => {
            const packageId = await createTestPackage(db, rows);
            const churned = await create({ name: `Zz List ${tag} Churned` });
            const recent = await create({ name: `Zz List ${tag} Recent` });
            const pendingOnly = await create({ name: `Zz List ${tag} Pending` });
            const subscription = (userId: string, endDate: string, status: "Success" | "Pending" = "Success") =>
                createTestSubscription(db, rows, {
                    userId,
                    packageId,
                    status,
                    startDate: Temporal.PlainDate.from(endDate).subtract({ days: 5 }),
                    endDate: Temporal.PlainDate.from(endDate),
                });
            await subscription(churned.id, "2026-10-01");
            await subscription(churned.id, "2026-11-05");
            await subscription(churned.id, "2026-12-01", "Pending");
            await subscription(recent.id, "2026-11-06");
            await subscription(pendingOnly.id, "2026-10-01", "Pending");

            const all = await repository.list(query());

            expect(await names({ isChurned: true })).toEqual([churned.name]);
            expect((await names({ isChurned: false })).sort()).toEqual([pendingOnly.name, recent.name].sort());
            expect(all.items.find(item => item.user.id === churned.id)?.lastSuccessEndDate?.toString()).toBe(
                "2026-11-05",
            );
            expect(all.items.find(item => item.user.id === pendingOnly.id)?.lastSuccessEndDate).toBeNull();
            expect((await repository.findLastSuccessEndDate(churned.id))?.toString()).toBe("2026-11-05");
            expect(await repository.findLastSuccessEndDate(pendingOnly.id)).toBeNull();
        });
    });

    describe("findMembership", () => {
        it("reads the membership with its tier, active or expired", async () => {
            const user = await create();
            const tier = await db.orm.public.Tier.create({
                name: `Zz Tier ${randomUUID().slice(0, 8)}`,
                requiredSubscriptionDays: 100000 + Math.floor(Math.random() * 1e6),
                durationDays: 30,
                discountPercent: "12.50",
            });
            rows.track("Tier", tier.id);
            const membership = await db.orm.public.Membership.create({
                userId: user.id,
                tierId: tier.id,
                startedAt: Temporal.PlainDateTime.from("2026-01-01T00:00:00"),
                expiresAt: Temporal.PlainDateTime.from("2026-01-31T00:00:00"),
            });
            rows.track("Membership", membership.id);

            expect(await repository.findMembership(user.id)).toMatchObject({
                tierId: tier.id,
                tier: { id: tier.id, discountPercent: 12.5, durationDays: 30, photoKey: null },
                expiresAt: Temporal.PlainDateTime.from("2026-01-31T00:00:00"),
            });
            expect(await repository.findMembership(randomUUID())).toBeNull();
        });
    });
});
