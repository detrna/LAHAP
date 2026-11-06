import type { CheckoutPreview } from "../../domain/checkout.domain.js";
import type { OrdersService } from "../orders.service.js";
import type { CheckoutInput } from "./checkout-input.js";

export async function previewCheckout(
    this: OrdersService,
    userId: string,
    input: CheckoutInput,
): Promise<CheckoutPreview> {
    const quote = await this.quoteCheckout(userId, input);
    return quote.preview;
}
