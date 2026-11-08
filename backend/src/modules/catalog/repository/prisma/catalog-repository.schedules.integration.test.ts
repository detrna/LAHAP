import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestSchedule } from "../../../../../tests/utils/fixtures/schedules.js";
import { createTestSlots } from "../../../../../tests/utils/fixtures/slots.js";
import { createTestUser } from "../../../../../tests/utils/fixtures/users.js";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import {
    MenuScheduleNotFoundError,
    ScheduleAlreadyExistsError,
    ScheduleInUseError,
    UnknownMenuError,
    type NewScheduleRecord,
    type PackageRecord,
    type ScheduleRecord,
} from "../../service/interfaces/catalog.repository.js";
import { PrismaCatalogRepository } from "./catalog-repository.js";

const date = (value: string) => Temporal.PlainDate.from(value);
const time = (value: string) => Temporal.PlainTime.from(value);

describe("PrismaCatalogRepository schedules (integration)", () => {
    let db: Db;
    let repository: PrismaCatalogRepository;
    let rows: CreatedRows;
    let pkg: PackageRecord;
    let primaryId: string;
    let alternativeId: string;
    let otherMenuId: string;
    const tag = randomUUID().slice(0, 8);

    const newSchedule = (day: string, overrides: Partial<NewScheduleRecord> = {}): NewScheduleRecord => ({
        packageId: pkg.id,
        date: date(day),
        deliveryTime: time("07:00"),
        primaryMenuId: primaryId,
        alternativeMenuId: null,
        isPublished: false,
        ...overrides,
    });

    const createSchedules = async (...records: NewScheduleRecord[]): Promise<readonly ScheduleRecord[]> => {
        const created = await repository.createSchedules(records);
        for (const schedule of created) rows.track("Schedule", schedule.id);
        return created;
    };

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaCatalogRepository(db);
        rows = trackCreated(db);
        pkg = await repository.createPackage({
            name: `Zz Pkg ${tag} Schedules`,
            description: "integration package",
            basePrice: 20000,
            periods: ["Harian"],
            deliveryTimes: [time("07:00"), time("12:00"), time("18:30")],
            deliveryFreeRadius: null,
            deliveryMaxDistance: null,
            deliveryPricePerKm: null,
            photoKey: "packages/2026/11/integration.webp",
            startAt: Temporal.PlainDateTime.from("2026-01-01T00:00:00"),
            endAt: null,
            isActive: true,
        });
        rows.track("Package", pkg.id);
        const ingredient = await db.orm.public.Ingredient.create({
            name: `Zz Ingredient ${tag}`,
            unit: "kg",
            photoKey: "ingredients/2026/11/integration.webp",
        });
        rows.track("Ingredient", ingredient.id);
        const ids: string[] = [];
        for (const [name, isAlternative] of [
            ["Primary", false],
            ["Alternative", true],
            ["Other", false],
        ] as const) {
            const menu = await repository.createMenu({
                name: `Zz Menu ${tag} ${name}`,
                description: "integration menu",
                isAlternative,
                tags: [],
                photoKey: "menus/2026/11/integration.webp",
                ingredients: [{ ingredientId: ingredient.id, quantityPerPortion: 1 }],
                components: [],
            });
            ids.push(rows.track("Menu", menu.id));
        }
        [primaryId = "", alternativeId = "", otherMenuId = ""] = ids;
    });

    afterAll(async () => {
        await rows?.cleanup();
        await db?.close();
    });

    it("creates schedules with their primary and alternative menus, in input order", async () => {
        const created = await createSchedules(
            newSchedule("2030-02-02", { alternativeMenuId: alternativeId, isPublished: true }),
            newSchedule("2030-02-01", { deliveryTime: time("12:00") }),
        );

        expect(created.map(schedule => schedule.date.toString())).toEqual(["2030-02-02", "2030-02-01"]);
        expect(created[0]).toMatchObject({
            packageId: pkg.id,
            primaryMenuId: primaryId,
            alternativeMenuId: alternativeId,
            isPublished: true,
        });
        expect(created[1]?.alternativeMenuId).toBeNull();
        expect(await repository.findScheduleById(created[0]?.id ?? "")).toEqual(created[0]);
    });

    it("rolls the batch back on a duplicate slot", async () => {
        await createSchedules(newSchedule("2030-03-01"));

        const error = await repository
            .createSchedules([newSchedule("2030-03-02"), newSchedule("2030-03-01")])
            .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(ScheduleAlreadyExistsError);
        expect(
            await repository.findSchedules({ packageId: pkg.id, from: date("2030-03-02"), to: date("2030-03-02") }),
        ).toEqual([]);
    });

    it("maps a missing menu to UnknownMenuError", async () => {
        const error = await repository
            .createSchedules([newSchedule("2030-03-05", { primaryMenuId: randomUUID() })])
            .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(UnknownMenuError);
    });

    it("finds and lists schedules with filters, ordered by date and time", async () => {
        const [late, early, other] = await createSchedules(
            newSchedule("2030-04-02", { isPublished: true }),
            newSchedule("2030-04-01", { deliveryTime: time("18:30"), isPublished: true }),
            newSchedule("2030-04-01", { deliveryTime: time("07:00") }),
        );
        const range = { packageId: pkg.id, from: date("2030-04-01"), to: date("2030-04-02") };

        expect((await repository.findSchedules(range)).map(item => item.id)).toEqual([other?.id, early?.id, late?.id]);
        expect((await repository.findSchedules({ ...range, isPublished: true })).map(item => item.id)).toEqual([
            early?.id,
            late?.id,
        ]);
        expect(
            (await repository.findSchedules({ ...range, deliveryTime: time("18:30") })).map(item => item.id),
        ).toEqual([early?.id]);
        expect((await repository.findSchedules({ ids: [late?.id ?? ""] })).map(item => item.id)).toEqual([late?.id]);
        expect(await repository.findSchedules({ ids: [] })).toEqual([]);

        const page = await repository.listSchedules({ ...range, skip: 1, take: 1 });
        expect(page.total).toBe(3);
        expect(page.items.map(item => item.id)).toEqual([early?.id]);
    });

    it("lists the schedule ids that do not exist", async () => {
        const [schedule] = await createSchedules(newSchedule("2030-04-10"));
        const unknown = randomUUID();

        expect(await repository.findMissingScheduleIds([schedule?.id ?? "", unknown])).toEqual([unknown]);
    });

    describe("updates", () => {
        it("moves a schedule and swaps its menus", async () => {
            const [schedule] = await createSchedules(newSchedule("2030-05-01", { alternativeMenuId: alternativeId }));

            const [updated] = await repository.updateSchedules([
                {
                    id: schedule?.id ?? "",
                    changes: {
                        date: date("2030-05-03"),
                        deliveryTime: time("12:00"),
                        primaryMenuId: otherMenuId,
                        isPublished: true,
                    },
                },
            ]);

            expect(updated).toMatchObject({
                primaryMenuId: otherMenuId,
                alternativeMenuId: alternativeId,
                isPublished: true,
            });
            expect(updated?.date.toString()).toBe("2030-05-03");
            expect(updated?.deliveryTime.toString({ smallestUnit: "minute" })).toBe("12:00");
        });

        it("removes the alternative and swaps primary and alternative in one change", async () => {
            const [first, second] = await createSchedules(
                newSchedule("2030-05-10", { alternativeMenuId: alternativeId }),
                newSchedule("2030-05-11", { alternativeMenuId: alternativeId }),
            );

            const updated = await repository.updateSchedules([
                { id: first?.id ?? "", changes: { alternativeMenuId: null } },
                { id: second?.id ?? "", changes: { primaryMenuId: alternativeId, alternativeMenuId: primaryId } },
            ]);

            expect(updated[0]).toMatchObject({ primaryMenuId: primaryId, alternativeMenuId: null });
            expect(updated[1]).toMatchObject({ primaryMenuId: alternativeId, alternativeMenuId: primaryId });
        });

        it("throws MenuScheduleNotFoundError and rolls back", async () => {
            const [schedule] = await createSchedules(newSchedule("2030-05-20"));

            await expect(
                repository.updateSchedules([
                    { id: schedule?.id ?? "", changes: { isPublished: true } },
                    { id: randomUUID(), changes: { isPublished: true } },
                ]),
            ).rejects.toBeInstanceOf(MenuScheduleNotFoundError);
            expect((await repository.findScheduleById(schedule?.id ?? ""))?.isPublished).toBe(false);
        });

        it("maps a move onto a taken slot to ScheduleAlreadyExistsError", async () => {
            const [taken, moving] = await createSchedules(newSchedule("2030-05-25"), newSchedule("2030-05-26"));

            await expect(
                repository.updateSchedules([{ id: moving?.id ?? "", changes: { date: taken?.date } }]),
            ).rejects.toBeInstanceOf(ScheduleAlreadyExistsError);
        });
    });

    describe("publishing", () => {
        it("publishes by id and by range, skipping schedules without a primary menu", async () => {
            const [first, second] = await createSchedules(newSchedule("2030-06-01"), newSchedule("2030-06-02"));
            const bare = await createTestSchedule(db, rows, { packageId: pkg.id, date: "2030-06-03" });

            expect(await repository.setSchedulesPublished({ ids: [first?.id ?? ""] }, true)).toBe(1);
            expect(
                await repository.setSchedulesPublished(
                    { packageId: pkg.id, from: date("2030-06-01"), to: date("2030-06-03") },
                    true,
                ),
            ).toBe(2);
            expect((await repository.findScheduleById(second?.id ?? ""))?.isPublished).toBe(true);
            expect((await repository.findScheduleById(bare))?.isPublished).toBe(false);

            expect(
                await repository.setSchedulesPublished(
                    { packageId: pkg.id, from: date("2030-06-01"), to: date("2030-06-03") },
                    false,
                ),
            ).toBe(3);
            expect(await repository.setSchedulesPublished({ ids: [] }, true)).toBe(0);
        });
    });

    describe("deleting", () => {
        it("deletes schedules with their menu links", async () => {
            const created = await repository.createSchedules([
                newSchedule("2030-07-01", { alternativeMenuId: alternativeId }),
                newSchedule("2030-07-02"),
            ]);
            const ids = created.map(schedule => schedule.id);

            expect(await repository.deleteSchedules(ids)).toBe(2);
            expect(await db.orm.public.ScheduleMenu.where({ scheduleId: ids[0] ?? "" }).first()).toBeNull();
        });

        it("refuses to delete a schedule that has slots", async () => {
            const [schedule] = await createSchedules(newSchedule("2030-07-10"));
            const userId = await createTestUser(db, rows);
            await createTestSlots(db, rows, {
                userId,
                packageId: pkg.id,
                status: "Expire",
                slots: [{ scheduleId: schedule?.id ?? "" }],
            });

            await expect(repository.deleteSchedules([schedule?.id ?? ""])).rejects.toBeInstanceOf(ScheduleInUseError);
        });
    });

    describe("renaming a package meal time", () => {
        it("moves the package's schedules from the given date on", async () => {
            const [past, future] = await createSchedules(
                newSchedule("2030-08-01", { deliveryTime: time("12:00") }),
                newSchedule("2030-08-05", { deliveryTime: time("12:00") }),
            );

            await repository.updatePackage(
                pkg.id,
                { deliveryTimes: [time("07:00"), time("12:30"), time("18:30")] },
                {
                    moveSchedulesAt: {
                        changes: [{ from: time("12:00"), to: time("12:30") }],
                        from: date("2030-08-02"),
                    },
                },
            );

            const read = (id: string | undefined) =>
                repository
                    .findScheduleById(id ?? "")
                    .then(schedule => schedule?.deliveryTime.toString({ smallestUnit: "minute" }));
            expect(await read(past?.id)).toBe("12:00");
            expect(await read(future?.id)).toBe("12:30");

            await repository.updatePackage(pkg.id, { deliveryTimes: [time("07:00"), time("12:00"), time("18:30")] });
        });

        it("maps a collision at the new time to ScheduleAlreadyExistsError and rolls back", async () => {
            await createSchedules(
                newSchedule("2030-08-10", { deliveryTime: time("12:00") }),
                newSchedule("2030-08-10", { deliveryTime: time("18:30") }),
            );

            await expect(
                repository.updatePackage(
                    pkg.id,
                    { deliveryTimes: [time("07:00"), time("18:30")] },
                    {
                        moveSchedulesAt: {
                            changes: [{ from: time("12:00"), to: time("18:30") }],
                            from: date("2030-08-10"),
                        },
                    },
                ),
            ).rejects.toBeInstanceOf(ScheduleAlreadyExistsError);
            expect((await repository.findPackageById(pkg.id))?.deliveryTimes).toHaveLength(3);
        });
    });
});
