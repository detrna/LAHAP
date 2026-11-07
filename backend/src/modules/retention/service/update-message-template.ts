import type { MessageTemplate } from "../domain/message-template.domain.js";
import {
    MessageTemplateAlreadyExistsError,
    MessageTemplateNotFoundError,
    type MessageTemplateChanges,
} from "./interfaces/retention.repository.js";
import type { RetentionService } from "./retention.service.js";
import { toMessageTemplate } from "./to-message-template.js";

export type UpdateMessageTemplateInput = MessageTemplateChanges;

export async function updateMessageTemplate(
    this: RetentionService,
    id: string,
    input: UpdateMessageTemplateInput,
): Promise<MessageTemplate> {
    const existing = await this.retentionRepository.findMessageTemplateById(id);
    if (existing === null) throw new MessageTemplateNotFoundError(id);

    if (input.name !== undefined && (await this.retentionRepository.isMessageTemplateNameTaken(input.name, id))) {
        throw new MessageTemplateAlreadyExistsError();
    }

    const record = await this.retentionRepository.updateMessageTemplate(id, input);
    if (record === null) throw new MessageTemplateNotFoundError(id);
    return toMessageTemplate(record);
}
