import type { Role } from "../../../shared/auth/roles.js";
import { churnCutoffDate, isChurned } from "../../../shared/utils/churn/churn.js";
import { toPhoneSearch } from "../domain/phone-search.js";
import type { User } from "../domain/user.domain.js";
import type { ChurnedFilter } from "./interfaces/users.repository.js";
import { toUser } from "./to-user.js";
import type { UsersService } from "./users.service.js";

export interface ListUsersInput {
    readonly search?: string | undefined;
    readonly roles?: readonly Role[] | undefined;
    readonly isActive?: boolean | undefined;
    readonly isChurned?: boolean | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface UserPage {
    readonly items: readonly User[];
    readonly total: number;
}

export async function listUsers(this: UsersService, input: ListUsersInput): Promise<UserPage> {
    const today = this.clock.now().toPlainDate();
    const { isChurned: churnFilter, ...filters } = input;
    const churned: ChurnedFilter | undefined =
        churnFilter === undefined
            ? undefined
            : {
                  userIds: await this.subscriptionHistory.findUserIdsWithLastSuccessEndBefore(churnCutoffDate(today)),
                  isChurned: churnFilter,
              };
    const { items, total } = await this.usersRepository.list({
        ...filters,
        phoneSearch: input.search !== undefined ? toPhoneSearch(input.search) : undefined,
        ...(churned !== undefined ? { churned } : {}),
    });

    const customerIds = items.filter(user => user.role === "CUSTOMER").map(user => user.id);
    const [allergies, lastSuccessEndDates] = await Promise.all([
        this.allergyLookup.getAllergiesByIds(items.flatMap(user => user.allergyIds)),
        this.subscriptionHistory.findLastSuccessEndDates(customerIds),
    ]);
    return {
        items: items.map(user => {
            const ids = new Set(user.allergyIds);
            return toUser(user, {
                allergies: allergies.filter(allergy => ids.has(allergy.id)),
                isChurned: user.role === "CUSTOMER" && isChurned(lastSuccessEndDates.get(user.id) ?? null, today),
            });
        }),
        total,
    };
}
