import { MessageTemplateNotFoundError } from "./interfaces/retention.repository.js";
import type { RetentionService } from "./retention.service.js";

export async function deleteMessageTemplate(this: RetentionService, id: string): Promise<void> {
    if (!(await this.retentionRepository.deleteMessageTemplate(id))) throw new MessageTemplateNotFoundError(id);
}
