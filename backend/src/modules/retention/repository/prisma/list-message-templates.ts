import type {
    MessageTemplateListQuery,
    MessageTemplateListRecord,
} from "../../service/interfaces/retention.repository.js";
import { RetentionRepositoryFailureError } from "../../service/interfaces/retention.repository.js";
import type { PrismaRetentionRepository } from "./retention-repository.js";
import { toMessageTemplateRecord } from "./to-message-template-record.js";

export async function listMessageTemplates(
    this: PrismaRetentionRepository,
    query: MessageTemplateListQuery,
): Promise<MessageTemplateListRecord> {
    try {
        const templates = this.orm.public.MessageTemplate;
        const [rows, totals] = await Promise.all([
            templates
                .orderBy([item => item.createdAt.desc(), item => item.id.asc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            templates.aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return { items: rows.map(toMessageTemplateRecord), total: totals.total };
    } catch (cause) {
        throw new RetentionRepositoryFailureError("listMessageTemplates", cause);
    }
}
