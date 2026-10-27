import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";
import "dotenv/config";
import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
    orm: ormConfig({
        contract: "./src/infrastructure/database/prisma/contract.prisma",
        migrations: {
            dir: "./src/infrastructure/database/prisma/migrations",
        },
        db: {
            connection: process.env["DB_URL"]!,
        },
    }),
});
