import { describe, expect, it } from "vitest";
import { InvalidStateError } from "../../../shared/errors/invalid-state-error.js";
import { UserNotFoundError } from "../../../shared/errors/user-not-found-error.js";
import { buildMessageTemplateRecord } from "../test-utils/factory/retention.factory.js";
import { setupRetentionService } from "../test-utils/setup/retention.setup.js";
import { MessageTemplateNotFoundError } from "./interfaces/retention.repository.js";

const USER = "budi";
const TEMPLATE_BODY =
    "Halo {nama}, sudah {lama_tidak_memesan} sejak {paket_terakhir} berakhir {tanggal_berakhir}. Pakai {kode_promo}!";

function setup(body = TEMPLATE_BODY) {
    const context = setupRetentionService("2026-11-07T10:00:00+07:00[Asia/Jakarta]");
    context.repository.findMessageTemplateById.mockResolvedValue(buildMessageTemplateRecord({ id: "t1", body }));
    context.customers.getSummaries.mockResolvedValue([
        { id: USER, name: "Budi", phone: "6281234567890", role: "CUSTOMER" },
    ]);
    context.customers.filterActiveUserIds.mockResolvedValue([USER]);
    context.churn.getLastSuccessSummary.mockResolvedValue({
        userId: USER,
        lastEndDate: Temporal.PlainDate.from("2026-10-12"),
        lastPackageId: "hemat",
        totalSubscriptions: 2,
    });
    context.packages.getPackagesByIds.mockResolvedValue([{ id: "hemat", name: "Paket Hemat" }]);
    context.promos.checkPromoForCustomer.mockResolvedValue({ valid: true, promoCode: { code: "MERDEKA" } });
    return context;
}

describe("RetentionService.buildFollowUp (unit)", () => {
    it("fills the template for the churned customer and links it to their WhatsApp", async () => {
        const { churn, customers, packages, promos, repository, service } = setup();

        const followUp = await service.buildFollowUp(USER, { templateId: "t1", promoCode: "merdeka" });

        const message = "Halo Budi, sudah 26 hari sejak Paket Hemat berakhir 12 Oktober 2026. Pakai MERDEKA!";
        expect(followUp).toEqual({
            message,
            whatsappUrl: `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`,
        });
        expect(repository.findMessageTemplateById).toHaveBeenCalledWith("t1");
        expect(customers.getSummaries).toHaveBeenCalledWith([USER]);
        expect(customers.filterActiveUserIds).toHaveBeenCalledWith([USER], "CUSTOMER");
        expect(churn.getLastSuccessSummary).toHaveBeenCalledWith(USER);
        expect(promos.checkPromoForCustomer).toHaveBeenCalledWith("merdeka", USER);
        expect(packages.getPackagesByIds).toHaveBeenCalledWith(["hemat"]);
    });

    it("needs no promo code for a template without {kode_promo}", async () => {
        const { promos, service } = setup("Halo {nama}");

        expect(await service.buildFollowUp(USER, { templateId: "t1" })).toMatchObject({ message: "Halo Budi" });
        expect(promos.checkPromoForCustomer).not.toHaveBeenCalled();
    });

    it("throws MessageTemplateNotFoundError for an unknown template", async () => {
        const { repository, service } = setup();
        repository.findMessageTemplateById.mockResolvedValue(null);

        await expect(service.buildFollowUp(USER, { templateId: "t1", promoCode: "X" })).rejects.toBeInstanceOf(
            MessageTemplateNotFoundError,
        );
    });

    it.each([
        ["an unknown user", []],
        ["a staff account", [{ id: USER, name: "Kurir", phone: "62811", role: "COURIER" as const }]],
    ])("throws UserNotFoundError for %s", async (_, summaries) => {
        const { customers, service } = setup();
        customers.getSummaries.mockResolvedValue(summaries);

        await expect(service.buildFollowUp(USER, { templateId: "t1", promoCode: "X" })).rejects.toBeInstanceOf(
            UserNotFoundError,
        );
    });

    it("refuses an inactive account", async () => {
        const { customers, service } = setup();
        customers.filterActiveUserIds.mockResolvedValue([]);

        await expect(service.buildFollowUp(USER, { templateId: "t1", promoCode: "X" })).rejects.toThrow(
            new InvalidStateError("customer account is inactive"),
        );
    });

    it.each([
        ["has never paid for an order", null],
        [
            "ended their last paid order 14 days ago",
            {
                userId: USER,
                lastEndDate: Temporal.PlainDate.from("2026-10-24"),
                lastPackageId: "hemat",
                totalSubscriptions: 1,
            },
        ],
    ])("refuses a customer who %s", async (_, summary) => {
        const { churn, service } = setup();
        churn.getLastSuccessSummary.mockResolvedValue(summary);

        await expect(service.buildFollowUp(USER, { templateId: "t1", promoCode: "X" })).rejects.toThrow(
            new InvalidStateError("customer is not churned"),
        );
    });

    it("refuses a {kode_promo} template without a promo code", async () => {
        const { promos, service } = setup();

        await expect(service.buildFollowUp(USER, { templateId: "t1" })).rejects.toThrow(
            new InvalidStateError("template needs a promo code"),
        );
        expect(promos.checkPromoForCustomer).not.toHaveBeenCalled();
    });

    it.each([
        ["NOT_FOUND", "promo code is not active"],
        ["INACTIVE", "promo code is not active"],
        ["EXPIRED", "promo code is not active"],
        ["QUOTA_EXHAUSTED", "promo code quota is exhausted"],
        ["ALREADY_USED", "customer already used this promo code"],
    ])("refuses a promo code rejected as %s", async (reason, message) => {
        const { promos, service } = setup();
        promos.checkPromoForCustomer.mockResolvedValue({ valid: false, reason });

        await expect(service.buildFollowUp(USER, { templateId: "t1", promoCode: "X" })).rejects.toThrow(
            new InvalidStateError(message),
        );
    });
});
