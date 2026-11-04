#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/161ce6699b6059d266ed6ff9435e298d561f532a61d5e049f8e99ba0b9e3c717/contract';
import endContract from '../../snapshots/161ce6699b6059d266ed6ff9435e298d561f532a61d5e049f8e99ba0b9e3c717/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/bd11cbb126004cf3cdb8b83400d0a40f6b72b645c129559949f4d3fa9cf68ba6/contract';
import startContract from '../../snapshots/bd11cbb126004cf3cdb8b83400d0a40f6b72b645c129559949f4d3fa9cf68ba6/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'refresh_token',
        columns: [
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('expires_at', 'timestamp', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('revoked_at', 'timestamp', { codecRef: { codecId: 'pg/timestamp-temporal@1' } }),
          col('updated_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('user_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refresh_token',
        index: 'refresh_token_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'refresh_token',
        foreignKey: {
          name: 'refresh_token_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
