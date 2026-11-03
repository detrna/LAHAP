import type { Db } from "../db.js";
import type { Hasher } from "../../../../shared/ports/hasher/hasher.js";
import type { Logger } from "../../../../shared/ports/logger/logger.js";
import type { TemporalTypes } from "./shared/temporal.js";

export type SeedTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export interface SeedContext {
    readonly tx: SeedTx;
    readonly hasher: Hasher;
    readonly logger: Logger;
    readonly password: string;
    readonly today: TemporalTypes.PlainDate;
}

export interface SeedModule {
    readonly name: string;
    readonly run: (ctx: SeedContext) => Promise<number>;
}
