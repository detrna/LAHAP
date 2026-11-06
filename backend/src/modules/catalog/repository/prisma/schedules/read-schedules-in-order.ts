import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { Db } from "../../../../../infrastructure/database/prisma/db.js";
import type { ScheduleRecord } from "../../../service/interfaces/catalog.repository.js";
import { schedulesWithMenus } from "./queries.js";
import { toScheduleRecord } from "./to-schedule-record.js";

export async function readSchedulesInOrder(orm: Db["orm"], ids: readonly string[]): Promise<ScheduleRecord[]> {
    const rows = await schedulesWithMenus(orm)
        .where(schedule => schedule.id.in(ids as Varchar<36>[]))
        .all();
    const recordById = new Map<string, ScheduleRecord>(rows.map(row => [row.id, toScheduleRecord(row)]));
    return ids.map(id => {
        const record = recordById.get(id);
        if (record === undefined) throw new Error(`schedule ${id} vanished inside its own transaction`);
        return record;
    });
}
