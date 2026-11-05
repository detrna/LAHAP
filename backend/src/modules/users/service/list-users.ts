import type { Role } from "../../../shared/auth/roles.js";
import { churnCutoffDate, isChurned } from "../../../shared/utils/churn/churn.js";
import { toPhoneSearch } from "../domain/phone-search.js";
import type { User } from "../domain/user.domain.js";
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
    const { items, total } = await this.usersRepository.list({
        ...input,
        phoneSearch: input.search !== undefined ? toPhoneSearch(input.search) : undefined,
        churnCutoff: churnCutoffDate(today),
    });
    return {
        items: items.map(({ user, lastSuccessEndDate }) =>
            toUser(user, { isChurned: user.role === "CUSTOMER" && isChurned(lastSuccessEndDate, today) }),
        ),
        total,
    };
}
