import { z } from "zod";

export interface AppConfig {
    readonly IS_PRODUCTION: boolean;
    readonly PORT: number;
}

export const appEnvSchema = z.object({
    IS_PRODUCTION: z
        .enum(["true", "false"])
        .default("false")
        .transform(v => v === "true"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
});

export type AppEnv = z.output<typeof appEnvSchema>;

export const toAppConfig = (env: AppEnv): AppConfig => ({
    IS_PRODUCTION: env.IS_PRODUCTION,
    PORT: env.PORT,
});

export const loadAppConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig =>
    toAppConfig(appEnvSchema.parse(env));
