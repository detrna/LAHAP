import { z } from "zod";
import { createApp } from "./app.js";
import { loadConfig } from "./config/index.js";
import { loadDatabase } from "./infrastructure/database/prisma/db.js";
import { createInfrastructure } from "./infrastructure/index.js";

async function bootstrap() {
    try {
        const config = loadConfig();

        const db = await loadDatabase(config.DATABASE);
        console.log("Database connected successfully");

        const infrastructure = await createInfrastructure(config);
        console.log("Infrastructure initialized successfully");

        const app = createApp(infrastructure);
        const server = app.listen(config.APP.PORT, () => {
            console.log(`Server is running on port ${config.APP.PORT}`);
        });

        const shutdown = () => {
            server.close(async () => {
                await Promise.all([db.close(), infrastructure.cache.close()]);
                process.exit(0);
            });
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
    } catch (err) {
        if (err instanceof z.ZodError) {
            console.error("Invalid configuration:");
            for (const issue of err.issues) {
                console.error(`  ${issue.path.join(".")}: ${issue.message}`);
            }
        } else {
            console.error("Startup failed:", err);
        }
        process.exit(1);
    }
}

await bootstrap();
