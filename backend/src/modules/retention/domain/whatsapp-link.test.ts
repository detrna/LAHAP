import { describe, expect, it } from "vitest";
import { toWhatsAppUrl } from "./whatsapp-link.js";

describe("toWhatsAppUrl (unit)", () => {
    it("links to the phone with the message as the text", () => {
        expect(toWhatsAppUrl("6281234567890", "Halo Budi")).toBe("https://wa.me/6281234567890?text=Halo%20Budi");
    });

    it("encodes characters that would break the link, and decodes back to the message", () => {
        const message = "Halo Budi,\nPakai kode A&B #1 = 10% 🎉?";
        const url = new URL(toWhatsAppUrl("6281234567890", message));

        expect(url.search).not.toMatch(/[ \n#]/);
        expect(url.hash).toBe("");
        expect(url.searchParams.get("text")).toBe(message);
        expect([...url.searchParams.keys()]).toEqual(["text"]);
    });
});
