#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/161ce6699b6059d266ed6ff9435e298d561f532a61d5e049f8e99ba0b9e3c717/contract';
import startContract from '../../snapshots/161ce6699b6059d266ed6ff9435e298d561f532a61d5e049f8e99ba0b9e3c717/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f8dd7e04764ab17064c1bc8ea93eafd9299ba58549f49cd48643664961879fea/contract';
import endContract from '../../snapshots/f8dd7e04764ab17064c1bc8ea93eafd9299ba58549f49cd48643664961879fea/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';

const { sql: db, raw, contract } = postgres({ contract: contractFromJson<End>(endContract) });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('service_date', 'date', { codecRef: { codecId: 'pg/date-temporal@1' } }),
      }),
      this.dataTransform(contract, 'backfill-order-service_date', {
        backfillsColumn: { schema: 'public', table: 'order', column: 'service_date' },
        check: () => db.public.order.select('id').where((f, fns) => fns.eq(f.service_date, null)).limit(1),
        run: () =>
          raw.sql`UPDATE "order" SET service_date = schedule.date FROM schedule WHERE schedule.id = "order".menu_schedule_id AND "order".service_date IS NULL`
            .affectedCount()
            .build(),
      }),
      this.setNotNull({ schema: 'public', table: 'order', column: 'service_date' }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_service_date_idx_7d824af3',
        columns: ['service_date'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
