import express, { type Express } from "express";
import helmet from "helmet";
import { corsPolicy, errorHandler, requestLogger, storageProxy } from "./http/middleware/index.js";
import { createModules } from "./modules/create-modules.js";
import type { ModuleDeps } from "./modules/module-deps.js";

export interface App {
    readonly app: Express;
    start(): Promise<void>;
    close(): Promise<void>;
}

export function createApp(deps: ModuleDeps): App {
    const {
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
    } = createModules(deps);

    const app = express();
    app.set("trust proxy", deps.http.TRUST_PROXY);
    app.use(requestLogger({ logger: deps.adapters.logger }));
    app.use(helmet());
    app.use(corsPolicy({ origins: deps.http.CORS_ORIGINS }));
    app.use(express.json());

    app.get("/health", (_req, res) => res.json({ status: "ok" }));
    app.use(storageProxy({ storage: deps.adapters.objectStorage }));

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
