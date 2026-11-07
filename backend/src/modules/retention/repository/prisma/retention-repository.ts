import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { RetentionRepository } from "../../service/interfaces/retention.repository.js";
import { createMessageTemplate } from "./create-message-template.js";
import { deleteMessageTemplate } from "./delete-message-template.js";
import { findMessageTemplateById } from "./find-message-template-by-id.js";
import { isMessageTemplateNameTaken } from "./is-message-template-name-taken.js";
import { listMessageTemplates } from "./list-message-templates.js";
import { updateMessageTemplate } from "./update-message-template.js";

export class PrismaRetentionRepository implements RetentionRepository {
    constructor(
        readonly db: Db,
        readonly orm: Db["orm"] = db.orm,
    ) {}

    listMessageTemplates = listMessageTemplates;
    findMessageTemplateById = findMessageTemplateById;
    isMessageTemplateNameTaken = isMessageTemplateNameTaken;
    createMessageTemplate = createMessageTemplate;
    updateMessageTemplate = updateMessageTemplate;
    deleteMessageTemplate = deleteMessageTemplate;
}
