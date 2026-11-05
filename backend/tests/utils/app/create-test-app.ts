import { randomUUID } from "node:crypto";
import express, { type Express, type Router } from "express";
import type { HttpConfig } from "../../../src/config/http.js";
import { loadConfig } from "../../../src/config/index.js";
import { errorHandler } from "../../../src/http/middleware/index.js";
import { loadRedisCache } from "../../../src/infrastructure/cache/redis/redis.js";
import { SystemClock } from "../../../src/infrastructure/clock/system/system.js";
import type { Db } from "../../../src/infrastructure/database/prisma/db.js";
import { BcryptHasher } from "../../../src/infrastructure/hasher/bcrypt/bcrypt.js";
import type { Adapters } from "../../../src/infrastructure/index.js";
import type { ModuleDeps } from "../../../src/modules/module-deps.js";
import type { Cache } from "../../../src/shared/ports/cache/cache.js";
import { createTokenProvider } from "../factory/jwt/jwt.js";
import { createMockLogger } from "../mocks/logger.js";

export interface TestAppOptions {
    readonly db: Db;
    readonly mount: (deps: ModuleDeps) => readonly Router[];
    readonly cache?: Cache | undefined;
    readonly http?: Partial<HttpConfig> | undefined;
    readonly adapters?: Partial<Adapters> | undefined;
}

export interface TestApp {
    readonly app: Express;
    readonly deps: ModuleDeps;
    close(): Promise<void>;
}

export async function createTestApp(options: TestAppOptions): Promise<TestApp> {
    const config = loadConfig();
    const ownedCache =
        options.cache === undefined
            ? await loadRedisCache({ ...config.REDIS, KEY_PREFIX: `gtnic-it:${randomUUID()}:` })
            : undefined;
    const adapters = {
        logger: createMockLogger(),
        clock: new SystemClock(),
        hasher: new BcryptHasher({ SALT_ROUNDS: 4 }),
        tokenProvider: createTokenProvider(),
        cache: options.cache ?? ownedCache,
        ...options.adapters,
    } as Adapters;
    const deps: ModuleDeps = { db: options.db, adapters, http: { ...config.HTTP, ...options.http } };

    const app = express();
    app.use(express.json());
    app.use("/api", ...options.mount(deps));
    app.use(errorHandler());

    return {
        app,
        deps,
        async close() {
            await ownedCache?.close();
        },
    };
}
