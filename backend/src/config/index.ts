import "dotenv/config";
import z from "zod";
import { appEnvSchema, toAppConfig, type AppConfig } from "./app.js";
import { dbEnvSchema, toDatabaseConfig, type DatabaseConfig } from "./db.js";
import { jwtEnvSchema, toJwtConfig, type JwtConfig } from "./jwt.js";

export interface Config {
    readonly APP: AppConfig;
    readonly DATABASE: DatabaseConfig;
    readonly JWT: JwtConfig;
}

export const parseEnv = <T>(schema: { parse: (value: unknown) => T }, value: unknown = process.env) => {
    try {
        return schema.parse(value);
    } catch (error) {
        throw new Error(`Invalid environment configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
};

const envSchema = z.object({
    ...appEnvSchema.shape,
    ...dbEnvSchema.shape,
    ...jwtEnvSchema.shape,
});

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => {
    const parsed = parseEnv(envSchema, env);

    return {
        APP: toAppConfig(parsed),
        DATABASE: toDatabaseConfig(parsed),
        JWT: toJwtConfig(parsed),
    };
};
