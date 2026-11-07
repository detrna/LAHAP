import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestSchedule } from "../../../../../tests/utils/fixtures/schedules.js";
import { createTestSlots } from "../../../../../tests/utils/fixtures/slots.js";
import { createTestSubscription } from "../../../../../tests/utils/fixtures/subscriptions.js";
import { createTestUser } from "../../../../../tests/utils/fixtures/users.js";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import {
    AllergyAlreadyExistsError,
    PackageInUseError,
    type NewPackageRecord,
    type PackageRecord,
} from "../../service/interfaces/catalog.repository.js";
import { PrismaCatalogRepository } from "./catalog-repository.js";

const time = (value: string) => Temporal.PlainTime.from(value);
const at = (value: string) => Temporal.PlainDateTime.from(value);
const asText = (values: readonly Temporal.PlainTime[]) =>
    values.map(value => value.toString({ smallestUnit: "minute" }));

describe("PrismaCatalogRepository (integration)", () => {
    let db: Db;
    let repository: PrismaCatalogRepository;
    let rows: CreatedRows;
    const tag = randomUUID().slice(0, 8);
    const allergyIds: string[] = [];

    const newPackage = (name: string, overrides: Partial<NewPackageRecord> = {}): NewPackageRecord => ({
        name: `Zz Pkg ${tag} ${name}`,
        description: "integration package",
        basePrice: 20000,
        periods: ["Harian", "Mingguan"],
        deliveryTimes: [time("07:00"), time("12:00"), time("18:30")],
        deliveryFreeRadius: null,
        deliveryMaxDistance: null,
        deliveryPricePerKm: null,
        photoKey: "packages/2026/11/integration.webp",
        startAt: at("2026-01-01T00:00:00"),
        endAt: null,
        isActive: true,
        ...overrides,
    });

    const createPackage = async (name: string, overrides: Partial<NewPackageRecord> = {}): Promise<PackageRecord> => {
        const created = await repository.createPackage(newPackage(name, overrides));
        rows.track("Package", created.id);
        return created;
    };

    const createSchedule = (packageId: string, date: string, deliveryTime: string): Promise<string> =>
        createTestSchedule(db, rows, { packageId, date, deliveryTime });

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaCatalogRepository(db);
        rows = trackCreated(db);
        for (const name of [`Zz Allergy ${tag} B`, `Zz Allergy ${tag} A`]) {
            const allergy = await db.orm.public.Allergy.create({ name });
            allergyIds.push(rows.track("Allergy", allergy.id));
        }
    });

    afterAll(async () => {
        await rows?.cleanup();
        await db?.close();
    });

    describe("allergies", () => {
        it("lists only the allergy ids that do not exist", async () => {
            const unknown = randomUUID();

            expect(await repository.findMissingAllergyIds([...allergyIds, unknown])).toEqual([unknown]);
            expect(await repository.findMissingAllergyIds([])).toEqual([]);
        });

        it("reads allergies by id, sorted by name, ignoring unknown ids", async () => {
            const found = await repository.findAllergiesByIds([...allergyIds, randomUUID()]);

            expect(found.map(allergy => allergy.name)).toEqual([`Zz Allergy ${tag} A`, `Zz Allergy ${tag} B`]);
            expect(found[0]?.createdAt).toBeInstanceOf(Temporal.PlainDateTime);
            expect(await repository.findAllergiesByIds([])).toEqual([]);
        });

        it("lists every allergy sorted by name", async () => {
            const names = (await repository.findAllAllergies()).map(allergy => allergy.name);

            expect(names.indexOf(`Zz Allergy ${tag} A`)).toBeGreaterThanOrEqual(0);
            expect(names.indexOf(`Zz Allergy ${tag} A`)).toBeLessThan(names.indexOf(`Zz Allergy ${tag} B`));
        });

        it("pages a search by name, counting every match", async () => {
            const first = await repository.listAllergies({ search: `allergy ${tag}`, skip: 0, take: 1 });
            const second = await repository.listAllergies({ search: `allergy ${tag}`, skip: 1, take: 1 });

            expect(first.total).toBe(2);
            expect(first.items.map(allergy => allergy.name)).toEqual([`Zz Allergy ${tag} A`]);
            expect(second.items.map(allergy => allergy.name)).toEqual([`Zz Allergy ${tag} B`]);
        });

        it("matches % and _ in a search literally", async () => {
            expect((await repository.listAllergies({ search: `${tag}%`, skip: 0, take: 10 })).total).toBe(0);
        });

        it("finds an allergy by id, and null for an unknown one", async () => {
            expect((await repository.findAllergyById(allergyIds[0] ?? ""))?.name).toBe(`Zz Allergy ${tag} B`);
            expect(await repository.findAllergyById(randomUUID())).toBeNull();
        });

        it("creates, renames and deletes an allergy", async () => {
            const created = await repository.createAllergy(`Zz Allergy ${tag} C`);
            rows.track("Allergy", created.id);
            expect(created.createdAt).toBeInstanceOf(Temporal.PlainDateTime);

            const renamed = await repository.updateAllergy(created.id, `Zz Allergy ${tag} D`);
            expect(renamed).toMatchObject({ id: created.id, name: `Zz Allergy ${tag} D` });

            expect(await repository.deleteAllergy(created.id)).toBe(true);
            expect(await repository.findAllergyById(created.id)).toBeNull();
            expect(await repository.deleteAllergy(created.id)).toBe(false);
        });

        it("maps a duplicate name to AllergyAlreadyExistsError on create and update", async () => {
            await expect(repository.createAllergy(`Zz Allergy ${tag} A`)).rejects.toBeInstanceOf(
                AllergyAlreadyExistsError,
            );
            await expect(repository.updateAllergy(allergyIds[0] ?? "", `Zz Allergy ${tag} A`)).rejects.toBeInstanceOf(
                AllergyAlreadyExistsError,
            );
        });

        it("returns null when renaming an unknown allergy", async () => {
            expect(await repository.updateAllergy(randomUUID(), `Zz Allergy ${tag} E`)).toBeNull();
        });
    });

    describe("packages", () => {
        it("creates a package and reads it back with meal times, periods, numerics and timestamps", async () => {
            const created = await createPackage("Roundtrip", {
                basePrice: 17500.5,
                deliveryFreeRadius: 2.5,
                deliveryMaxDistance: 12,
                deliveryPricePerKm: 2500,
                endAt: at("2027-01-01T00:00:00"),
            });

            expect(created).toMatchObject({
                description: "integration package",
                basePrice: 17500.5,
                periods: ["Harian", "Mingguan"],
                deliveryFreeRadius: 2.5,
                deliveryMaxDistance: 12,
                deliveryPricePerKm: 2500,
                photoKey: "packages/2026/11/integration.webp",
                isActive: true,
            });
            expect(asText(created.deliveryTimes)).toEqual(["07:00", "12:00", "18:30"]);
            expect(created.startAt.toString()).toBe("2026-01-01T00:00:00");
            expect(created.endAt?.toString()).toBe("2027-01-01T00:00:00");
            expect(created.createdAt).toBeInstanceOf(Temporal.PlainDateTime);
            expect(await repository.findPackageById(created.id)).toEqual(created);
        });

        it("keeps null delivery overrides and no end as null", async () => {
            const created = await createPackage("Nulls");

            expect(created).toMatchObject({
                deliveryFreeRadius: null,
                deliveryMaxDistance: null,
                deliveryPricePerKm: null,
                endAt: null,
            });
        });

        it("returns null for an unknown package id", async () => {
            expect(await repository.findPackageById(randomUUID())).toBeNull();
        });

        it("reads packages by id and lists the ids that do not exist", async () => {
            const a = await createPackage("ByIds B");
            const b = await createPackage("ByIds A");
            const unknown = randomUUID();

            expect((await repository.findPackagesByIds([a.id, b.id, unknown])).map(item => item.name)).toEqual([
                `Zz Pkg ${tag} ByIds A`,
                `Zz Pkg ${tag} ByIds B`,
            ]);
            expect(await repository.findMissingPackageIds([a.id, unknown])).toEqual([unknown]);
            expect(await repository.findPackagesByIds([])).toEqual([]);
            expect(await repository.findMissingPackageIds([])).toEqual([]);
        });

        describe("listing", () => {
            const now = at("2026-11-03T01:00:00");
            const ids: Record<string, string> = {};

            beforeAll(async () => {
                ids.running = (await createPackage("List running")).id;
                ids.switchedOff = (await createPackage("List off", { isActive: false })).id;
                ids.notStarted = (await createPackage("List future", { startAt: at("2026-12-01T00:00:00") })).id;
                ids.ended = (await createPackage("List ended", { endAt: at("2026-11-03T01:00:00") })).id;
                ids.endsLater = (await createPackage("List ends later", { endAt: at("2026-11-03T01:00:01") })).id;
            });

            const listed = async (query: Partial<Parameters<PrismaCatalogRepository["listPackages"]>[0]> = {}) =>
                repository.listPackages({ search: `Pkg ${tag} List`, skip: 0, take: 50, ...query });

            it("lists every match for a search, newest first, with the total", async () => {
                const page = await listed();

                expect(page.total).toBe(5);
                expect(page.items.map(item => item.id)).toHaveLength(5);
                const created = page.items.map(item => item.createdAt.toString());
                expect(created).toEqual([...created].sort().reverse());
            });

            it("filters by the manual switch", async () => {
                expect((await listed({ isActive: false })).items.map(item => item.id)).toEqual([ids.switchedOff]);
                expect((await listed({ isActive: true })).total).toBe(4);
            });

            it("keeps only packages available at a moment: on, started, and not yet ended", async () => {
                const page = await listed({ availableAt: now });

                expect(page.items.map(item => item.id).sort()).toEqual([ids.running, ids.endsLater].sort());
                expect(page.total).toBe(2);
            });

            it("finds every package available at a moment, unpaged", async () => {
                const ours = new Set(Object.values(ids));

                const found = await repository.findAvailablePackages(now);

                const foundIds = found.map(item => item.id).filter(id => ours.has(id));
                expect(foundIds.sort()).toEqual([ids.running, ids.endsLater].sort());
                expect(found.every(item => item.isActive)).toBe(true);
            });

            it("pages the results", async () => {
                const first = await listed({ skip: 0, take: 2 });
                const last = await listed({ skip: 4, take: 2 });

                expect(first.items).toHaveLength(2);
                expect(last.items).toHaveLength(1);
                expect(first.total).toBe(5);
            });
        });

        it("updates the given fields only and returns the new row", async () => {
            const created = await createPackage("Update");

            const updated = await repository.updatePackage(created.id, {
                name: `Zz Pkg ${tag} Updated`,
                basePrice: 25000,
                periods: ["Bulanan"],
                deliveryTimes: [time("08:00")],
                deliveryFreeRadius: 3,
                isActive: false,
                endAt: at("2027-06-01T00:00:00"),
            });

            expect(updated).toMatchObject({
                id: created.id,
                name: `Zz Pkg ${tag} Updated`,
                description: "integration package",
                basePrice: 25000,
                periods: ["Bulanan"],
                deliveryFreeRadius: 3,
                isActive: false,
            });
            expect(asText(updated?.deliveryTimes ?? [])).toEqual(["08:00"]);
            expect(updated?.endAt?.toString()).toBe("2027-06-01T00:00:00");
            expect(updated?.updatedAt.toString()).not.toBe(created.updatedAt.toString());
        });

        it("clears a delivery override and the end with null", async () => {
            const created = await createPackage("Clear", { deliveryFreeRadius: 3, endAt: at("2027-01-01T00:00:00") });

            const updated = await repository.updatePackage(created.id, { deliveryFreeRadius: null, endAt: null });

            expect(updated).toMatchObject({ deliveryFreeRadius: null, endAt: null });
        });

        it("returns the unchanged package for an empty change, and null for an unknown id", async () => {
            const created = await createPackage("Empty change");

            expect(await repository.updatePackage(created.id, {})).toEqual(created);
            expect(await repository.updatePackage(randomUUID(), { name: "x" })).toBeNull();
        });

        describe("dropping meal times", () => {
            const removed = (...times: string[]) => ({
                times: times.map(time),
                from: Temporal.PlainDate.from("2026-11-10"),
            });

            it("finds the schedules at the dropped times from the start date on", async () => {
                const created = await createPackage("Find schedules");
                const past = await createSchedule(created.id, "2026-11-09", "18:30");
                const startDay = await createSchedule(created.id, "2026-11-10", "18:30");
                const future = await createSchedule(created.id, "2026-11-20", "18:30");
                await createSchedule(created.id, "2026-11-20", "07:00");

                const found = await repository.findScheduleIdsAtTimes(created.id, removed("18:30"));

                expect([...found].sort()).toEqual([startDay, future].sort());
                expect(found).not.toContain(past);
                expect(await repository.findScheduleIdsAtTimes(created.id, removed())).toEqual([]);
            });

            it("only looks at the given package", async () => {
                const mine = await createPackage("Mine");
                const other = await createPackage("Other");
                await createSchedule(other.id, "2026-11-20", "18:30");

                expect(await repository.findScheduleIdsAtTimes(mine.id, removed("18:30"))).toEqual([]);
            });

            it("deletes those schedules together with the package update, leaving past and other times", async () => {
                const created = await createPackage("Delete schedules");
                const past = await createSchedule(created.id, "2026-11-09", "18:30");
                const gone = await createSchedule(created.id, "2026-11-20", "18:30");
                const kept = await createSchedule(created.id, "2026-11-20", "07:00");

                const updated = await repository.updatePackage(
                    created.id,
                    { deliveryTimes: [time("07:00"), time("12:00")] },
                    { deleteSchedulesAt: removed("18:30") },
                );

                expect(asText(updated?.deliveryTimes ?? [])).toEqual(["07:00", "12:00"]);
                const remaining = (
                    await db.orm.public.Schedule.where({ packageId: created.id }).select("id").all()
                ).map(schedule => schedule.id);
                expect(remaining.sort()).toEqual([past, kept].sort());
                expect(remaining).not.toContain(gone);
            });

            it("changes nothing and answers 422 when an order still holds a schedule at the dropped time", async () => {
                const created = await createPackage("Held schedule");
                const held = await createSchedule(created.id, "2026-11-20", "18:30");
                const userId = await createTestUser(db, rows);
                await createTestSlots(db, rows, {
                    userId,
                    packageId: created.id,
                    status: "Dibatalkan",
                    slots: [{ scheduleId: held }],
                });

                await expect(
                    repository.updatePackage(
                        created.id,
                        { name: `Zz Pkg ${tag} Should not apply`, deliveryTimes: [time("07:00")] },
                        { deleteSchedulesAt: removed("18:30") },
                    ),
                ).rejects.toBeInstanceOf(InvalidStateError);

                expect(await repository.findPackageById(created.id)).toEqual(created);
                expect(await db.orm.public.Schedule.where({ id: held }).first()).not.toBeNull();
            });
        });

        it("deletes a package with its schedules, and reports false for an unknown id", async () => {
            const created = await createPackage("Delete");
            const scheduleId = await createSchedule(created.id, "2026-11-20", "07:00");

            expect(await repository.deletePackage(created.id)).toBe(true);
            expect(await repository.findPackageById(created.id)).toBeNull();
            expect(await db.orm.public.Schedule.where({ id: scheduleId }).first()).toBeNull();
            expect(await repository.deletePackage(created.id)).toBe(false);
        });

        it("refuses to delete a package that subscriptions reference", async () => {
            const created = await createPackage("In use");
            const userId = await createTestUser(db, rows);
            await createTestSubscription(db, rows, {
                userId,
                packageId: created.id,
                status: "Success",
                startDate: Temporal.PlainDate.from("2026-11-20"),
                endDate: Temporal.PlainDate.from("2026-11-20"),
            });

            await expect(repository.deletePackage(created.id)).rejects.toBeInstanceOf(PackageInUseError);
            expect(await repository.findPackageById(created.id)).not.toBeNull();
        });
    });
});
