import { AppError } from "../../../../shared/errors/app-error.js";
import type { MembershipStore } from "../../service/interfaces/tiers.repository.js";
import { TiersRepositoryFailureError } from "../../service/interfaces/tiers.repository.js";
import { PrismaTiersRepository } from "./tiers-repository.js";

export async function withUserLock<T>(
    this: PrismaTiersRepository,
    userId: string,
    work: (store: MembershipStore) => Promise<T>,
): Promise<T> {
    try {
        return await this.db.transaction(async tx => {
            await tx.execute(
                tx.raw.sql`SELECT pg_advisory_xact_lock(hashtext(${`membership:${userId}`}))`.affectedCount().build(),
            );
            return work(new PrismaTiersRepository(this.db, tx.orm));
        });
    } catch (cause) {
        if (cause instanceof AppError) throw cause;
        throw new TiersRepositoryFailureError("withUserLock", cause);
    }
}
