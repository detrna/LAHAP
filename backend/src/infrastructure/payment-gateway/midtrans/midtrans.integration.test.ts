import "dotenv/config";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/index.js";
import { MIDTRANS_BCA_VA_SIMULATOR_URL, MidtransPaymentGateway } from "./midtrans.js";

const config = loadConfig();

// Integration tests call the real Midtrans Sandbox API.
// Run with: npm run test:integration
if (!config.PAYMENT_GATEWAY.SERVER_KEY) {
    throw new Error("MIDTRANS_SERVER_KEY is required to run integration tests");
}

describe("MidtransPaymentGateway (integration)", () => {
    const gateway = new MidtransPaymentGateway(config.PAYMENT_GATEWAY, config.APP);

    it("creates a transaction on Midtrans Sandbox and returns token, redirectUrl, and simulatorUrl", async () => {
        const orderId = `it-${randomUUID()}`;
        const result = await gateway.createTransaction({
            orderId,
            grossAmount: 25_000,
        });

        expect(result.token).toBeTruthy();
        expect(result.redirectUrl).toMatch(/^https:\/\/app\.sandbox\.midtrans\.com\/snap\//);
        expect(result.simulatorUrl).toBe(
            config.APP.IS_PRODUCTION ? undefined : MIDTRANS_BCA_VA_SIMULATOR_URL,
        );
    });

    it("omits simulatorUrl when IS_PRODUCTION is true", async () => {
        const prodGateway = new MidtransPaymentGateway(config.PAYMENT_GATEWAY, {
            ...config.APP,
            IS_PRODUCTION: true,
        });
        const orderId = `it-${randomUUID()}`;
        const result = await prodGateway.createTransaction({
            orderId,
            grossAmount: 25_000,
        });

        expect(result.token).toBeTruthy();
        expect(result.redirectUrl).toMatch(/^https:\/\/app\.sandbox\.midtrans\.com\/snap\//);
        expect(result.simulatorUrl).toBeUndefined();
    });

    it("issues a fresh Snap session when reusing an orderId before a payment method is chosen", async () => {
        const orderId = `it-${randomUUID()}`;
        const first = await gateway.createTransaction({
            orderId,
            grossAmount: 15_000,
        });
        const second = await gateway.createTransaction({
            orderId,
            grossAmount: 15_000,
        });

        expect(first.token).toBeTruthy();
        expect(second.token).toBeTruthy();
        expect(second.token).not.toBe(first.token);
        expect(second.redirectUrl).toMatch(/^https:\/\/app\.sandbox\.midtrans\.com\/snap\//);
    });
});

