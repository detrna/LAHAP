import { describe, expect, it } from "vitest";
import {
    churnFollowUpSchema,
    churnListQuerySchema,
    MAX_TEMPLATE_BODY_LENGTH,
    messageTemplateCreateSchema,
    messageTemplateListQuerySchema,
    messageTemplateUpdateSchema,
} from "./retention.schemas.js";

describe("messageTemplateCreateSchema (unit)", () => {
    it("trims the name and the body", () => {
        expect(messageTemplateCreateSchema.parse({ name: "  Win-back ", body: " Halo {nama}\n" })).toEqual({
            name: "Win-back",
            body: "Halo {nama}",
        });
    });

    it("accepts a body at the length limit", () => {
        const body = "a".repeat(MAX_TEMPLATE_BODY_LENGTH);
        expect(messageTemplateCreateSchema.parse({ name: "x", body }).body).toBe(body);
    });

    it.each([
        ["an empty name", { name: "   ", body: "Halo" }],
        ["a name over 100 characters", { name: "a".repeat(101), body: "Halo" }],
        ["an empty body", { name: "x", body: "  " }],
        ["a body over 2000 characters", { name: "x", body: "a".repeat(MAX_TEMPLATE_BODY_LENGTH + 1) }],
        ["a missing body", { name: "x" }],
    ])("rejects %s", (_, body) => {
        expect(messageTemplateCreateSchema.safeParse(body).success).toBe(false);
    });

    it("rejects unknown placeholders, naming them and the allowed ones", () => {
        const result = messageTemplateCreateSchema.safeParse({ name: "x", body: "Halo {nma}, {alamat}" });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ["body"],
                message:
                    "unknown placeholders {nma}, {alamat}; allowed: {nama}, {paket_terakhir}, {tanggal_berakhir}, {lama_tidak_memesan}, {kode_promo}",
            }),
        ]);
    });

    it("leaves braces that are not placeholders alone", () => {
        expect(messageTemplateCreateSchema.safeParse({ name: "x", body: "Halo {Nama} { }" }).success).toBe(true);
    });
});

describe("messageTemplateUpdateSchema (unit)", () => {
    it("accepts one field", () => {
        expect(messageTemplateUpdateSchema.parse({ name: " New " })).toEqual({ name: "New" });
    });

    it("checks the placeholders of a new body", () => {
        expect(messageTemplateUpdateSchema.safeParse({ body: "{nma}" }).success).toBe(false);
    });

    it("rejects a request that changes nothing", () => {
        expect(messageTemplateUpdateSchema.safeParse({}).success).toBe(false);
    });
});

describe("messageTemplateListQuerySchema (unit)", () => {
    it("reads the page and the limit", () => {
        expect(messageTemplateListQuerySchema.parse({ page: "2", limit: "5" })).toEqual({ page: 2, limit: 5 });
    });
});

describe("churnListQuerySchema (unit)", () => {
    it("reads the search and the page", () => {
        expect(churnListQuerySchema.parse({ search: " budi ", page: "2" })).toMatchObject({ search: "budi", page: 2 });
    });

    it("treats an empty search as no filter", () => {
        expect(churnListQuerySchema.parse({ search: "" }).search).toBeUndefined();
    });
});

describe("churnFollowUpSchema (unit)", () => {
    const templateId = "00000000-0000-4000-8000-000000000001";

    it("trims the promo code", () => {
        expect(churnFollowUpSchema.parse({ templateId, promoCode: " merdeka " })).toEqual({
            templateId,
            promoCode: "merdeka",
        });
    });

    it.each([null, "", "   ", undefined])("treats %j as no promo code", promoCode => {
        expect(churnFollowUpSchema.parse({ templateId, promoCode })).toEqual({ templateId });
    });

    it.each([
        ["a template id that is not a uuid", { templateId: "t1" }],
        ["a promo code over 50 characters", { templateId, promoCode: "A".repeat(51) }],
    ])("rejects %s", (_, body) => {
        expect(churnFollowUpSchema.safeParse(body).success).toBe(false);
    });
});
