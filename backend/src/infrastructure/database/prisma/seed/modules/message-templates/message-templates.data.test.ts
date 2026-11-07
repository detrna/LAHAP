import { describe, expect, it } from "vitest";
import { messageTemplateCreateSchema } from "../../../../../../modules/retention/schema/retention.schemas.js";
import { MESSAGE_TEMPLATES } from "./message-templates.data.js";

describe("MESSAGE_TEMPLATES seed data", () => {
    it.each(MESSAGE_TEMPLATES.map(template => [template.name, template] as const))(
        "%s passes the template request rules",
        (_, template) => {
            expect(messageTemplateCreateSchema.safeParse({ name: template.name, body: template.body }).success).toBe(
                true,
            );
        },
    );

    it("has names that are unique ignoring case", () => {
        const names = MESSAGE_TEMPLATES.map(template => template.name.toLowerCase());
        expect(new Set(names).size).toBe(names.length);
    });
});
