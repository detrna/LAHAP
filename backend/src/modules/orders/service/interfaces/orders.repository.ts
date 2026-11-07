import type { OrderPeriod } from "../../../catalog/domain/package.domain.js";
import type { OrderStatus } from "../../domain/order.domain.js";
import type { PaymentMethod, PaymentStatus, PaymentType } from "../../domain/payment.domain.js";
import type { PurchaseType, SubscriptionStatus } from "../../domain/subscription.domain.js";

export * from "../../domain/errors.js";

export interface SubscriptionRecord {
    readonly id: string;
    readonly userId: string;
    readonly packageId: string;
    readonly promoCodeId: string | null;
    readonly tierId: string | null;
    readonly status: SubscriptionStatus;
    readonly purchaseType: PurchaseType;
    readonly period: OrderPeriod;
    readonly startDate: Temporal.PlainDate;
    readonly endDate: Temporal.PlainDate;
    readonly isDelivery: boolean;
    readonly recipientName: string;
    readonly deliveryAddress: string | null;
    readonly deliveryLatitude: number | null;
    readonly deliveryLongitude: number | null;
    readonly deliveryDistanceKm: number | null;
    readonly notes: string | null;
    readonly pricePerPortion: number;
    readonly foodSubtotal: number;
    readonly tierDiscount: number;
    readonly promoDiscount: number;
    readonly deliveryFeePerSlot: number;
    readonly deliveryFeeTotal: number;
    readonly totalPrice: number;
    readonly needsRefund: boolean;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface PaymentRecord {
    readonly id: string;
    readonly subscriptionId: string;
    readonly userId: string;
    readonly method: PaymentMethod;
    readonly type: PaymentType;
    readonly amount: number;
    readonly status: PaymentStatus;
    readonly transactionId: string | null;
    readonly paidAt: Temporal.PlainDateTime | null;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface OrderRecord {
    readonly id: string;
    readonly subscriptionId: string;
    readonly menuScheduleId: string;
    readonly serviceDate: Temporal.PlainDate;
    readonly courierId: string | null;
    readonly status: OrderStatus;
    readonly usesAlternativeMenu: boolean;
    readonly skipReason: string | null;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export type NewSubscriptionRecord = Omit<SubscriptionRecord, "needsRefund" | "createdAt" | "updatedAt">;

export interface NewSlotRecord {
    readonly id: string;
    readonly menuScheduleId: string;
    readonly serviceDate: Temporal.PlainDate;
}

export interface NewPaymentRecord {
    readonly id: string;
    readonly method: PaymentMethod;
    readonly amount: number;
    readonly status: PaymentStatus;
    readonly paidAt: Temporal.PlainDateTime | null;
}

export interface PromoReservation {
    readonly promoCodeId: string;
    readonly quota: number;
    readonly useStatuses: readonly SubscriptionStatus[];
    readonly customerUseStatuses: readonly SubscriptionStatus[];
}

export interface CheckoutWrite {
    readonly subscription: NewSubscriptionRecord;
    readonly slots: readonly NewSlotRecord[];
    readonly payment: NewPaymentRecord;
    readonly promo: PromoReservation | null;
}

export interface CheckoutRecord {
    readonly subscription: SubscriptionRecord;
    readonly payment: PaymentRecord;
    readonly orders: readonly OrderRecord[];
}

export interface PaymentWithSubscription {
    readonly payment: PaymentRecord;
    readonly subscription: SubscriptionRecord;
}

export interface PaymentChange {
    readonly payment: {
        readonly status: PaymentStatus;
        readonly paidAt?: Temporal.PlainDateTime | undefined;
        readonly transactionId?: string | null | undefined;
        readonly method?: PaymentMethod | undefined;
    };
    readonly subscription?:
        | {
              readonly status?: SubscriptionStatus | undefined;
              readonly needsRefund?: boolean | undefined;
          }
        | undefined;
}

export interface PaymentChangeResult {
    readonly before: PaymentWithSubscription;
    readonly after: PaymentWithSubscription | null;
}

export interface ExpiredPayment {
    readonly paymentId: string;
    readonly subscriptionId: string;
}

export interface PageQuery {
    readonly skip: number;
    readonly take: number;
}

export interface Page<T> {
    readonly items: readonly T[];
    readonly total: number;
}

export interface CreatedRange {
    readonly createdFrom?: Temporal.PlainDateTime | undefined;
    readonly createdBefore?: Temporal.PlainDateTime | undefined;
}

export interface SubscriptionListQuery extends PageQuery, CreatedRange {
    readonly userId?: string | undefined;
    readonly status?: SubscriptionStatus | undefined;
    readonly packageId?: string | undefined;
    readonly purchaseType?: PurchaseType | undefined;
    readonly needsRefund?: boolean | undefined;
}

export interface PaymentListQuery extends PageQuery, CreatedRange {
    readonly userId?: string | undefined;
    readonly status?: PaymentStatus | undefined;
    readonly method?: PaymentMethod | undefined;
    readonly needsRefund?: boolean | undefined;
}

export interface SlotListQuery extends PageQuery {
    readonly date: Temporal.PlainDate;
    readonly menuScheduleIds?: readonly string[] | undefined;
    readonly status?: OrderStatus | undefined;
    readonly courierId?: string | undefined;
    readonly unassigned?: boolean | undefined;
    readonly isDelivery?: boolean | undefined;
    readonly packageId?: string | undefined;
    readonly subscriptionId?: string | undefined;
    readonly subscriptionStatuses: readonly SubscriptionStatus[];
}

export interface StatusHistoryRecord {
    readonly id: string;
    readonly orderId: string;
    readonly fromStatus: OrderStatus | null;
    readonly toStatus: OrderStatus;
    readonly changedById: string | null;
    readonly adminNote: string | null;
    readonly changedAt: Temporal.PlainDateTime;
}

export interface SlotWithSubscription {
    readonly order: OrderRecord;
    readonly subscription: SubscriptionRecord;
}

export interface CustomerSlotQuery {
    readonly userId: string;
    readonly date: Temporal.PlainDate;
    readonly subscriptionId?: string | undefined;
    readonly subscriptionStatuses: readonly SubscriptionStatus[];
}

export interface SlotQuery {
    readonly orderIds?: readonly string[] | undefined;
    readonly menuScheduleIds?: readonly string[] | undefined;
    readonly usesAlternativeMenu?: boolean | undefined;
    readonly courierId?: string | undefined;
    readonly isDelivery?: boolean | undefined;
    readonly statuses?: readonly OrderStatus[] | undefined;
    readonly serviceDateFrom?: Temporal.PlainDate | undefined;
    readonly serviceDateTo?: Temporal.PlainDate | undefined;
    readonly subscriptionStatuses: readonly SubscriptionStatus[];
}

export interface AlternativeMenuChange {
    readonly orderId: string;
    readonly usesAlternativeMenu: boolean;
    readonly allowedStatuses: readonly OrderStatus[];
}

export interface SlotTransition {
    readonly orderIds: readonly string[];
    readonly from: readonly OrderStatus[];
    readonly to: OrderStatus;
    readonly actorId: string | null;
    readonly adminNote?: string | null | undefined;
    readonly skipReason?: string | null | undefined;
}

export interface TransitionedSlot {
    readonly order: OrderRecord;
    readonly fromStatus: OrderStatus;
    readonly changedAt: Temporal.PlainDateTime;
}

export interface SubscriptionCancellation {
    readonly subscriptionId: string;
    readonly expectedStatus: SubscriptionStatus;
    readonly needsRefund: boolean;
    readonly expirePendingPayments: boolean;
}

export interface PortionQuery {
    readonly menuScheduleIds?: readonly string[] | undefined;
    readonly serviceDateFrom?: Temporal.PlainDate | undefined;
    readonly serviceDateTo?: Temporal.PlainDate | undefined;
    readonly statuses: readonly OrderStatus[];
    readonly subscriptionStatuses: readonly SubscriptionStatus[];
}

export interface PortionCountRecord {
    readonly menuScheduleId: string;
    readonly usesAlternativeMenu: boolean;
    readonly portions: number;
}

export interface IncomeQuery {
    readonly createdFrom: Temporal.PlainDateTime;
    readonly createdBefore: Temporal.PlainDateTime;
    readonly statuses: readonly SubscriptionStatus[];
}

export interface IncomeTotals {
    readonly orderCount: number;
    readonly foodRevenue: number;
    readonly tierDiscount: number;
    readonly promoDiscount: number;
    readonly deliveryRevenue: number;
    readonly totalRevenue: number;
}

export interface IncomeRecord {
    readonly byPackage: readonly (IncomeTotals & { readonly packageId: string })[];
    readonly byPurchaseType: readonly (IncomeTotals & { readonly purchaseType: PurchaseType })[];
}

export interface ActiveSubscriberQuery {
    readonly packageIds: readonly string[];
    readonly subscriptionStatuses: readonly SubscriptionStatus[];
    readonly endDateFrom: Temporal.PlainDate;
}

export interface SubscriptionPeriodRecord {
    readonly scheduleId: string;
    readonly startDate: Temporal.PlainDate;
    readonly endDate: Temporal.PlainDate;
}

export interface LastSuccessSummaryRecord {
    readonly userId: string;
    readonly lastEndDate: Temporal.PlainDate;
    readonly lastPackageId: string;
    readonly totalSubscriptions: number;
}

export interface PackageAudienceQuery {
    readonly packageId: string;
    readonly subscriptionStatuses: readonly SubscriptionStatus[];
    readonly endDateFrom: Temporal.PlainDate;
}

export interface ScheduleAudienceQuery {
    readonly scheduleId: string;
    readonly subscriptionStatuses: readonly SubscriptionStatus[];
    readonly excludedSlotStatuses: readonly OrderStatus[];
}

export interface AnnouncementTargetQuery {
    readonly userId: string;
    readonly subscriptionStatuses: readonly SubscriptionStatus[];
    readonly packageEndDateFrom: Temporal.PlainDate;
    readonly excludedSlotStatuses: readonly OrderStatus[];
}

export interface AnnouncementTargetRecord {
    readonly packageIds: readonly string[];
    readonly scheduleIds: readonly string[];
}

export interface OrdersRepository {
    createCheckout(write: CheckoutWrite): Promise<CheckoutRecord>;
    findSubscriptionById(id: string): Promise<SubscriptionRecord | null>;
    findPaymentsBySubscriptionId(subscriptionId: string): Promise<readonly PaymentRecord[]>;
    changePayment(
        paymentId: string,
        decide: (current: PaymentWithSubscription) => PaymentChange | null,
    ): Promise<PaymentChangeResult | null>;
    expirePendingPayments(createdBefore: Temporal.PlainDateTime): Promise<readonly ExpiredPayment[]>;
    listSubscriptions(query: SubscriptionListQuery): Promise<Page<SubscriptionRecord>>;
    listPayments(query: PaymentListQuery): Promise<Page<PaymentRecord>>;
    listSlots(query: SlotListQuery): Promise<Page<SlotWithSubscription>>;
    findStatusHistory(orderId: string): Promise<readonly StatusHistoryRecord[]>;
    findOrdersBySubscriptionId(subscriptionId: string): Promise<readonly OrderRecord[]>;
    findSlotWithSubscription(orderId: string): Promise<SlotWithSubscription | null>;
    findCustomerSlots(query: CustomerSlotQuery): Promise<readonly SlotWithSubscription[]>;
    findCompletionTimes(orderIds: readonly string[]): Promise<ReadonlyMap<string, Temporal.PlainDateTime>>;
    findSlots(query: SlotQuery): Promise<readonly SlotWithSubscription[]>;
    transitionSlots(transition: SlotTransition): Promise<readonly TransitionedSlot[]>;
    setUsesAlternativeMenu(change: AlternativeMenuChange): Promise<OrderRecord | null>;
    assignCourier(orderIds: readonly string[], courierId: string | null): Promise<number>;
    cancelSubscription(cancellation: SubscriptionCancellation): Promise<SubscriptionRecord | null>;

    countPromoUses(
        promoCodeIds: readonly string[],
        statuses: readonly SubscriptionStatus[],
    ): Promise<ReadonlyMap<string, number>>;
    countPromoUsesByUser(promoCodeId: string, userId: string, statuses: readonly SubscriptionStatus[]): Promise<number>;
    hasSubscriptionsWithPromo(promoCodeId: string, statuses: readonly SubscriptionStatus[]): Promise<boolean>;
    countPortions(query: PortionQuery): Promise<readonly PortionCountRecord[]>;
    sumIncome(query: IncomeQuery): Promise<IncomeRecord>;
    countPaidServiceDays(userId: string, statuses: readonly SubscriptionStatus[]): Promise<number>;
    sumTierDiscounts(
        tierIds: readonly string[],
        statuses: readonly SubscriptionStatus[],
    ): Promise<ReadonlyMap<string, number>>;
    findLastSuccessEndDates(userIds: readonly string[]): Promise<ReadonlyMap<string, Temporal.PlainDate>>;
    findUserIdsWithLastSuccessEndBefore(date: Temporal.PlainDate): Promise<readonly string[]>;
    findLastSuccessSummaries(userIds: readonly string[]): Promise<readonly LastSuccessSummaryRecord[]>;
    countActiveSubscribers(query: ActiveSubscriberQuery): Promise<ReadonlyMap<string, number>>;
    findScheduleIdsWithSlots(
        scheduleIds: readonly string[],
        subscriptionStatuses: readonly SubscriptionStatus[],
    ): Promise<readonly string[]>;
    findScheduleIdsUsingAlternative(
        scheduleIds: readonly string[],
        subscriptionStatuses: readonly SubscriptionStatus[],
    ): Promise<readonly string[]>;
    findSubscriptionPeriods(
        scheduleIds: readonly string[],
        subscriptionStatuses: readonly SubscriptionStatus[],
    ): Promise<readonly SubscriptionPeriodRecord[]>;
    deleteSlotsOfSubscriptions(
        scheduleIds: readonly string[],
        subscriptionStatuses: readonly SubscriptionStatus[],
    ): Promise<void>;
    findCustomerIdsByPackage(query: PackageAudienceQuery): Promise<readonly string[]>;
    findCustomerIdsBySchedule(query: ScheduleAudienceQuery): Promise<readonly string[]>;
    findAnnouncementTargets(query: AnnouncementTargetQuery): Promise<AnnouncementTargetRecord>;
}
