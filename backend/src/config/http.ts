import { z } from "zod";

export type TrustProxySetting = boolean | number | string;

export interface HttpConfig {
    readonly CORS_ORIGINS: readonly string[];
    readonly TRUST_PROXY: TrustProxySetting;
    readonly UPLOAD_MAX_BYTES: number;
    readonly AUTH_RATE_LIMIT_MAX: number;
    readonly AUTH_RATE_LIMIT_WINDOW_SECONDS: number;
}

const isExactOrigin = (value: string): boolean => {
    try {
        return new URL(value).origin === value;
    } catch {
        return false;
    }
};

const ORIGIN_MESSAGE = "must be an origin like https://app.example.com (no path or trailing slash)";

const toTrustProxySetting = (value: string): TrustProxySetting => {
    if (value === "true") return true;
    if (value === "false") return false;
    if (/^\d+$/.test(value)) return Number(value);
    return value;
};

export const httpEnvSchema = z.object({
    CORS_ORIGINS: z
        .string()
        .default("http://localhost:3000")
        .transform(value =>
            value
                .split(",")
                .map(origin => origin.trim())
                .filter(origin => origin.length > 0),
        )
        .pipe(z.array(z.string().refine(isExactOrigin, ORIGIN_MESSAGE)).min(1)),
    TRUST_PROXY: z.string().trim().min(1).default("false").transform(toTrustProxySetting),
    UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
});

export type HttpEnv = z.output<typeof httpEnvSchema>;

export const toHttpConfig = (env: HttpEnv): HttpConfig => ({
    CORS_ORIGINS: env.CORS_ORIGINS,
    TRUST_PROXY: env.TRUST_PROXY,
    UPLOAD_MAX_BYTES: env.UPLOAD_MAX_BYTES,
    AUTH_RATE_LIMIT_MAX: env.AUTH_RATE_LIMIT_MAX,
    AUTH_RATE_LIMIT_WINDOW_SECONDS: env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
});

export const loadHttpConfig = (env: NodeJS.ProcessEnv = process.env): HttpConfig =>
    toHttpConfig(httpEnvSchema.parse(env));
