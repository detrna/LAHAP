import { UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import type { PrismaUsersRepository } from "./users-repository.js";

export async function findLastSuccessEndDate(
    this: PrismaUsersRepository,
    userId: string,
): Promise<Temporal.PlainDate | null> {
    try {
        const result = await this.db.orm.public.Subscription.where({ userId, status: "Success" }).aggregate(
            aggregate => ({ lastEndDate: aggregate.max("endDate") }),
        );
        return result.lastEndDate;
    } catch (cause) {
        throw new UsersRepositoryFailureError("findLastSuccessEndDate", cause);
    }
}
