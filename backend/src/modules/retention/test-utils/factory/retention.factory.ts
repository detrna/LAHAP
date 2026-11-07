import type { ChurnCustomer, ChurnFollowUp } from "../../domain/churn.domain.js";
import type { MessageTemplate } from "../../domain/message-template.domain.js";
import type { MessageTemplateRecord } from "../../service/interfaces/retention.repository.js";

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
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildMessageTemplateRecord(overrides: Partial<MessageTemplateRecord> = {}): MessageTemplateRecord {
    return {
        id: "00000000-0000-4000-8000-000000000002",
        name: "test name",
        body: "Halo {nama}",
        createdAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        updatedAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        ...overrides,
    };
}
