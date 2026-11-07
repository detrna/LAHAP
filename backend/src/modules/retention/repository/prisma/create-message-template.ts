import type { MessageTemplateRecord, NewMessageTemplateRecord } from "../../service/interfaces/retention.repository.js";
import { RetentionRepositoryFailureError } from "../../service/interfaces/retention.repository.js";
import type { PrismaRetentionRepository } from "./retention-repository.js";
import { toMessageTemplateRecord } from "./to-message-template-record.js";

export async function createMessageTemplate(
    this: PrismaRetentionRepository,
    record: NewMessageTemplateRecord,
): Promise<MessageTemplateRecord> {
    try {
        return toMessageTemplateRecord(
            await this.orm.public.MessageTemplate.create({ name: record.name, body: record.body }),
        );
    } catch (cause) {
        throw new RetentionRepositoryFailureError("createMessageTemplate", cause);
    }
}
