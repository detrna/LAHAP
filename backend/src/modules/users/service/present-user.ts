import { toPhotoUrl } from "../../../shared/media/photo.js";
import { isChurned } from "../../../shared/utils/churn/churn.js";
import { toDbTimestamp, toIsoTimestamp } from "../../../shared/time/timestamp.js";
import type { Membership } from "../../tiers/domain/membership.domain.js";
import type { User } from "../domain/user.domain.js";
import type { MembershipRecord, UserRecord } from "./interfaces/users.repository.js";
import { toUser } from "./to-user.js";
import type { UsersService } from "./users.service.js";

export async function toMembership(this: UsersService, record: MembershipRecord | null): Promise<Membership | null> {
    if (record === null) return null;
    const now = toDbTimestamp(this.clock.now());
    return {
        tierId: record.tierId,
        tier: {
            id: record.tier.id,
            name: record.tier.name,
            description: record.tier.description,
            requiredSubscriptionDays: record.tier.requiredSubscriptionDays,
            durationDays: record.tier.durationDays,
            discountPercent: record.tier.discountPercent,
            photoKey: record.tier.photoKey,
            photoUrl: await toPhotoUrl(this.objectStorage, record.tier.photoKey),
            createdAt: toIsoTimestamp(record.tier.createdAt),
            updatedAt: toIsoTimestamp(record.tier.updatedAt),
        },
        startedAt: toIsoTimestamp(record.startedAt),
        expiresAt: toIsoTimestamp(record.expiresAt),
        isActive: Temporal.PlainDateTime.compare(record.expiresAt, now) > 0,
    };
}

export async function toProfile(this: UsersService, record: UserRecord): Promise<User> {
    const membership = await this.toMembership(await this.usersRepository.findMembership(record.id));
    return toUser(record, { membership });
}

export async function toUserDetail(this: UsersService, record: UserRecord): Promise<User> {
    const isCustomer = record.role === "CUSTOMER";
    const [membershipRecord, lastSuccessEndDate] = await Promise.all([
        this.usersRepository.findMembership(record.id),
        isCustomer ? this.usersRepository.findLastSuccessEndDate(record.id) : null,
    ]);
    return toUser(record, {
        membership: await this.toMembership(membershipRecord),
        isChurned: isCustomer && isChurned(lastSuccessEndDate, this.clock.now().toPlainDate()),
    });
}
