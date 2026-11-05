import type { Db } from "./db.js";

export type CleanupModel = keyof Db["orm"]["public"];

interface DeletableCollection {
    where(filter: { readonly id: string }): { deleteAndCount(): Promise<number> };
}

export interface CreatedRows {
    track(model: CleanupModel, id: string): string;
    cleanup(): Promise<void>;
}

export function trackCreated(db: Db): CreatedRows {
    const created: { readonly model: CleanupModel; readonly id: string }[] = [];

    return {
        track(model, id) {
            created.push({ model, id });
            return id;
        },
        async cleanup() {
            for (const { model, id } of created.splice(0).reverse()) {
                await (db.orm.public[model] as unknown as DeletableCollection).where({ id }).deleteAndCount();
            }
        },
    };
}
