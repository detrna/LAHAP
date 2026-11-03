import express, { type Express } from "express";
import helmet from "helmet";
import { errorHandler } from "./http/middleware/index.js";
import type { ModuleDeps } from "./modules/module-deps.js";
import { UsersContainer } from "./modules/users/container/users.container.js";

export function createApp(deps: ModuleDeps): Express {
    // Create containers in dependency order; pass services (never repositories) across modules.
    const users = new UsersContainer(deps);

    const app = express();
    app.use(helmet());
    app.use(express.json());

    app.get("/health", (_req, res) => res.json({ status: "ok" }));

    const api = express.Router();
    api.use(users.router);
    app.use("/api", api);

    app.use(errorHandler({ logger: deps.adapters.logger }));

    return app;
}
