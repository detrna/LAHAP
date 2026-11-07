import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../config/index.js";
import { trackCreated, type CreatedRows } from "../../../../infrastructure/database/prisma/cleanup.js";
import { loadDatabase, type Db } from "../../../../infrastructure/database/prisma/db.js";
import { PrismaRetentionRepository } from "./retention-repository.js";

describe("PrismaRetentionRepository (integration)", () => {
    let db: Db;
    let repository: PrismaRetentionRepository;
    let rows: CreatedRows;
    const tag = randomUUID().slice(0, 8);

    const uniqueName = (label: string) => `Zz ${tag} ${label} ${randomUUID().slice(0, 6)}`;

    async function createTemplate(name = uniqueName("template"), body = "Halo {nama}") {
        const template = await repository.createMessageTemplate({ name, body });
        rows.track("MessageTemplate", template.id);
        return template;
    }

    beforeAll(async () => {
        db = await loadDatabase(loadConfig().DATABASE);
        repository = new PrismaRetentionRepository(db);
        rows = trackCreated(db);
    });

    afterAll(async () => {
        await rows?.cleanup();
        await db?.close();
    });

    it("creates a template and reads it back by id", async () => {
        const name = uniqueName("create");
        const created = await createTemplate(name, "Halo {nama}\nSampai jumpa");

        expect(created).toMatchObject({ name, body: "Halo {nama}\nSampai jumpa" });
        expect(created.createdAt).toBeInstanceOf(Temporal.PlainDateTime);
        expect(await repository.findMessageTemplateById(created.id)).toEqual(created);
        expect(await repository.findMessageTemplateById(randomUUID())).toBeNull();
    });

    it("lists the newest templates first, with the total", async () => {
        const older = await createTemplate();
        const newer = await createTemplate();
        await db.orm.public.MessageTemplate.where({ id: older.id }).update({
            createdAt: Temporal.PlainDateTime.from("2001-01-01T00:00:00"),
        });

        const { items, total } = await repository.listMessageTemplates({ skip: 0, take: 1000 });
        const ids = items.map(item => item.id);

        expect(total).toBeGreaterThanOrEqual(2);
        expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
        expect((await repository.listMessageTemplates({ skip: 0, take: 1 })).items).toHaveLength(1);
    });

    it("finds a name that is taken ignoring case, and can leave one template out", async () => {
        const name = uniqueName("Taken_100%");
        const created = await createTemplate(name);

        expect(await repository.isMessageTemplateNameTaken(name.toUpperCase())).toBe(true);
        expect(await repository.isMessageTemplateNameTaken(name.toLowerCase(), randomUUID())).toBe(true);
        expect(await repository.isMessageTemplateNameTaken(name, created.id)).toBe(false);
        expect(await repository.isMessageTemplateNameTaken(name.replace("_", "x"))).toBe(false);
        expect(await repository.isMessageTemplateNameTaken(name.replace("100%", "1000"))).toBe(false);
    });

    it("updates the given fields and answers null for an unknown id", async () => {
        const created = await createTemplate();

        const renamed = await repository.updateMessageTemplate(created.id, { name: `${created.name} 2` });
        expect(renamed).toMatchObject({ id: created.id, name: `${created.name} 2`, body: created.body });

        const rewritten = await repository.updateMessageTemplate(created.id, { body: "Baru" });
        expect(rewritten).toMatchObject({ name: `${created.name} 2`, body: "Baru" });

        expect(await repository.updateMessageTemplate(created.id, {})).toMatchObject({ body: "Baru" });
        expect(await repository.updateMessageTemplate(randomUUID(), { body: "x" })).toBeNull();
    });

    it("deletes a template once", async () => {
        const created = await createTemplate();

        expect(await repository.deleteMessageTemplate(created.id)).toBe(true);
        expect(await repository.deleteMessageTemplate(created.id)).toBe(false);
        expect(await repository.findMessageTemplateById(created.id)).toBeNull();
    });
});
