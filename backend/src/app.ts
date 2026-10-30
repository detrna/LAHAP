import express, { type Express } from "express";
import helmet from "helmet";
import { errorHandler } from "./http/middleware/index.js";
import type { Infrastructure } from "./infrastructure/index.js";

export function createApp(infrastructure: Infrastructure): Express {
    const app = express();
    app.use(helmet());
    app.use(express.json());

    app.get("/health", (_req, res) => res.json({ status: "ok" }));

    app.use(errorHandler({ logger: infrastructure.logger }));

    return app;
}
