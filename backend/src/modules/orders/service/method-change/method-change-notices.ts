import { formatIndonesianDate } from "../../../../shared/time/indonesian-date.js";
import type { DeliveryMethodChangeRecord, OrderRecord, SubscriptionRecord } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

const rupiah = (amount: number) => `Rp${new Intl.NumberFormat("id-ID").format(amount)}`;

function warnOnFailure(service: OrdersService, context: Record<string, unknown>) {
    return (err: unknown) => {
        service.logger.warn({ err, ...context }, "delivery method change notification failed");
    };
}

export async function afterMethodChanged(
    this: OrdersService,
    change: DeliveryMethodChangeRecord,
    subscription: SubscriptionRecord,
    slotsBefore: readonly OrderRecord[],
): Promise<void> {
    const from = formatIndonesianDate(change.effectiveFrom, "long");
    const context = { changeId: change.id, subscriptionId: subscription.id };
    const notices: Promise<unknown>[] = [];
    if (change.toDelivery) {
        notices.push(
            this.notifier.notifyUser({
                userId: subscription.userId,
                title: "Metode penerimaan diubah",
                body: `Mulai ${from}, ${change.slotCount} slot pesananmu diantar ke ${change.deliveryAddress ?? "alamatmu"}.`,
            }),
            this.notifier.notifyAdmins({
                title: "Slot antar perlu kurir",
                body: `${change.slotCount} slot pesanan ${subscription.recipientName} mulai ${from} kini diantar. Tugaskan kurirnya.`,
            }),
        );
    } else {
        const refund = change.needsRefund
            ? ` Ongkir ${rupiah(change.amount)} akan dikembalikan secara manual oleh admin.`
            : "";
        notices.push(
            this.notifier.notifyUser({
                userId: subscription.userId,
                title: "Metode penerimaan diubah",
                body: `Mulai ${from}, ${change.slotCount} slot pesananmu diambil sendiri.${refund}`,
            }),
        );
        if (change.needsRefund) {
            notices.push(
                this.notifier.notifyAdmins({
                    title: "Refund ongkir menunggu",
                    body: `${subscription.recipientName} beralih ke ambil sendiri mulai ${from}. Kembalikan ongkir ${rupiah(change.amount)}, lalu konfirmasi refund-nya.`,
                }),
            );
        }
        const counts = new Map<string, number>();
        for (const slot of slotsBefore) {
            if (slot.courierId !== null) counts.set(slot.courierId, (counts.get(slot.courierId) ?? 0) + 1);
        }
        for (const [courierId, count] of counts) {
            notices.push(
                this.notifier.notifyUser({
                    userId: courierId,
                    title: "Slot antar dibatalkan",
                    body: `${count} slot ${subscription.recipientName} mulai ${from} kini diambil sendiri, jadi tidak perlu diantar.`,
                }),
            );
        }
    }
    await Promise.all(notices.map(notice => notice.catch(warnOnFailure(this, context))));
}

export async function afterUpgradeNotApplied(this: OrdersService, change: DeliveryMethodChangeRecord): Promise<void> {
    await this.notifier
        .notifyAdmins({
            title: "Pembayaran ongkir masuk terlambat",
            body: `Pembayaran ongkir ${rupiah(change.amount)} diterima, tetapi slotnya sudah tidak bisa diubah. Kembalikan dananya, lalu konfirmasi refund perubahan metode.`,
        })
        .catch(warnOnFailure(this, { changeId: change.id }));
}

export async function afterUpgradeRefunded(this: OrdersService, change: DeliveryMethodChangeRecord): Promise<void> {
    await this.notifier
        .notifyAdmins({
            title: "Pembayaran ongkir dikembalikan",
            body: `Pembayaran ongkir ${rupiah(change.amount)} dikembalikan lewat Midtrans. Slotnya tetap diantar; ubah metodenya bila perlu.`,
        })
        .catch(warnOnFailure(this, { changeId: change.id }));
}
