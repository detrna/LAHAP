import { vi } from "vitest";
import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import { PromoCodesController } from "../../controller/promo-codes.controller.js";
import type { PromoCodesRepository } from "../../service/interfaces/promo-codes.repository.js";
import type { PromoUsage } from "../../service/interfaces/promo-usage.js";
import { PromoCodesService } from "../../service/promo-codes.service.js";
import {
    createMockPromoCodesRepository,
    createMockPromoCodesService,
    createMockPromoUsage,
    type Mocked,
    type MockedPromoCodesService,
} from "../mocks/promo-codes.mocks.js";

export interface PromoCodesServiceSetup {
    readonly repository: Mocked<PromoCodesRepository>;
    readonly promoUsage: Mocked<PromoUsage>;
    readonly clock: FixedClock;
    readonly randomInt: ReturnType<typeof vi.fn>;
    readonly service: PromoCodesService;
}

export interface PromoCodesControllerSetup {
    readonly promoCodesService: MockedPromoCodesService;
    readonly controller: PromoCodesController;
}

export function setupPromoCodesService(now?: string): PromoCodesServiceSetup {
    const repository = createMockPromoCodesRepository();
    const promoUsage = createMockPromoUsage();
    const clock = createFixedClock(now);
    const randomInt = vi.fn((max: number) => max - 1);
    return {
        repository,
        promoUsage,
        clock,
        randomInt,
        service: new PromoCodesService(repository, clock, randomInt, promoUsage),
    };
}

export function setupPromoCodesController(): PromoCodesControllerSetup {
    const promoCodesService = createMockPromoCodesService();
    return {
        promoCodesService,
        controller: new PromoCodesController(promoCodesService as unknown as PromoCodesService),
    };
}
