export type WinBackPromoCheck =
    | { readonly valid: true; readonly promoCode: { readonly code: string } }
    | { readonly valid: false; readonly reason: string };

export interface WinBackPromos {
    checkPromoForCustomer(code: string, userId: string): Promise<WinBackPromoCheck>;
}
