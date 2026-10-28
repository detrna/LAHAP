import express, { type Express } from "express";
import type { Infrastructure } from "./infrastructure/index.js";

export function createApp(infrastructure: Infrastructure): Express {
    const app = express();
    app.use(express.json());

    app.get("/health", (_req, res) => res.json({ status: "ok" }));

    return app;
}
