export interface MethodChangeInput {
    readonly isDelivery: boolean;
    readonly effectiveFrom?: Temporal.PlainDate | undefined;
    readonly deliveryAddress: string | null;
    readonly deliveryLatitude: number | null;
    readonly deliveryLongitude: number | null;
    readonly paymentMethod: "MIDTRANS" | "CASH";
}

export interface MethodChangeActor {
    readonly userId: string;
    readonly asAdmin: boolean;
}
