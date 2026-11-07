import type { MessageTemplate } from "../domain/message-template.domain.js";
import { MessageTemplateAlreadyExistsError, type NewMessageTemplateRecord } from "./interfaces/retention.repository.js";
import type { RetentionService } from "./retention.service.js";
import { toMessageTemplate } from "./to-message-template.js";

export type CreateMessageTemplateInput = NewMessageTemplateRecord;

export async function createMessageTemplate(
    this: RetentionService,
    input: CreateMessageTemplateInput,
): Promise<MessageTemplate> {
    if (await this.retentionRepository.isMessageTemplateNameTaken(input.name)) {
        throw new MessageTemplateAlreadyExistsError();
    }
    return toMessageTemplate(await this.retentionRepository.createMessageTemplate(input));
}
