import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../config/index.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import type { SettingsChanges } from "../../service/interfaces/settings.repository.js";
import { PrismaSettingsRepository } from "./settings-repository.js";

class Rollback extends Error {}

const changes = (overrides: Partial<SettingsChanges> = {}): SettingsChanges => ({
    name: "Zz Integration Kitchen",
    whatsappNumber: "6281200001111",
    address: "Jl. Integrasi No. 1",
    latitude: -7.123456785,
    longitude: 112.987654325,
    deliveryFreeRadius: 2.5,
    deliveryMaxDistance: 12,
    deliveryPricePerKm: 6500.5,
    paymentTimeoutMinutes: 30,
    ...overrides,
});

async function inRolledBackTransaction(
    db: Db,
    run: (repository: PrismaSettingsRepository, tx: Parameters<Parameters<Db["transaction"]>[0]>[0]) => Promise<void>,
): Promise<void> {
    await expect(
        db.transaction(async tx => {
            const nested = { orm: tx.orm, transaction: (callback: (tx: unknown) => unknown) => callback(tx) };
            await run(new PrismaSettingsRepository(nested as unknown as Db), tx);
            throw new Rollback();
        }),
    ).rejects.toBeInstanceOf(Rollback);
}

describe("PrismaSettingsRepository (integration)", () => {
    let db: Db;
    let repository: PrismaSettingsRepository;

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaSettingsRepository(db);
    });

    afterAll(async () => {
        await db?.close();
    });

    it("finds the seeded business row with numbers converted", async () => {
        const record = await repository.find();

        expect(record).toMatchObject({
            name: "Dapur Lahap Malang",
            whatsappNumber: "6281234500000",
            latitude: -7.9406,
            longitude: 112.6219,
            deliveryFreeRadius: 1,
            deliveryMaxDistance: 10,
            deliveryPricePerKm: 5000,
            paymentTimeoutMinutes: 15,
        });
        expect(record?.updatedAt).toBeInstanceOf(Temporal.PlainDateTime);
    });

    it("updates the existing row in place, rounding to the column scales", async () => {
        await inRolledBackTransaction(db, async (rolledBack, tx) => {
            const before = await tx.orm.public.Business.select("id", "updatedAt").all();
            const previous = await rolledBack.find();

            const saved = await rolledBack.save(changes());

            const after = await tx.orm.public.Business.select("id", "updatedAt").all();
            expect(after).toHaveLength(1);
            expect(after[0]?.id).toBe(before[0]?.id);
            expect(saved).toMatchObject({
                name: "Zz Integration Kitchen",
                latitude: -7.12345679,
                longitude: 112.98765433,
                deliveryFreeRadius: 2.5,
                deliveryMaxDistance: 12,
                deliveryPricePerKm: 6500.5,
                paymentTimeoutMinutes: 30,
            });
            expect(previous).not.toBeNull();
            expect(Temporal.PlainDateTime.compare(saved.updatedAt, previous!.updatedAt)).toBe(1);
            expect(await rolledBack.find()).toEqual(saved);
        });
    });

    it("creates the row when the table is empty, then updates that same row", async () => {
        await inRolledBackTransaction(db, async (rolledBack, tx) => {
            await tx.orm.public.Business.where({}).deleteAll();
            expect(await rolledBack.find()).toBeNull();

            const created = await rolledBack.save(changes());
            const updated = await rolledBack.save(changes({ name: "Zz Integration Renamed" }));

            expect(created.name).toBe("Zz Integration Kitchen");
            expect(updated.name).toBe("Zz Integration Renamed");
            expect(await tx.orm.public.Business.select("id").all()).toHaveLength(1);
        });
    });

    it("leaves the seeded row untouched after the rolled-back tests", async () => {
        expect((await repository.find())?.name).toBe("Dapur Lahap Malang");
    });
});
