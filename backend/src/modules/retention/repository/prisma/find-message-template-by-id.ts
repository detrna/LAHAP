import type { MessageTemplateRecord } from "../../service/interfaces/retention.repository.js";
import { RetentionRepositoryFailureError } from "../../service/interfaces/retention.repository.js";
import type { PrismaRetentionRepository } from "./retention-repository.js";
import { toMessageTemplateRecord } from "./to-message-template-record.js";

export async function findMessageTemplateById(
    this: PrismaRetentionRepository,
    id: string,
): Promise<MessageTemplateRecord | null> {
    try {
        const row = await this.orm.public.MessageTemplate.where({ id }).first();
        return row === null ? null : toMessageTemplateRecord(row);
    } catch (cause) {
        throw new RetentionRepositoryFailureError("findMessageTemplateById", cause);
    }
}
