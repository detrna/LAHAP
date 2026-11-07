import { RetentionRepositoryFailureError } from "../../service/interfaces/retention.repository.js";
import type { PrismaRetentionRepository } from "./retention-repository.js";

export async function deleteMessageTemplate(this: PrismaRetentionRepository, id: string): Promise<boolean> {
    try {
        return (await this.orm.public.MessageTemplate.where({ id }).deleteAndCount()) > 0;
    } catch (cause) {
        throw new RetentionRepositoryFailureError("deleteMessageTemplate", cause);
    }
}
