import { AuthContainer } from "./auth/container/auth.container.js";
import { CatalogContainer } from "./catalog/container/catalog.container.js";
import { DeliveryContainer } from "./delivery/container/delivery.container.js";
import { FilesContainer } from "./files/container/files.container.js";
import { IngredientsContainer } from "./ingredients/container/ingredients.container.js";
import { KitchenContainer } from "./kitchen/container/kitchen.container.js";
import type { ModuleDeps } from "./module-deps.js";
import { NotificationsContainer } from "./notifications/container/notifications.container.js";
import { OrdersContainer } from "./orders/container/orders.container.js";
import { PromoCodesContainer } from "./promo-codes/container/promo-codes.container.js";
import { RealtimeContainer } from "./realtime/container/realtime.container.js";
import { RetentionContainer } from "./retention/container/retention.container.js";
import { SettingsContainer } from "./settings/container/settings.container.js";
import { TiersContainer } from "./tiers/container/tiers.container.js";
import { UsersContainer } from "./users/container/users.container.js";

export interface Modules {
    readonly settings: SettingsContainer;
    readonly files: FilesContainer;
    readonly realtime: RealtimeContainer;
    readonly notifications: NotificationsContainer;
    readonly catalog: CatalogContainer;
    readonly ingredients: IngredientsContainer;
    readonly tiers: TiersContainer;
    readonly promoCodes: PromoCodesContainer;
    readonly orders: OrdersContainer;
    readonly users: UsersContainer;
    readonly auth: AuthContainer;
    readonly kitchen: KitchenContainer;
    readonly delivery: DeliveryContainer;
    readonly retention: RetentionContainer;
}

export function createModules(deps: ModuleDeps): Modules {
    const settings: SettingsContainer = new SettingsContainer(deps);
    const files: FilesContainer = new FilesContainer(deps);
    const realtime: RealtimeContainer = new RealtimeContainer(deps);
    const notifications: NotificationsContainer = new NotificationsContainer({
        ...deps,
        realtime: realtime.service,
        recipients: {
            listActiveUserIds: role => users.service.listActiveUserIds(role),
            countActiveUsers: role => users.service.countActiveUsers(role),
            filterActiveUserIds: (ids, role) => users.service.filterActiveUserIds(ids, role),
        },
        targets: {
            findMissingPackageIds: ids => catalog.service.findMissingPackageIds(ids),
            findMissingScheduleIds: ids => catalog.service.findMissingScheduleIds(ids),
        },
        audience: {
            findCustomerIdsForPackage: (packageId, today) => orders.service.findCustomerIdsForPackage(packageId, today),
            findCustomerIdsForSchedule: scheduleId => orders.service.findCustomerIdsForSchedule(scheduleId),
            findAnnouncementTargetsOf: (userId, today) => orders.service.findAnnouncementTargetsOf(userId, today),
        },
    });
    const catalog: CatalogContainer = new CatalogContainer({
        ...deps,
        photoKeys: files.service,
        ingredients: {
            findMissingIngredientIds: ids => ingredients.service.findMissingIngredientIds(ids),
            getIngredientsByIds: ids => ingredients.service.getIngredientsByIds(ids),
        },
        announcer: notifications.service,
        orderActivity: {
            countActiveSubscribers: (packageIds, today) => orders.service.countActiveSubscribers(packageIds, today),
            findSchedulesWithOrders: (scheduleIds, statuses) =>
                orders.service.findSchedulesWithOrders(scheduleIds, statuses),
            findSchedulesUsingAlternative: scheduleIds => orders.service.findSchedulesUsingAlternative(scheduleIds),
            findSubscriptionPeriods: scheduleIds => orders.service.findSubscriptionPeriods(scheduleIds),
            deleteInactiveSlots: scheduleIds => orders.service.deleteInactiveSlots(scheduleIds),
        },
    });
    const ingredients: IngredientsContainer = new IngredientsContainer({
        ...deps,
        photoKeys: files.service,
        allergies: catalog.service,
        menus: catalog.service,
        portions: { countPortionsBySchedule: scheduleIds => orders.service.countPortionsBySchedule(scheduleIds) },
    });
    const tiers: TiersContainer = new TiersContainer({
        ...deps,
        photoKeys: files.service,
        orderStats: {
            countPaidServiceDays: userId => orders.service.countPaidServiceDays(userId),
            sumTierDiscounts: tierIds => orders.service.sumTierDiscounts(tierIds),
        },
    });
    const promoCodes: PromoCodesContainer = new PromoCodesContainer({
        ...deps,
        promoUsage: {
            countPromoUses: ids => orders.service.countPromoUses(ids),
            countPromoUsesByUser: (promoCodeId, userId) => orders.service.countPromoUsesByUser(promoCodeId, userId),
            hasPendingSubscriptions: promoCodeId => orders.service.hasPendingSubscriptions(promoCodeId),
        },
    });
    const orders: OrdersContainer = new OrdersContainer({
        ...deps,
        catalog: catalog.service,
        settings: settings.service,
        tierDiscounts: tiers.service,
        promoChecker: promoCodes.service,
        notifier: notifications.service,
        realtime: realtime.service,
        obstacles: { findObstaclesByOrderIds: ids => delivery.service.findObstaclesByOrderIds(ids) },
        shoppingList: ingredients.service,
        unreadCount: notifications.service,
        customers: {
            getAllergyProfiles: ids => users.service.getAllergyProfiles(ids),
            filterActiveUserIds: (ids, role) => users.service.filterActiveUserIds(ids, role),
            getSummaries: ids => users.service.getSummaries(ids),
        },
    });
    const users: UsersContainer = new UsersContainer({
        ...deps,
        allergies: catalog.service,
        memberships: tiers.service,
        subscriptions: orders.service,
        sessions: { revokeSessionsOfUser: userId => auth.service.revokeSessionsOfUser(userId) },
    });
    const auth: AuthContainer = new AuthContainer({ ...deps, users: users.service });
    const kitchen: KitchenContainer = new KitchenContainer({
        ...deps,
        catalog: catalog.service,
        slots: orders.service,
        customers: users.service,
    });
    const delivery: DeliveryContainer = new DeliveryContainer({
        ...deps,
        catalog: catalog.service,
        slots: orders.service,
        users: users.service,
        notifier: notifications.service,
        realtime: realtime.service,
        photoKeys: files.service,
    });
    const retention: RetentionContainer = new RetentionContainer(deps);

    return {
        settings,
        files,
        realtime,
        notifications,
        catalog,
        ingredients,
        tiers,
        promoCodes,
        orders,
        users,
        auth,
        kitchen,
        delivery,
        retention,
    };
}
