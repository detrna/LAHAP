import type { CatalogService } from "../../../src/modules/catalog/service/catalog.service.js";
import type { IngredientsService } from "../../../src/modules/ingredients/service/ingredients.service.js";
import type { ModuleDeps } from "../../../src/modules/module-deps.js";
import { OrdersContainer } from "../../../src/modules/orders/container/orders.container.js";
import type { CustomerProfiles } from "../../../src/modules/orders/service/interfaces/customer-profiles.js";
import type { OrderNotifier } from "../../../src/modules/orders/service/interfaces/order-notifier.js";
import type { PromoChecker } from "../../../src/modules/orders/service/interfaces/promo-checker.js";
import type { RealtimePublisher } from "../../../src/modules/orders/service/interfaces/realtime-publisher.js";
import type { ShoppingList } from "../../../src/modules/orders/service/interfaces/shopping-list.js";
import { noSlotObstacles, type SlotObstacles } from "../../../src/modules/orders/service/interfaces/slot-obstacles.js";
import type { UnreadCount } from "../../../src/modules/orders/service/interfaces/unread-count.js";
import type { TierDiscountProvider } from "../../../src/modules/orders/service/interfaces/tier-discount-provider.js";
import { SettingsContainer } from "../../../src/modules/settings/container/settings.container.js";
import type { UsersService } from "../../../src/modules/users/service/users.service.js";
import { createCatalogContainer } from "./catalog-container.js";
import { createIngredientsContainer } from "./ingredients-container.js";
import { createPromoCodesContainer } from "./promo-codes-container.js";
import { createTiersContainer } from "./tiers-container.js";
import { createUsersContainer } from "./users-container.js";

export interface OrdersContainerOverrides {
    readonly customers?: CustomerProfiles | undefined;
    readonly tierDiscounts?: TierDiscountProvider | undefined;
    readonly promoChecker?: PromoChecker | undefined;
    readonly notifier?: OrderNotifier | undefined;
    readonly realtime?: RealtimePublisher | undefined;
    readonly obstacles?: SlotObstacles | undefined;
    readonly shoppingList?: ShoppingList | undefined;
    readonly unreadCount?: UnreadCount | undefined;
}

const quietRealtime: RealtimePublisher = { publish: async () => undefined };

const quietNotifier: OrderNotifier = {
    notifyUser: async () => undefined,
    notifyAdmins: async () => undefined,
};

function lazyCustomers(deps: ModuleDeps): CustomerProfiles {
    let users: UsersService | undefined;
    const service = () => (users ??= createUsersContainer(deps).service);
    return {
        getAllergyProfiles: ids => service().getAllergyProfiles(ids),
        filterActiveUserIds: (ids, role) => service().filterActiveUserIds(ids, role),
        getSummaries: ids => service().getSummaries(ids),
    };
}

function catalogWithIngredients(deps: ModuleDeps): CatalogService {
    let ingredients: IngredientsService | undefined;
    const catalog = createCatalogContainer(deps, {
        ingredients: {
            findMissingIngredientIds: ids => ingredients!.findMissingIngredientIds(ids),
            getIngredientsByIds: ids => ingredients!.getIngredientsByIds(ids),
            getAllergyIdsByIngredientIds: ids => ingredients!.getAllergyIdsByIngredientIds(ids),
        },
    }).service;
    ingredients = createIngredientsContainer(deps, { allergies: catalog, menus: catalog }).service;
    return catalog;
}

export function createOrdersContainer(deps: ModuleDeps, overrides: OrdersContainerOverrides = {}): OrdersContainer {
    let orders: OrdersContainer | undefined;
    const promoCodes = createPromoCodesContainer(deps, {
        promoUsage: {
            countPromoUses: ids => orders!.service.countPromoUses(ids),
            countPromoUsesByUser: (promoCodeId, userId) => orders!.service.countPromoUsesByUser(promoCodeId, userId),
            hasPendingSubscriptions: promoCodeId => orders!.service.hasPendingSubscriptions(promoCodeId),
        },
    });
    orders = new OrdersContainer({
        ...deps,
        catalog: catalogWithIngredients(deps),
        settings: new SettingsContainer(deps).service,
        tierDiscounts:
            overrides.tierDiscounts ??
            createTiersContainer(deps, {
                orderStats: {
                    countPaidServiceDays: userId => orders!.service.countPaidServiceDays(userId),
                    sumTierDiscounts: tierIds => orders!.service.sumTierDiscounts(tierIds),
                },
            }).service,
        promoChecker: overrides.promoChecker ?? promoCodes.service,
        customers: overrides.customers ?? lazyCustomers(deps),
        notifier: overrides.notifier ?? quietNotifier,
        realtime: overrides.realtime ?? quietRealtime,
        obstacles: overrides.obstacles ?? noSlotObstacles,
        shoppingList: overrides.shoppingList ?? { getShoppingList: async () => [] },
        unreadCount: overrides.unreadCount ?? { countUnread: async () => 0 },
    });
    return orders;
}
