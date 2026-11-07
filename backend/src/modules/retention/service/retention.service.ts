import type { Clock } from "../../../shared/ports/clock/clock.js";
import { buildFollowUp } from "./build-follow-up.js";
import { createMessageTemplate } from "./create-message-template.js";
import { deleteMessageTemplate } from "./delete-message-template.js";
import { getMessageTemplate } from "./get-message-template.js";
import type { ChurnHistory } from "./interfaces/churn-history.js";
import type { CustomerDirectory } from "./interfaces/customer-directory.js";
import type { PackageNames } from "./interfaces/package-names.js";
import type { RetentionRepository } from "./interfaces/retention.repository.js";
import type { WinBackPromos } from "./interfaces/win-back-promos.js";
import { listChurnedCustomers } from "./list-churned-customers.js";
import { listMessageTemplates } from "./list-message-templates.js";
import { updateMessageTemplate } from "./update-message-template.js";

export interface RetentionServiceDeps {
    readonly churn: ChurnHistory;
    readonly customers: CustomerDirectory;
    readonly packages: PackageNames;
    readonly promos: WinBackPromos;
    readonly clock: Clock;
}

export class RetentionService {
    readonly churn: ChurnHistory;
    readonly customers: CustomerDirectory;
    readonly packages: PackageNames;
    readonly promos: WinBackPromos;
    readonly clock: Clock;

    constructor(
        readonly retentionRepository: RetentionRepository,
        deps: RetentionServiceDeps,
    ) {
        this.churn = deps.churn;
        this.customers = deps.customers;
        this.packages = deps.packages;
        this.promos = deps.promos;
        this.clock = deps.clock;
    }

    listMessageTemplates = listMessageTemplates;
    getMessageTemplate = getMessageTemplate;
    createMessageTemplate = createMessageTemplate;
    updateMessageTemplate = updateMessageTemplate;
    deleteMessageTemplate = deleteMessageTemplate;
    listChurnedCustomers = listChurnedCustomers;
    buildFollowUp = buildFollowUp;
}
