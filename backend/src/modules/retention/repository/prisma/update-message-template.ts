import type { MessageTemplateChanges, MessageTemplateRecord } from "../../service/interfaces/retention.repository.js";
import { RetentionRepositoryFailureError } from "../../service/interfaces/retention.repository.js";
import type { PrismaRetentionRepository } from "./retention-repository.js";
import { toMessageTemplateRecord } from "./to-message-template-record.js";

export async function updateMessageTemplate(
    this: PrismaRetentionRepository,
    id: string,
    changes: MessageTemplateChanges,
): Promise<MessageTemplateRecord | null> {
    try {
        const columns = {
            ...(changes.name !== undefined ? { name: changes.name } : {}),
            ...(changes.body !== undefined ? { body: changes.body } : {}),
        };
        const target = this.orm.public.MessageTemplate.where({ id });
        const row = Object.keys(columns).length > 0 ? await target.update(columns) : await target.first();
        return row === null ? null : toMessageTemplateRecord(row);
    } catch (cause) {
        throw new RetentionRepositoryFailureError("updateMessageTemplate", cause);
    }
}
