import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../config/index.js";
import { loadRedisCache, type RedisCache } from "../../infrastructure/cache/redis/redis.js";
import { errorHandler } from "./error-handler.js";
import { rateLimit } from "./rate-limit.js";

const config = loadConfig();

describe("rateLimit middleware (integration)", () => {
    let cache: RedisCache;

    beforeAll(async () => {
        cache = await loadRedisCache({ ...config.REDIS, KEY_PREFIX: `gtnic-it:${randomUUID()}:` });
    });

    afterAll(async () => {
        await cache?.close();
    });

    function createTestApp() {
        const app = express();
        app.post("/auth/login", rateLimit({ cache, name: "login", limit: 2, windowSeconds: 60 }), (_req, res) => {
            res.json({ data: { ok: true } });
        });
        app.use(errorHandler());
        return app;
    }

    it("allows the limit, then answers 429 with Retry-After", async () => {
        const app = createTestApp();

        expect((await request(app).post("/auth/login")).status).toBe(200);
        expect((await request(app).post("/auth/login")).status).toBe(200);

        const blocked = await request(app).post("/auth/login");
        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual({
            error: { code: "TOO_MANY_REQUESTS", message: "too many requests, try again later" },
        });
        const retryAfter = Number(blocked.headers["retry-after"]);
        expect(retryAfter).toBeGreaterThan(0);
        expect(retryAfter).toBeLessThanOrEqual(60);
    });
});
