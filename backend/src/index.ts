import { z } from "zod";
import { createApp } from "./app.js";
import { loadConfig } from "./config/index.js";
import { createDb, verifyConnection } from "./infrastructure/database/prisma/db.js";

async function bootstrap() {
    try {
        const config = loadConfig();

        const db = createDb(config.DATABASE);
        await verifyConnection(db);
        console.log("Database connected successfully");

        const app = createApp();

        const server = app.listen(config.APP.PORT, () => {
            console.log(`Server is running on port ${config.APP.PORT}`);
        });

        const shutdown = () => {
            server.close(async () => {
                await db.close();
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
