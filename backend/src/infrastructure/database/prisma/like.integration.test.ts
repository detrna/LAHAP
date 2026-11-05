import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/index.js";
import { trackCreated, type CreatedRows } from "./cleanup.js";
import { loadDatabase, type Db } from "./db.js";
import { toContainsPattern } from "./like.js";

describe("toContainsPattern with ilike (integration)", () => {
    let db: Db;
    let rows: CreatedRows;
    const tag = `Zz Like ${randomUUID().slice(0, 8)}`;

    const search = async (term: string) =>
        (
            await db.orm.public.Allergy.where(allergy => allergy.name.ilike(toContainsPattern(term)))
                .orderBy(allergy => allergy.name.asc())
                .all()
        ).map(allergy => allergy.name);

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        rows = trackCreated(db);
        for (const suffix of ["50%", "50x", "a_b", "axb", "c\\d", "cd"]) {
            rows.track("Allergy", (await db.orm.public.Allergy.create({ name: `${tag} ${suffix}` })).id);
        }
    });

    afterAll(async () => {
        await rows.cleanup();
        await db?.close();
    });

    it("matches a literal % only", async () => {
        expect(await search(`${tag} 50%`)).toEqual([`${tag} 50%`]);
    });

    it("matches a literal _ only", async () => {
        expect(await search(`${tag} a_b`)).toEqual([`${tag} a_b`]);
    });

    it("matches a literal backslash only", async () => {
        expect(await search(`${tag} c\\d`)).toEqual([`${tag} c\\d`]);
    });

    it("matches case-insensitively anywhere in the value", async () => {
        expect(await search(tag.toUpperCase().slice(3))).toHaveLength(6);
    });
});
