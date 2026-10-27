import { z } from "zod";

export interface JwtConfig {
    readonly SECRET: string;
    readonly EXPIRES_IN: string;
    readonly REFRESH_SECRET: string;
    readonly REFRESH_EXPIRES_IN: string;
    readonly ALGORITHM: string;
    readonly ISSUER: string;
    readonly AUDIENCE: string;
}

export const jwtEnvSchema = z.object({
    JWT_SECRET: z.string().min(1).default("change-me"),
    JWT_EXPIRES_IN: z.string().default("1h"),
    JWT_REFRESH_SECRET: z.string().default("change-me"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
    JWT_ALGORITHM: z.string().default("HS256"),
    JWT_ISSUER: z.string().default("gtnic"),
    JWT_AUDIENCE: z.string().default("gtnic-users"),
});

export type JwtEnv = z.output<typeof jwtEnvSchema>;

export const toJwtConfig = (env: JwtEnv): JwtConfig => ({
    SECRET: env.JWT_SECRET,
    EXPIRES_IN: env.JWT_EXPIRES_IN,
    REFRESH_SECRET: env.JWT_REFRESH_SECRET,
    REFRESH_EXPIRES_IN: env.JWT_REFRESH_EXPIRES_IN,
    ALGORITHM: env.JWT_ALGORITHM,
    ISSUER: env.JWT_ISSUER,
    AUDIENCE: env.JWT_AUDIENCE,
});

export const loadJwtConfig = (env: NodeJS.ProcessEnv = process.env): JwtConfig => toJwtConfig(jwtEnvSchema.parse(env));
