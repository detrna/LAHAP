import { escapeLikePattern } from "../../../../infrastructure/database/prisma/like.js";
import { RetentionRepositoryFailureError } from "../../service/interfaces/retention.repository.js";
import type { PrismaRetentionRepository } from "./retention-repository.js";

export async function isMessageTemplateNameTaken(
    this: PrismaRetentionRepository,
    name: string,
    exceptId?: string,
): Promise<boolean> {
    try {
        let templates = this.orm.public.MessageTemplate.where(item => item.name.ilike(escapeLikePattern(name)));
        if (exceptId !== undefined) templates = templates.where(item => item.id.neq(exceptId));
        return (await templates.select("id").first()) !== null;
    } catch (cause) {
        throw new RetentionRepositoryFailureError("isMessageTemplateNameTaken", cause);
    }
}
