import { z } from "zod";

export interface PaymentGatewayConfig {
    readonly SERVER_KEY: string;
    readonly BASE_URL: string;
    readonly TIMEOUT_MS: number;
    readonly MAX_RETRIES: number;
}

export const paymentGatewayEnvSchema = z.object({
    MIDTRANS_SERVER_KEY: z.string().default(""),
    MIDTRANS_BASE_URL: z.string().default("https://app.sandbox.midtrans.com"),
    MIDTRANS_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
    MIDTRANS_MAX_RETRIES: z.coerce.number().int().min(0).default(1),
});

export type PaymentGatewayEnv = z.output<typeof paymentGatewayEnvSchema>;

export const toPaymentGatewayConfig = (env: PaymentGatewayEnv): PaymentGatewayConfig => ({
    SERVER_KEY: env.MIDTRANS_SERVER_KEY,
    BASE_URL: env.MIDTRANS_BASE_URL,
    TIMEOUT_MS: env.MIDTRANS_TIMEOUT_MS,
    MAX_RETRIES: env.MIDTRANS_MAX_RETRIES,
});

export const loadPaymentGatewayConfig = (
    env: NodeJS.ProcessEnv = process.env,
): PaymentGatewayConfig => toPaymentGatewayConfig(paymentGatewayEnvSchema.parse(env));
