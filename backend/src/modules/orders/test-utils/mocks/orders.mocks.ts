import { vi } from "vitest";
import type { OrdersRepository } from "../../service/interfaces/orders.repository.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export function createMockOrdersRepository(): Mocked<OrdersRepository> {
    return {
        findLastSuccessEndDates: vi.fn(async () => new Map()),
        findUserIdsWithLastSuccessEndBefore: vi.fn(async () => []),
    } as Mocked<OrdersRepository>;
}
