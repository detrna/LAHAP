import type { ModuleDeps } from "../../../src/modules/module-deps.js";
import { PromoCodesContainer } from "../../../src/modules/promo-codes/container/promo-codes.container.js";
import { noPromoUsage, type PromoUsage } from "../../../src/modules/promo-codes/service/interfaces/promo-usage.js";

export interface PromoCodesContainerOverrides {
    readonly promoUsage?: PromoUsage | undefined;
}

export function createPromoCodesContainer(
    deps: ModuleDeps,
    overrides: PromoCodesContainerOverrides = {},
): PromoCodesContainer {
    return new PromoCodesContainer({ ...deps, promoUsage: overrides.promoUsage ?? noPromoUsage });
}
