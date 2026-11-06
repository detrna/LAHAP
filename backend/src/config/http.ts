import { z } from "zod";

export type TrustProxySetting = boolean | number | string;

export const COOKIE_SAME_SITE_VALUES = ["lax", "strict", "none"] as const;
export type CookieSameSite = (typeof COOKIE_SAME_SITE_VALUES)[number];

export interface HttpConfig {
    readonly CORS_ORIGINS: readonly string[];
    readonly TRUST_PROXY: TrustProxySetting;
    readonly UPLOAD_MAX_BYTES: number;
    readonly AUTH_RATE_LIMIT_MAX: number;
    readonly AUTH_RATE_LIMIT_WINDOW_SECONDS: number;
    readonly AUTH_COOKIE_NAME: string;
    readonly AUTH_COOKIE_SAME_SITE: CookieSameSite;
    readonly AUTH_COOKIE_SECURE: boolean;
    readonly REALTIME_PING_INTERVAL_SECONDS: number;
    readonly REALTIME_MAX_CONNECTIONS_PER_USER: number;
    readonly REALTIME_MAX_CONNECTIONS: number;
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
    UPLOAD_MAX_BYTES: z.coerce
        .number()
        .int()
        .positive()
        .default(5 * 1024 * 1024),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
    AUTH_COOKIE_NAME: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9_-]+$/, "must contain only letters, digits, _ and -")
        .default("lahap_refresh"),
    AUTH_COOKIE_SAME_SITE: z.enum(COOKIE_SAME_SITE_VALUES).default("lax"),
    AUTH_COOKIE_SECURE: z
        .enum(["true", "false"])
        .default("false")
        .transform(value => value === "true"),
    REALTIME_PING_INTERVAL_SECONDS: z.coerce.number().int().positive().default(25),
    REALTIME_MAX_CONNECTIONS_PER_USER: z.coerce.number().int().positive().default(5),
    REALTIME_MAX_CONNECTIONS: z.coerce.number().int().positive().default(1000),
});

export type HttpEnv = z.output<typeof httpEnvSchema>;

export const toHttpConfig = (env: HttpEnv): HttpConfig => {
    if (env.AUTH_COOKIE_SAME_SITE === "none" && !env.AUTH_COOKIE_SECURE) {
        throw new Error("AUTH_COOKIE_SECURE must be true when AUTH_COOKIE_SAME_SITE is none");
    }
    return {
        CORS_ORIGINS: env.CORS_ORIGINS,
        TRUST_PROXY: env.TRUST_PROXY,
        UPLOAD_MAX_BYTES: env.UPLOAD_MAX_BYTES,
        AUTH_RATE_LIMIT_MAX: env.AUTH_RATE_LIMIT_MAX,
        AUTH_RATE_LIMIT_WINDOW_SECONDS: env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
        AUTH_COOKIE_NAME: env.AUTH_COOKIE_NAME,
        AUTH_COOKIE_SAME_SITE: env.AUTH_COOKIE_SAME_SITE,
        AUTH_COOKIE_SECURE: env.AUTH_COOKIE_SECURE,
        REALTIME_PING_INTERVAL_SECONDS: env.REALTIME_PING_INTERVAL_SECONDS,
        REALTIME_MAX_CONNECTIONS_PER_USER: env.REALTIME_MAX_CONNECTIONS_PER_USER,
        REALTIME_MAX_CONNECTIONS: env.REALTIME_MAX_CONNECTIONS,
    };
};

export const loadHttpConfig = (env: NodeJS.ProcessEnv = process.env): HttpConfig =>
    toHttpConfig(httpEnvSchema.parse(env));
