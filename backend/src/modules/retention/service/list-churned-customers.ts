import { churnCutoffDate, isChurned } from "../../../shared/utils/churn/churn.js";
import { buildChurnList } from "../domain/churn-list.js";
import type { ChurnCustomer } from "../domain/churn.domain.js";
import type { RetentionService } from "./retention.service.js";

export interface ListChurnedCustomersInput {
    readonly search?: string | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface ChurnCustomerPage {
    readonly items: readonly ChurnCustomer[];
    readonly total: number;
}

const EMPTY_PAGE: ChurnCustomerPage = { items: [], total: 0 };

export async function listChurnedCustomers(
    this: RetentionService,
    input: ListChurnedCustomersInput,
): Promise<ChurnCustomerPage> {
    const today = this.clock.now().toPlainDate();
    const candidates = (await this.churn.findChurnedCustomers(churnCutoffDate(today))).filter(candidate =>
        isChurned(candidate.lastEndDate, today),
    );
    if (candidates.length === 0) return EMPTY_PAGE;

    const activeIds = new Set(
        await this.customers.filterActiveUserIds(
            candidates.map(candidate => candidate.userId),
            "CUSTOMER",
        ),
    );
    const active = candidates.filter(candidate => activeIds.has(candidate.userId));
    if (active.length === 0) return EMPTY_PAGE;

    const [contacts, packages] = await Promise.all([
        this.customers.getSummaries(active.map(candidate => candidate.userId)),
        this.packages.getPackagesByIds([...new Set(active.map(candidate => candidate.lastPackageId))]),
    ]);
    const matching = buildChurnList({
        candidates: active,
        contacts,
        packageNames: new Map(packages.map(item => [item.id, item.name])),
        today,
        search: input.search,
    });
    return { items: matching.slice(input.skip, input.skip + input.take), total: matching.length };
}
