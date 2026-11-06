import type { Payment } from "../../domain/payment.domain.js";
import type { Page } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";
import { toPayment } from "../present.js";

export async function listMyPayments(
    this: OrdersService,
    userId: string,
    page: { readonly skip: number; readonly take: number },
): Promise<Page<Payment>> {
    const { items, total } = await this.ordersRepository.listPayments({ userId, ...page });
    return { items: items.map(toPayment), total };
}
