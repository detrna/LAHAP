import { isChurned } from "../../../shared/utils/churn/churn.js";
import type { User } from "../domain/user.domain.js";
import type { UserRecord } from "./interfaces/users.repository.js";
import { toUser } from "./to-user.js";
import type { UsersService } from "./users.service.js";

export async function toUserView(this: UsersService, record: UserRecord): Promise<User> {
    return toUser(record, { allergies: await this.allergyLookup.getAllergiesByIds(record.allergyIds) });
}

export async function toProfile(this: UsersService, record: UserRecord): Promise<User> {
    const [allergies, membership] = await Promise.all([
        this.allergyLookup.getAllergiesByIds(record.allergyIds),
        this.membershipLookup.getMembership(record.id),
    ]);
    return toUser(record, { allergies, membership });
}

export async function toUserDetail(this: UsersService, record: UserRecord): Promise<User> {
    const isCustomer = record.role === "CUSTOMER";
    const [allergies, membership, lastSuccessEndDates] = await Promise.all([
        this.allergyLookup.getAllergiesByIds(record.allergyIds),
        this.membershipLookup.getMembership(record.id),
        isCustomer ? this.subscriptionHistory.findLastSuccessEndDates([record.id]) : null,
    ]);
    const lastSuccessEndDate = lastSuccessEndDates?.get(record.id) ?? null;
    return toUser(record, {
        allergies,
        membership,
        isChurned: isCustomer && isChurned(lastSuccessEndDate, this.clock.now().toPlainDate()),
    });
}
