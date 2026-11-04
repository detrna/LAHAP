import { getUniqueViolationConstraint } from "../../../../infrastructure/database/prisma/sql-errors.js";
import type { NewUserRecord, UserRecord } from "../../service/interfaces/users.repository.js";
import { UserAlreadyExistsError, UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import { usersWithAllergies } from "./queries.js";
import { toUserRecord } from "./to-user-record.js";
import type { PrismaUsersRepository } from "./users-repository.js";

const UNIQUE_FIELDS = { user_phone_key: "phone", user_email_key: "email" } as const;

export async function create(this: PrismaUsersRepository, user: NewUserRecord): Promise<UserRecord> {
    try {
        return await this.db.transaction(async tx => {
            const created = await tx.orm.public.User.create({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: user.passwordHash,
                role: user.role,
                address: user.address,
                latitude: user.latitude === null ? null : String(user.latitude),
                longitude: user.longitude === null ? null : String(user.longitude),
                allergyNote: user.allergyNote,
            });
            if (user.allergyIds.length > 0) {
                await tx.orm.public.UserAllergy.createAll(
                    user.allergyIds.map(allergyId => ({ userId: created.id, allergyId })),
                );
            }
            const row = await usersWithAllergies(tx.orm).where({ id: created.id }).first();
            if (row === null) throw new Error(`user ${created.id} vanished inside its own transaction`);
            return toUserRecord(row);
        });
    } catch (cause) {
        const constraint = getUniqueViolationConstraint(cause);
        if (constraint !== null && constraint in UNIQUE_FIELDS) {
            throw new UserAlreadyExistsError(UNIQUE_FIELDS[constraint as keyof typeof UNIQUE_FIELDS], { cause });
        }
        throw new UsersRepositoryFailureError("create", cause);
    }
}
