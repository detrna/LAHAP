import type { RetentionService } from "../service/retention.service.js";
import { buildFollowUp } from "./build-follow-up.js";
import { createMessageTemplate } from "./create-message-template.js";
import { deleteMessageTemplate } from "./delete-message-template.js";
import { getMessageTemplate } from "./get-message-template.js";
import { listChurnedCustomers } from "./list-churned-customers.js";
import { listMessageTemplates } from "./list-message-templates.js";
import { updateMessageTemplate } from "./update-message-template.js";

export class RetentionController {
    constructor(readonly retentionService: RetentionService) {}

    listMessageTemplates = listMessageTemplates.bind(this);
    getMessageTemplate = getMessageTemplate.bind(this);
    createMessageTemplate = createMessageTemplate.bind(this);
    updateMessageTemplate = updateMessageTemplate.bind(this);
    deleteMessageTemplate = deleteMessageTemplate.bind(this);
    listChurnedCustomers = listChurnedCustomers.bind(this);
    buildFollowUp = buildFollowUp.bind(this);
}
