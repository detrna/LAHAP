import type { MessageTemplate } from "../domain/message-template.domain.js";
import type { MessageTemplateListQuery } from "./interfaces/retention.repository.js";
import type { RetentionService } from "./retention.service.js";
import { toMessageTemplate } from "./to-message-template.js";

export type ListMessageTemplatesInput = MessageTemplateListQuery;

export interface MessageTemplatePage {
    readonly items: readonly MessageTemplate[];
    readonly total: number;
}

export async function listMessageTemplates(
    this: RetentionService,
    input: ListMessageTemplatesInput,
): Promise<MessageTemplatePage> {
    const { items, total } = await this.retentionRepository.listMessageTemplates(input);
    return { items: items.map(toMessageTemplate), total };
}
