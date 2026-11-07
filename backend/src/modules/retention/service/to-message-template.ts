import { toIsoTimestamp } from "../../../shared/time/timestamp.js";
import type { MessageTemplate } from "../domain/message-template.domain.js";
import type { MessageTemplateRecord } from "./interfaces/retention.repository.js";

export function toMessageTemplate(record: MessageTemplateRecord): MessageTemplate {
    return {
        id: record.id,
        name: record.name,
        body: record.body,
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
    };
}
