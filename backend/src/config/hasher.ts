import { z } from "zod";

export interface HasherConfig {
    readonly SALT_ROUNDS: number;
}

export const hasherEnvSchema = z.object({
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(31).default(10),
});

export type HasherEnv = z.output<typeof hasherEnvSchema>;

export const toHasherConfig = (env: HasherEnv): HasherConfig => ({
    SALT_ROUNDS: env.BCRYPT_SALT_ROUNDS,
});

export const loadHasherConfig = (env: NodeJS.ProcessEnv = process.env): HasherConfig =>
    toHasherConfig(hasherEnvSchema.parse(env));
