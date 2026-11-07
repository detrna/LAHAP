import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { Config } from "../../../../../../config/index.js";
import { createModules } from "../../../../../../modules/create-modules.js";
import type { CheckoutInput } from "../../../../../../modules/orders/service/checkout/checkout-input.js";
import type { SlotWithSubscription } from "../../../../../../modules/orders/service/interfaces/orders.repository.js";
import type { PaymentGateway } from "../../../../../../shared/ports/payment-gateway/payment-gateway.js";
import { BUSINESS_TIME_ZONE } from "../../../../../../shared/time/time-zone.js";
import { createAdapters } from "../../../../../index.js";
import type { Db } from "../../../db.js";
import { seedId } from "../../shared/seed-id.js";
import { SeedClock } from "../../seed-clock.js";
import type { SeedContext } from "../../seed-context.js";
import { PACKAGES } from "../packages/packages.data.js";
import { PROMO_CODES } from "../promo-codes/promo-codes.data.js";
import { USERS, type UserSeed } from "../users/users.data.js";
import { planOrderDates } from "./orders.plan.js";

export interface OrdersSeedContext extends Pick<SeedContext, "logger" | "today"> {
    readonly db: Db;
    readonly config: Config;
}

const ADMIN_ID = seedId("user", 1);
const KITCHEN_ID = seedId("user", 2);
const COURIER_JOKO_ID = seedId("user", 3);
const COURIER_EKO_ID = seedId("user", 4);

const customer = (n: number): UserSeed => {
    const user = USERS.find(candidate => candidate.id === seedId("user", n));
    if (user === undefined) throw new Error(`seed user ${n} is missing`);
    return user;
};
const RINA = customer(5);
const ANDI = customer(6);
const DEWI = customer(7);
const BAGUS = customer(8);
export const ORDER_CUSTOMER_IDS: readonly string[] = [RINA.id, ANDI.id, DEWI.id, BAGUS.id];

const MERDEKA = PROMO_CODES[0]!.code;

const cashGateway: PaymentGateway = {
    createTransaction: async () => {
        throw new Error("the seed pays in cash and never opens a gateway transaction");
    },
    verifyNotification: () => {
        throw new Error("the seed never receives gateway notifications");
    },
};

const at = (day: Temporal.PlainDate, time: string): Temporal.ZonedDateTime =>
    day.toZonedDateTime({ timeZone: BUSINESS_TIME_ZONE, plainTime: Temporal.PlainTime.from(time) });

function pickup(user: UserSeed, packageId: string) {
    return {
        packageId,
        purchaseType: "Offline",
        paymentMethod: "CASH",
        isDelivery: false,
        recipientName: user.name,
        deliveryAddress: null,
        deliveryLatitude: null,
        deliveryLongitude: null,
        notes: null,
        promoCode: null,
    } as const;
}

function delivery(user: UserSeed, packageId: string) {
    return {
        ...pickup(user, packageId),
        isDelivery: true,
        deliveryAddress: user.address,
        deliveryLatitude: Number(user.latitude),
        deliveryLongitude: Number(user.longitude),
    } as const;
}

export async function seedOrders({ db, logger, today, config }: OrdersSeedContext): Promise<number> {
    const alreadySeeded = await db.orm.public.Subscription.where(subscription =>
        subscription.userId.in(ORDER_CUSTOMER_IDS as Varchar<36>[]),
    )
        .select("id")
        .first();
    if (alreadySeeded !== null) {
        logger.info("orders already seeded; run the seed with --reset or clean it first to recreate them");
        return 0;
    }

    const plan = planOrderDates(today);
    const clock = new SeedClock(at(plan.churned.checkoutDay, "10:00"));
    const adapters = { ...(await createAdapters(config)), logger, clock, paymentGateway: cashGateway };
    try {
        const { orders, catalog } = createModules({ db, adapters, http: config.HTTP });
        const service = orders.service;
        const repository = service.ordersRepository;
        const leadMinutes = config.SCHEDULER.SLOT_PREPARATION_LEAD_MINUTES;
        let created = 0;

        const scheduleIdsOn = async (packageId: string, day: Temporal.PlainDate, times: readonly string[]) => {
            const found = await catalog.service.findSchedules({ packageId, from: day, to: day, isPublished: true });
            return times.map(time => {
                const schedule = found.find(candidate => candidate.deliveryTime.time === time);
                if (schedule === undefined) throw new Error(`no published ${time} schedule on ${day.toString()}`);
                return schedule.id;
            });
        };

        const placeOrder = async (userId: string, input: CheckoutInput, paid: boolean) => {
            const { subscription, payment } = await service.createSubscription(userId, input);
            created++;
            if (paid) {
                clock.set(clock.now().add({ minutes: 5 }));
                await service.verifyCashPayment(payment.id);
            }
            return subscription;
        };

        const slotIdsOf = async (subscriptionId: string) =>
            (await repository.findOrdersBySubscriptionId(subscriptionId)).map(order => order.id);

        const assignCourier = async (courierId: string, subscriptionId: string) =>
            service.assignCourier({ courierId, orderIds: await slotIdsOf(subscriptionId) });

        const slotsOnDay = (day: Temporal.PlainDate, statuses: readonly SlotWithSubscription["order"]["status"][]) =>
            repository.findSlots({
                serviceDateFrom: day,
                serviceDateTo: day,
                statuses,
                subscriptionStatuses: ["Success"],
            });

        const serveMeal = async (day: Temporal.PlainDate, time: string, finish: boolean) => {
            const meal = at(day, time);
            clock.advanceTo(meal.subtract({ minutes: 60 }));
            await service.prepareDueSlots(leadMinutes);
            const prepared = await slotsOnDay(day, ["Disiapkan"]);
            if (prepared.length === 0) return;
            await service.markFoodReady(KITCHEN_ID, { orderIds: prepared.map(slot => slot.order.id) });
            if (!finish) return;

            clock.advanceTo(meal.add({ minutes: 30 }));
            for (const slot of await slotsOnDay(day, ["Diantar", "Siap Diambil"])) {
                if (slot.order.isDelivery) {
                    await service.completeDelivery(
                        { userId: slot.order.courierId ?? COURIER_JOKO_ID, role: "COURIER" },
                        slot.order.id,
                    );
                } else {
                    await service.completePickup(ADMIN_ID, slot.order.id);
                }
            }
        };

        const hemat = PACKAGES.hemat.id;
        const reguler = PACKAGES.reguler.id;

        const churnedIds = [];
        for (const day of plan.churned.serviceDays) churnedIds.push(...(await scheduleIdsOn(hemat, day, ["12:00"])));
        await placeOrder(BAGUS.id, { ...pickup(BAGUS, hemat), period: "Harian", menuScheduleIds: churnedIds }, true);
        for (const day of plan.churned.serviceDays) await serveMeal(day, "12:00", true);
        logger.info({ customer: BAGUS.name }, "seeded a finished pick-up order that has gone quiet (churned)");

        clock.advanceTo(at(plan.monthly.checkoutDay, "09:00"));
        const monthly = await placeOrder(
            RINA.id,
            {
                ...delivery(RINA, hemat),
                period: "Bulanan",
                periodStart: plan.monthly.periodStart,
                deliveryTimes: [Temporal.PlainTime.from("12:00")],
            },
            true,
        );
        await assignCourier(COURIER_JOKO_ID, monthly.id);
        for (const day of plan.monthly.pastServiceDays) await serveMeal(day, "12:00", true);
        logger.info(
            { customer: RINA.name, from: plan.monthly.periodStart.toString() },
            "seeded a monthly delivery order",
        );
        if (plan.monthly.switchToPickupFrom !== null) {
            const switched = await service.changeDeliveryMethod({ userId: RINA.id, asAdmin: false }, monthly.id, {
                isDelivery: false,
                effectiveFrom: plan.monthly.switchToPickupFrom,
                deliveryAddress: null,
                deliveryLatitude: null,
                deliveryLongitude: null,
                paymentMethod: "MIDTRANS",
            });
            logger.info(
                { customer: RINA.name, from: switched.change.effectiveFrom, refund: switched.change.amount },
                "seeded a switch to pick-up waiting for its delivery fee refund",
            );
        }

        clock.advanceTo(at(plan.delivery.checkoutDay, "15:00"));
        const todayIds = await scheduleIdsOn(reguler, plan.delivery.today, ["07:00", "12:00", "18:30"]);
        const tomorrowIds = await scheduleIdsOn(reguler, plan.delivery.tomorrow, ["12:00"]);
        const dailyDelivery = await placeOrder(
            ANDI.id,
            { ...delivery(ANDI, reguler), period: "Harian", menuScheduleIds: [...todayIds, ...tomorrowIds] },
            true,
        );
        await assignCourier(COURIER_EKO_ID, dailyDelivery.id);

        clock.advanceTo(at(plan.delivery.checkoutDay, "15:30"));
        const [cancelledScheduleId] = await scheduleIdsOn(hemat, plan.cancelled.serviceDay, ["12:00"]);
        const toCancel = await placeOrder(
            DEWI.id,
            { ...pickup(DEWI, hemat), period: "Harian", menuScheduleIds: [cancelledScheduleId!] },
            true,
        );

        await serveMeal(plan.delivery.today, "07:00", true);
        await serveMeal(plan.delivery.today, "12:00", false);
        clock.advanceTo(at(plan.delivery.today, "12:30"));
        logger.info({ customer: ANDI.name }, "seeded a daily delivery order that is in progress today");

        const [tomorrowSlot] = await repository.findCustomerSlots({
            userId: ANDI.id,
            date: plan.delivery.tomorrow,
            subscriptionId: dailyDelivery.id,
            subscriptionStatuses: ["Success"],
        });
        await service.skipSlot(ANDI.id, tomorrowSlot!.order.id, "Ada acara keluarga");
        await service.cancelSubscription(DEWI.id, toCancel.id);
        logger.info({ customer: DEWI.name }, "seeded a cancelled order waiting for its refund, and a skipped slot");

        await placeOrder(
            ANDI.id,
            {
                ...pickup(ANDI, reguler),
                period: "Mingguan",
                periodStart: plan.weekly.periodStart,
                deliveryTimes: [Temporal.PlainTime.from("07:00"), Temporal.PlainTime.from("12:00")],
                promoCode: MERDEKA,
            },
            true,
        );
        logger.info({ customer: ANDI.name, promoCode: MERDEKA }, "seeded a weekly pick-up order with a promo code");

        clock.advanceTo(Temporal.Now.zonedDateTimeISO(BUSINESS_TIME_ZONE));
        const [pendingScheduleId] = await scheduleIdsOn(hemat, today.add({ days: 4 }), ["07:00"]);
        await placeOrder(
            DEWI.id,
            { ...pickup(DEWI, hemat), period: "Harian", menuScheduleIds: [pendingScheduleId!] },
            false,
        );
        logger.info({ customer: DEWI.name }, "seeded an order that is still waiting for its cash payment");

        return created;
    } finally {
        await Promise.all([adapters.cache.close(), adapters.eventBus.close()]);
    }
}
