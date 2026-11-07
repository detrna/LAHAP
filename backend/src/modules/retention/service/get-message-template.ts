import type { MessageTemplate } from "../domain/message-template.domain.js";
import { MessageTemplateNotFoundError } from "./interfaces/retention.repository.js";
import type { RetentionService } from "./retention.service.js";
import { toMessageTemplate } from "./to-message-template.js";

export async function getMessageTemplate(this: RetentionService, id: string): Promise<MessageTemplate> {
    const record = await this.retentionRepository.findMessageTemplateById(id);
    if (record === null) throw new MessageTemplateNotFoundError(id);
    return toMessageTemplate(record);
}
