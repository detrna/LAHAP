import express, { type Express } from "express";
import helmet from "helmet";
import { corsPolicy, errorHandler, requestLogger } from "./http/middleware/index.js";
import { AuthContainer } from "./modules/auth/container/auth.container.js";
import { CatalogContainer } from "./modules/catalog/container/catalog.container.js";
import { noOrderActivity } from "./modules/catalog/service/interfaces/order-activity.js";
import { DeliveryContainer } from "./modules/delivery/container/delivery.container.js";
import { FilesContainer } from "./modules/files/container/files.container.js";
import { IngredientsContainer } from "./modules/ingredients/container/ingredients.container.js";
import { noPortionCounts } from "./modules/ingredients/service/interfaces/portion-counts.js";
import { KitchenContainer } from "./modules/kitchen/container/kitchen.container.js";
import type { ModuleDeps } from "./modules/module-deps.js";
import { NotificationsContainer } from "./modules/notifications/container/notifications.container.js";
import { noAnnouncementAudience } from "./modules/notifications/service/interfaces/announcement-audience.js";
import { OrdersContainer } from "./modules/orders/container/orders.container.js";
import { PromoCodesContainer } from "./modules/promo-codes/container/promo-codes.container.js";
import { noPromoUsage } from "./modules/promo-codes/service/interfaces/promo-usage.js";
import { RealtimeContainer } from "./modules/realtime/container/realtime.container.js";
import { RetentionContainer } from "./modules/retention/container/retention.container.js";
import { SettingsContainer } from "./modules/settings/container/settings.container.js";
import { TiersContainer } from "./modules/tiers/container/tiers.container.js";
import { noOrderStats } from "./modules/tiers/service/interfaces/order-stats.js";
import { UsersContainer } from "./modules/users/container/users.container.js";

export interface App {
    readonly app: Express;
    start(): Promise<void>;
    close(): Promise<void>;
}

export function createApp(deps: ModuleDeps): App {
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
        audience: noAnnouncementAudience,
    });
    const catalog: CatalogContainer = new CatalogContainer({
        ...deps,
        photoKeys: files.service,
        ingredients: {
            findMissingIngredientIds: ids => ingredients.service.findMissingIngredientIds(ids),
            getIngredientsByIds: ids => ingredients.service.getIngredientsByIds(ids),
        },
        orderActivity: noOrderActivity,
    });
    const ingredients: IngredientsContainer = new IngredientsContainer({
        ...deps,
        photoKeys: files.service,
        allergies: catalog.service,
        menus: catalog.service,
        portions: noPortionCounts,
    });
    const tiers: TiersContainer = new TiersContainer({
        ...deps,
        photoKeys: files.service,
        orderStats: noOrderStats,
    });
    const promoCodes: PromoCodesContainer = new PromoCodesContainer({ ...deps, promoUsage: noPromoUsage });
    const orders: OrdersContainer = new OrdersContainer(deps);
    const users: UsersContainer = new UsersContainer({
        ...deps,
        allergies: catalog.service,
        memberships: tiers.service,
        subscriptions: orders.service,
        sessions: { revokeSessionsOfUser: userId => auth.service.revokeSessionsOfUser(userId) },
    });
    const auth: AuthContainer = new AuthContainer({ ...deps, users: users.service });
    const kitchen: KitchenContainer = new KitchenContainer(deps);
    const delivery: DeliveryContainer = new DeliveryContainer(deps);
    const retention: RetentionContainer = new RetentionContainer(deps);

    const app = express();
    app.set("trust proxy", deps.http.TRUST_PROXY);
    app.use(requestLogger({ logger: deps.adapters.logger }));
    app.use(helmet());
    app.use(corsPolicy({ origins: deps.http.CORS_ORIGINS }));
    app.use(express.json());

    app.get("/health", (_req, res) => res.json({ status: "ok" }));

    const api = express.Router();
    api.use(auth.router);
    api.use(users.router);
    api.use(settings.router);
    api.use(files.router);
    api.use(realtime.router);
    api.use(notifications.router);
    api.use(catalog.router);
    api.use(ingredients.router);
    api.use(tiers.router);
    api.use(promoCodes.router);
    api.use(orders.router);
    api.use(kitchen.router);
    api.use(delivery.router);
    api.use(retention.router);
    app.use("/api", api);

    app.use(errorHandler({ logger: deps.adapters.logger }));

    return {
        app,
        start: () => realtime.service.start(),
        close: () => realtime.service.close(),
    };
}
