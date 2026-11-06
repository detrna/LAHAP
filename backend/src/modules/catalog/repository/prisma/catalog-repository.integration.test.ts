import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import { PrismaCatalogRepository } from "./catalog-repository.js";

describe("PrismaCatalogRepository (integration)", () => {
    let db: Db;
    let repository: PrismaCatalogRepository;
    let rows: CreatedRows;
    const tag = randomUUID().slice(0, 8);
    const allergyIds: string[] = [];

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
    });
});
