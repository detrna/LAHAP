#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0a20c98b56378e59c979ccae2f886d55cbfc1052faf3d77a07597ead00714174/contract';
import endContract from '../../snapshots/0a20c98b56378e59c979ccae2f886d55cbfc1052faf3d77a07597ead00714174/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/eaaa12097b855472fefde902e39ad6e7bc2776b0a86bf4289e4cb3b10166896f/contract';
import startContract from '../../snapshots/eaaa12097b855472fefde902e39ad6e7bc2776b0a86bf4289e4cb3b10166896f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'ingredient_stock_history',
        columns: [
          col('changed_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('changed_by_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('ingredient_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('new_stock', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('previous_stock', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ingredient_stock_history',
        index: 'ingredient_stock_history_changed_by_id_idx_dd031b3b',
        columns: ['changed_by_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ingredient_stock_history',
        index: 'ingredient_stock_history_ingredient_id_changed_at_idx_4ed4c9fa',
        columns: ['ingredient_id', 'changed_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ingredient_stock_history',
        index: 'ingredient_stock_history_ingredient_id_idx_30032a11',
        columns: ['ingredient_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ingredient_stock_history',
        foreignKey: {
          name: 'ingredient_stock_history_ingredient_id_fkey',
          columns: ['ingredient_id'],
          references: { schema: 'public', table: 'ingredient', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ingredient_stock_history',
        foreignKey: {
          name: 'ingredient_stock_history_changed_by_id_fkey',
          columns: ['changed_by_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
