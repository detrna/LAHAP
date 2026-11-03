import "dotenv/config";
import { loadAppConfig } from "../../../../config/app.js";
import { dbEnvSchema, toDatabaseConfig } from "../../../../config/db.js";
import { loadHasherConfig } from "../../../../config/hasher.js";
import { DEFAULT_LOGGER_CONFIG, loadLoggerConfig } from "../../../../config/logger.js";
import { parseEnv } from "../../../../config/index.js";
import type { Logger } from "../../../../shared/ports/logger/logger.js";
import { BcryptHasher } from "../../../hasher/bcrypt/bcrypt.js";
import { PinoLogger } from "../../../logger/pino/pino.js";
import { loadDatabase } from "../db.js";
import { seedAllergies } from "./modules/allergies/allergies.seed.js";
import { seedBusiness } from "./modules/business/business.seed.js";
import { seedIngredients } from "./modules/ingredients/ingredients.seed.js";
import { seedMenus } from "./modules/menus/menus.seed.js";
import { seedMessageTemplates } from "./modules/message-templates/message-templates.seed.js";
import { seedPackages } from "./modules/packages/packages.seed.js";
import { seedPromoCodes } from "./modules/promo-codes/promo-codes.seed.js";
import { seedSchedules } from "./modules/schedules/schedules.seed.js";
import { seedTiers } from "./modules/tiers/tiers.seed.js";
import { USERS } from "./modules/users/users.data.js";
import { seedUsers } from "./modules/users/users.seed.js";
import { resetDatabase } from "./reset.js";
import type { SeedModule } from "./seed-context.js";
import { SEED_TIME_ZONE, Temporal } from "./shared/temporal.js";

export const SEED_PASSWORD = "password123";

export const SEED_MODULES: readonly SeedModule[] = [
    { name: "business", run: seedBusiness },
    { name: "allergies", run: seedAllergies },
    { name: "users", run: seedUsers },
    { name: "tiers", run: seedTiers },
    { name: "ingredients", run: seedIngredients },
    { name: "menus", run: seedMenus },
    { name: "packages", run: seedPackages },
    { name: "schedules", run: seedSchedules },
    { name: "promo-codes", run: seedPromoCodes },
    { name: "message-templates", run: seedMessageTemplates },
];

let logger: Logger = new PinoLogger(DEFAULT_LOGGER_CONFIG, { destination: process.stdout });

async function main(): Promise<void> {
    logger = new PinoLogger(loadLoggerConfig(), { destination: process.stdout }).child({ script: "seed" });

    if (loadAppConfig().IS_PRODUCTION) {
        throw new Error("refusing to seed while IS_PRODUCTION=true");
    }

    const reset = process.argv.includes("--reset");
    const db = await loadDatabase(toDatabaseConfig(parseEnv(dbEnvSchema)));
    const hasher = new BcryptHasher(loadHasherConfig());
    const today = Temporal.Now.plainDateISO(SEED_TIME_ZONE);

    const totals: Record<string, number> = {};
    try {
        await db.transaction(async tx => {
            if (reset) {
                await resetDatabase(tx);
                logger.info("truncated all domain tables");
            }
            for (const module of SEED_MODULES) {
                const count = await module.run({
                    tx,
                    hasher,
                    logger: logger.child({ module: module.name }),
                    password: SEED_PASSWORD,
                    today,
                });
                totals[module.name] = count;
                logger.info({ module: module.name, count }, "module seeded");
            }
        });
    } finally {
        await db.close();
    }

    const accounts = USERS.map(({ role, name, phone, email }) => ({ role, name, phone, email }));
    logger.info({ accounts }, `login accounts; every account uses password "${SEED_PASSWORD}"`);
    logger.info({ reset, totals }, "seed completed successfully");
}

main().catch((error: unknown) => {
    logger.error({ error }, "seed failed; the transaction was rolled back and nothing was written");
    process.exitCode = 1;
});
