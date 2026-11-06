import { z } from "zod";
import type { PaymentSession } from "../../domain/payment.domain.js";
import type { OrdersService } from "../orders.service.js";

const SECONDS_PER_MINUTE = 60;
const paymentSessionSchema = z.object({
    snapToken: z.string(),
    redirectUrl: z.string(),
    expiresAt: z.string(),
});

const keyOf = (paymentId: string) => `payment-session:${paymentId}`;

export async function storePaymentSession(
    this: OrdersService,
    paymentId: string,
    session: PaymentSession,
    timeoutMinutes: number,
): Promise<void> {
    try {
        await this.cache.set(keyOf(paymentId), JSON.stringify(session), {
            ttlSeconds: timeoutMinutes * SECONDS_PER_MINUTE,
        });
    } catch (err) {
        this.logger.warn({ err, paymentId }, "payment session could not be stored, it cannot be reopened");
    }
}

export async function readPaymentSession(this: OrdersService, paymentId: string): Promise<PaymentSession | null> {
    const stored = await this.cache.get(keyOf(paymentId));
    if (stored === null) return null;
    const parsed = paymentSessionSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
}
