import { z } from "zod";

export interface DatabaseConfig {
    readonly DATABASE_URL: string;
    readonly DB_USER: string;
    readonly DB_PASSWORD: string;
    readonly DB_NAME: string;
    readonly DB_PORT: number;
}

export const dbEnvSchema = z.object({
    DB_URL: z.string().default("postgresql://user:password@localhost:5432/app_db"),
    DB_USER: z.string().default("user"),
    DB_PASSWORD: z.string().default("password"),
    DB_NAME: z.string().default("app_db"),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
});

export type DatabaseEnv = z.output<typeof dbEnvSchema>;

export const toDatabaseConfig = (env: DatabaseEnv): DatabaseConfig => ({
    DATABASE_URL: env.DB_URL,
    DB_USER: env.DB_USER,
    DB_PASSWORD: env.DB_PASSWORD,
    DB_NAME: env.DB_NAME,
    DB_PORT: env.DB_PORT,
});
