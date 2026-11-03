export interface ChurnCustomer {
    readonly userId: string;
    readonly name: string;
    readonly phone: string;
    readonly lastPackageName: string;
    readonly lastEndDate: string;
    readonly daysSinceLastOrder: number;
    readonly totalSubscriptions: number;
}

export interface ChurnFollowUp {
    readonly message: string;
    readonly whatsappUrl: string;
}
