import express, { type Express } from "express";
import helmet from "helmet";
import { errorHandler } from "./http/middleware/index.js";
import type { ModuleDeps } from "./modules/module-deps.js";
import { AuthContainer } from "./modules/auth/container/auth.container.js";
import { UsersContainer } from "./modules/users/container/users.container.js";
import { SettingsContainer } from "./modules/settings/container/settings.container.js";
import { FilesContainer } from "./modules/files/container/files.container.js";
import { RealtimeContainer } from "./modules/realtime/container/realtime.container.js";
import { NotificationsContainer } from "./modules/notifications/container/notifications.container.js";
import { CatalogContainer } from "./modules/catalog/container/catalog.container.js";
import { IngredientsContainer } from "./modules/ingredients/container/ingredients.container.js";
import { TiersContainer } from "./modules/tiers/container/tiers.container.js";
import { PromoCodesContainer } from "./modules/promo-codes/container/promo-codes.container.js";
import { OrdersContainer } from "./modules/orders/container/orders.container.js";
import { KitchenContainer } from "./modules/kitchen/container/kitchen.container.js";
import { DeliveryContainer } from "./modules/delivery/container/delivery.container.js";
import { RetentionContainer } from "./modules/retention/container/retention.container.js";

export function createApp(deps: ModuleDeps): Express {
    const auth = new AuthContainer(deps);
    const users = new UsersContainer(deps);
    const settings = new SettingsContainer(deps);
    const files = new FilesContainer(deps);
    const realtime = new RealtimeContainer(deps);
    const notifications = new NotificationsContainer(deps);
    const catalog = new CatalogContainer(deps);
    const ingredients = new IngredientsContainer(deps);
    const tiers = new TiersContainer(deps);
    const promoCodes = new PromoCodesContainer(deps);
    const orders = new OrdersContainer(deps);
    const kitchen = new KitchenContainer(deps);
    const delivery = new DeliveryContainer(deps);
    const retention = new RetentionContainer(deps);

    const app = express();
    app.use(helmet());
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

    return app;
}
