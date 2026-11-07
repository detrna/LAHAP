import { InvalidStateError } from "../../../shared/errors/invalid-state-error.js";
import { ValidationError } from "../../../shared/errors/validation-error.js";
import { roundHalfUp } from "../../../shared/utils/decimal/decimal.js";
import type { DeliveryMethodChangeStatus } from "./delivery-method-change.domain.js";
import type { OrderStatus } from "./order.domain.js";
import type { PaymentStatus } from "./payment.domain.js";
import type { SubscriptionStatus } from "./subscription.domain.js";

const MONEY_SCALE = 2;

export interface SwitchSlot {
    readonly id: string;
    readonly serviceDate: Temporal.PlainDate;
    readonly status: OrderStatus;
    readonly isDelivery: boolean;
    readonly deliveryFee: number;
}

export interface MethodSwitchInput<T extends SwitchSlot> {
    readonly orders: readonly T[];
    readonly toDelivery: boolean;
    readonly today: Temporal.PlainDate;
    readonly endDate: Temporal.PlainDate;
    readonly requested?: Temporal.PlainDate | undefined;
}

export interface MethodSwitchPlan<T extends SwitchSlot> {
    readonly effectiveFrom: Temporal.PlainDate;
    readonly slots: readonly T[];
}

export interface SwitchQuote {
    readonly deliveryFeePerSlot: number;
    readonly amount: number;
    readonly slots: readonly { readonly orderId: string; readonly fee: number }[];
}

export function isSwitchable(slot: SwitchSlot, toDelivery: boolean, today: Temporal.PlainDate): boolean {
    return (
        slot.status === "Terjadwal" &&
        slot.isDelivery !== toDelivery &&
        Temporal.PlainDate.compare(slot.serviceDate, today) > 0
    );
}

function invalidStartDate(message: string): ValidationError {
    return new ValidationError([{ target: "body", path: "effectiveFrom", message, code: "invalid_effective_from" }]);
}

export function planMethodSwitch<T extends SwitchSlot>(input: MethodSwitchInput<T>): MethodSwitchPlan<T> {
    const { requested, today, endDate, toDelivery } = input;
    if (requested !== undefined) {
        if (Temporal.PlainDate.compare(requested, today) <= 0) throw invalidStartDate("must be after today");
        if (Temporal.PlainDate.compare(requested, endDate) > 0) {
            throw invalidStartDate("must not be after the order's end date");
        }
    }
    const switchable = input.orders
        .filter(slot => isSwitchable(slot, toDelivery, today))
        .sort((a, b) => Temporal.PlainDate.compare(a.serviceDate, b.serviceDate));
    const effectiveFrom = requested ?? switchable[0]?.serviceDate;
    const slots =
        effectiveFrom === undefined
            ? []
            : switchable.filter(slot => Temporal.PlainDate.compare(slot.serviceDate, effectiveFrom) >= 0);
    if (effectiveFrom === undefined || slots.length === 0) throw new InvalidStateError("no slot can switch method");
    return { effectiveFrom, slots };
}

export function quoteDowngrade(slots: readonly SwitchSlot[]): SwitchQuote {
    const fees = slots.map(slot => ({ orderId: slot.id, fee: slot.deliveryFee }));
    return {
        deliveryFeePerSlot: 0,
        amount: roundHalfUp(
            fees.reduce((sum, { fee }) => sum + fee, 0),
            MONEY_SCALE,
        ),
        slots: fees,
    };
}

export function quoteUpgrade(slots: readonly SwitchSlot[], feePerSlot: number): SwitchQuote {
    return {
        deliveryFeePerSlot: feePerSlot,
        amount: roundHalfUp(feePerSlot * slots.length, MONEY_SCALE),
        slots: slots.map(slot => ({ orderId: slot.id, fee: feePerSlot })),
    };
}

export interface UpgradeState {
    readonly paymentStatus: PaymentStatus;
    readonly changeStatus: DeliveryMethodChangeStatus;
    readonly subscriptionStatus: SubscriptionStatus;
    readonly slotsStillSwitchable: boolean;
}

export type UpgradeOutcome =
    | { readonly kind: "none" }
    | { readonly kind: "upgrade-paid" }
    | { readonly kind: "upgrade-late-paid" }
    | { readonly kind: "upgrade-expired" }
    | { readonly kind: "upgrade-refunded" };

const NONE: UpgradeOutcome = { kind: "none" };

function decidePaid(state: UpgradeState): UpgradeOutcome {
    const paymentOpen = state.paymentStatus === "Pending" || state.paymentStatus === "Expire";
    if (!paymentOpen) return NONE;
    const applies =
        state.paymentStatus === "Pending" &&
        state.changeStatus === "Pending" &&
        state.subscriptionStatus === "Success" &&
        state.slotsStillSwitchable;
    return applies ? { kind: "upgrade-paid" } : { kind: "upgrade-late-paid" };
}

export function decideUpgradeOutcome(state: UpgradeState, target: PaymentStatus): UpgradeOutcome {
    switch (target) {
        case "Success":
            return decidePaid(state);
        case "Expire":
            return state.paymentStatus === "Pending" ? { kind: "upgrade-expired" } : NONE;
        case "Refund":
            return state.paymentStatus === "Success" ? { kind: "upgrade-refunded" } : NONE;
        case "Pending":
            return NONE;
    }
}
