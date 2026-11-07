import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import { RetentionController } from "../../controller/retention.controller.js";
import type { ChurnHistory } from "../../service/interfaces/churn-history.js";
import type { CustomerDirectory } from "../../service/interfaces/customer-directory.js";
import type { PackageNames } from "../../service/interfaces/package-names.js";
import type { RetentionRepository } from "../../service/interfaces/retention.repository.js";
import type { WinBackPromos } from "../../service/interfaces/win-back-promos.js";
import { RetentionService } from "../../service/retention.service.js";
import {
    createMockChurnHistory,
    createMockCustomerDirectory,
    createMockPackageNames,
    createMockRetentionRepository,
    createMockRetentionService,
    createMockWinBackPromos,
    type Mocked,
    type MockedRetentionService,
} from "../mocks/retention.mocks.js";

export interface RetentionServiceSetup {
    readonly repository: Mocked<RetentionRepository>;
    readonly churn: Mocked<ChurnHistory>;
    readonly customers: Mocked<CustomerDirectory>;
    readonly packages: Mocked<PackageNames>;
    readonly promos: Mocked<WinBackPromos>;
    readonly clock: FixedClock;
    readonly service: RetentionService;
}

export interface RetentionControllerSetup {
    readonly retentionService: MockedRetentionService;
    readonly controller: RetentionController;
}

export function setupRetentionService(now?: string): RetentionServiceSetup {
    const repository = createMockRetentionRepository();
    const churn = createMockChurnHistory();
    const customers = createMockCustomerDirectory();
    const packages = createMockPackageNames();
    const promos = createMockWinBackPromos();
    const clock = createFixedClock(now);
    return {
        repository,
        churn,
        customers,
        packages,
        promos,
        clock,
        service: new RetentionService(repository, { churn, customers, packages, promos, clock }),
    };
}

export function setupRetentionController(): RetentionControllerSetup {
    const retentionService = createMockRetentionService();
    return {
        retentionService,
        controller: new RetentionController(retentionService as unknown as RetentionService),
    };
}
