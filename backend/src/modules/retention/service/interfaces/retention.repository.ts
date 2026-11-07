export * from "../../domain/errors.js";

export interface MessageTemplateRecord {
    readonly id: string;
    readonly name: string;
    readonly body: string;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface NewMessageTemplateRecord {
    readonly name: string;
    readonly body: string;
}

export interface MessageTemplateChanges {
    readonly name?: string | undefined;
    readonly body?: string | undefined;
}

export interface MessageTemplateListQuery {
    readonly skip: number;
    readonly take: number;
}

export interface MessageTemplateListRecord {
    readonly items: readonly MessageTemplateRecord[];
    readonly total: number;
}

export interface RetentionRepository {
    listMessageTemplates(query: MessageTemplateListQuery): Promise<MessageTemplateListRecord>;
    findMessageTemplateById(id: string): Promise<MessageTemplateRecord | null>;
    isMessageTemplateNameTaken(name: string, exceptId?: string): Promise<boolean>;
    createMessageTemplate(record: NewMessageTemplateRecord): Promise<MessageTemplateRecord>;
    updateMessageTemplate(id: string, changes: MessageTemplateChanges): Promise<MessageTemplateRecord | null>;
    deleteMessageTemplate(id: string): Promise<boolean>;
}
