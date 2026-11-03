import type { SeedContext } from "../../seed-context.js";
import { MESSAGE_TEMPLATES } from "./message-templates.data.js";

export async function seedMessageTemplates({ tx, logger }: SeedContext): Promise<number> {
    for (const template of MESSAGE_TEMPLATES) {
        const { id, ...fields } = template;
        await tx.orm.public.MessageTemplate.upsert({ create: template, update: fields });
        logger.info({ id, name: template.name }, "upserted message template");
    }
    return MESSAGE_TEMPLATES.length;
}
