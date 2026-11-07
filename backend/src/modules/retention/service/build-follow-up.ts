import { InvalidStateError } from "../../../shared/errors/invalid-state-error.js";
import { UserNotFoundError } from "../../../shared/errors/user-not-found-error.js";
import { daysBetween } from "../../../shared/time/calendar.js";
import { formatIndonesianDate } from "../../../shared/time/indonesian-date.js";
import { isChurned } from "../../../shared/utils/churn/churn.js";
import { generateMessage, MESSAGE_PLACEHOLDERS } from "../../../shared/utils/message-template/message-template.js";
import type { ChurnFollowUp } from "../domain/churn.domain.js";
import { formatDaysSince } from "../domain/days-since.js";
import { toWhatsAppUrl } from "../domain/whatsapp-link.js";
import { MessageTemplateNotFoundError } from "./interfaces/retention.repository.js";
import type { RetentionService } from "./retention.service.js";

export interface BuildFollowUpInput {
    readonly templateId: string;
    readonly promoCode?: string | undefined;
}

const PROMO_REJECTION_MESSAGES: Readonly<Record<string, string>> = {
    QUOTA_EXHAUSTED: "promo code quota is exhausted",
    ALREADY_USED: "customer already used this promo code",
};

async function resolvePromoCode(
    service: RetentionService,
    userId: string,
    templateBody: string,
    promoCode: string | undefined,
): Promise<string | undefined> {
    if (promoCode === undefined) {
        if (templateBody.includes(MESSAGE_PLACEHOLDERS.promoCode)) {
            throw new InvalidStateError("template needs a promo code");
        }
        return undefined;
    }
    const check = await service.promos.checkPromoForCustomer(promoCode, userId);
    if (!check.valid) {
        throw new InvalidStateError(PROMO_REJECTION_MESSAGES[check.reason] ?? "promo code is not active");
    }
    return check.promoCode.code;
}

export async function buildFollowUp(
    this: RetentionService,
    userId: string,
    input: BuildFollowUpInput,
): Promise<ChurnFollowUp> {
    const template = await this.retentionRepository.findMessageTemplateById(input.templateId);
    if (template === null) throw new MessageTemplateNotFoundError(input.templateId);

    const [contacts, activeIds, summary] = await Promise.all([
        this.customers.getSummaries([userId]),
        this.customers.filterActiveUserIds([userId], "CUSTOMER"),
        this.churn.getLastSuccessSummary(userId),
    ]);
    const contact = contacts.find(item => item.id === userId);
    if (contact === undefined || contact.role !== "CUSTOMER") throw new UserNotFoundError(userId);
    if (!activeIds.includes(userId)) throw new InvalidStateError("customer account is inactive");

    const today = this.clock.now().toPlainDate();
    if (summary === null || !isChurned(summary.lastEndDate, today)) {
        throw new InvalidStateError("customer is not churned");
    }

    const promoCode = await resolvePromoCode(this, userId, template.body, input.promoCode);
    const [lastPackage] = await this.packages.getPackagesByIds([summary.lastPackageId]);

    const message = generateMessage(template.body, {
        name: contact.name,
        lastPackage: lastPackage?.name ?? "",
        endDate: formatIndonesianDate(summary.lastEndDate, "long"),
        daysSinceLastOrder: formatDaysSince(daysBetween(summary.lastEndDate, today)),
        ...(promoCode !== undefined ? { promoCode } : {}),
    });
    return { message, whatsappUrl: toWhatsAppUrl(contact.phone, message) };
}
