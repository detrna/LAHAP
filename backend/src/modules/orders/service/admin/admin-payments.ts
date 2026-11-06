import type { Payment, PaymentMethod, PaymentStatus } from "../../domain/payment.domain.js";
import type { Page } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";
import { toPayment } from "../present.js";
import { toCreatedRange, type DateFilter } from "./created-range.js";

export interface AdminPaymentFilter extends DateFilter {
    readonly status?: PaymentStatus | undefined;
    readonly method?: PaymentMethod | undefined;
    readonly userId?: string | undefined;
    readonly needsRefund?: boolean | undefined;
    readonly skip: number;
    readonly take: number;
}

export async function listPaymentsForAdmin(this: OrdersService, filter: AdminPaymentFilter): Promise<Page<Payment>> {
    const { from, to, ...rest } = filter;
    const { items, total } = await this.ordersRepository.listPayments({ ...rest, ...toCreatedRange({ from, to }) });
    return { items: items.map(toPayment), total };
}
