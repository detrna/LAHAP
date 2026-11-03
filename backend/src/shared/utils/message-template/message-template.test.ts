import { describe, expect, it } from "vitest";
import { generateMessage, MESSAGE_PLACEHOLDERS } from "./message-template.js";

describe("MESSAGE_PLACEHOLDERS", () => {
    it("has unique tokens", () => {
        const tokens = Object.values(MESSAGE_PLACEHOLDERS);
        expect(new Set(tokens).size).toBe(tokens.length);
    });
});

describe("generateMessage", () => {
    it("fills every placeholder from its key", () => {
        const template =
            "Halo {nama}, paket {paket_terakhir} kamu berakhir {tanggal_berakhir} ({lama_tidak_memesan} lalu). Pakai {kode_promo}!";

        expect(
            generateMessage(template, {
                name: "Budi",
                lastPackage: "Paket Hemat",
                endDate: "12 Oktober 2026",
                daysSinceLastOrder: "21 hari",
                promoCode: "WINBACK15",
            }),
        ).toBe("Halo Budi, paket Paket Hemat kamu berakhir 12 Oktober 2026 (21 hari lalu). Pakai WINBACK15!");
    });

    it("replaces repeated placeholders", () => {
        expect(generateMessage("{nama} {nama}", { name: "Sari" })).toBe("Sari Sari");
    });

    it("renders a placeholder without a value as empty", () => {
        expect(generateMessage("Kode: {kode_promo}.", {})).toBe("Kode: .");
    });

    it("leaves unknown placeholders and plain braces untouched", () => {
        expect(generateMessage("{alamat} {Nama} {} { nama }", { name: "Budi" })).toBe("{alamat} {Nama} {} { nama }");
    });

    it("does not expand placeholders that appear inside values", () => {
        expect(generateMessage("Halo {nama}", { name: "{kode_promo}" })).toBe("Halo {kode_promo}");
    });
});
