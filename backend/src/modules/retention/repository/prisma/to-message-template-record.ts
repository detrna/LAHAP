import type { MessageTemplateRecord } from "../../service/interfaces/retention.repository.js";

export interface MessageTemplateRow {
    readonly id: string;
    readonly name: string;
    readonly body: string;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export function toMessageTemplateRecord(row: MessageTemplateRow): MessageTemplateRecord {
    return { id: row.id, name: row.name, body: row.body, createdAt: row.createdAt, updatedAt: row.updatedAt };
}
