import type { Temporal as TemporalApi } from "temporal-polyfill";

export type { TemporalApi as TemporalTypes };

export const Temporal = (globalThis as unknown as { readonly Temporal: typeof TemporalApi }).Temporal;

export const SEED_TIME_ZONE = "Asia/Jakarta";
