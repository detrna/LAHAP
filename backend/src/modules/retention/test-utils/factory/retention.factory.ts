import type { ChurnCustomer, ChurnFollowUp } from "../../domain/churn.domain.js";
import type { MessageTemplate } from "../../domain/message-template.domain.js";

export function buildChurnCustomer(overrides: Partial<ChurnCustomer> = {}): ChurnCustomer {
    return {
        userId: "00000000-0000-4000-8000-000000000001",
        name: "test name",
        phone: "6281200000000",
        lastPackageName: "test lastPackageName",
        lastEndDate: "2026-11-03",
        daysSinceLastOrder: 15,
        totalSubscriptions: 1,
        ...overrides,
    };
}

export function buildChurnFollowUp(overrides: Partial<ChurnFollowUp> = {}): ChurnFollowUp {
    return { message: "test message", whatsappUrl: "https://example.com/whatsappUrl", ...overrides };
}

export function buildMessageTemplate(overrides: Partial<MessageTemplate> = {}): MessageTemplate {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "test name",
        body: "test body",
        createdAt: "2026-11-03T00:00:00.000Z",
        updatedAt: "2026-11-03T00:00:00.000Z",
        ...overrides,
    };
}
