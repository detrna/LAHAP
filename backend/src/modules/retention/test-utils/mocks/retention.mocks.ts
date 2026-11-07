import { vi } from "vitest";
import type { ChurnHistory } from "../../service/interfaces/churn-history.js";
import type { CustomerDirectory } from "../../service/interfaces/customer-directory.js";
import type { PackageNames } from "../../service/interfaces/package-names.js";
import type { RetentionRepository } from "../../service/interfaces/retention.repository.js";
import type { WinBackPromos } from "../../service/interfaces/win-back-promos.js";
import type { RetentionService } from "../../service/retention.service.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedRetentionService = Mocked<
    Pick<
        RetentionService,
        | "listMessageTemplates"
        | "getMessageTemplate"
        | "createMessageTemplate"
        | "updateMessageTemplate"
        | "deleteMessageTemplate"
        | "listChurnedCustomers"
        | "buildFollowUp"
    >
>;

export function createMockRetentionRepository(): Mocked<RetentionRepository> {
    return {
        listMessageTemplates: vi.fn(async () => ({ items: [], total: 0 })),
        findMessageTemplateById: vi.fn(async () => null),
        isMessageTemplateNameTaken: vi.fn(async () => false),
        createMessageTemplate: vi.fn(),
        updateMessageTemplate: vi.fn(async () => null),
        deleteMessageTemplate: vi.fn(async () => false),
    } as unknown as Mocked<RetentionRepository>;
}

export function createMockRetentionService(): MockedRetentionService {
    return {
        listMessageTemplates: vi.fn(),
        getMessageTemplate: vi.fn(),
        createMessageTemplate: vi.fn(),
        updateMessageTemplate: vi.fn(),
        deleteMessageTemplate: vi.fn(),
        listChurnedCustomers: vi.fn(),
        buildFollowUp: vi.fn(),
    } as MockedRetentionService;
}

export function createMockChurnHistory(): Mocked<ChurnHistory> {
    return {
        findChurnedCustomers: vi.fn(async () => []),
        getLastSuccessSummary: vi.fn(async () => null),
    } as Mocked<ChurnHistory>;
}

export function createMockCustomerDirectory(): Mocked<CustomerDirectory> {
    return {
        getSummaries: vi.fn(async () => []),
        filterActiveUserIds: vi.fn(async () => []),
    } as Mocked<CustomerDirectory>;
}

export function createMockPackageNames(): Mocked<PackageNames> {
    return { getPackagesByIds: vi.fn(async () => []) } as Mocked<PackageNames>;
}

export function createMockWinBackPromos(): Mocked<WinBackPromos> {
    return {
        checkPromoForCustomer: vi.fn(async () => ({ valid: false, reason: "NOT_FOUND" })),
    } as Mocked<WinBackPromos>;
}
