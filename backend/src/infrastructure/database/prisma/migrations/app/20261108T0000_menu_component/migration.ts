#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0a20c98b56378e59c979ccae2f886d55cbfc1052faf3d77a07597ead00714174/contract';
import startContract from '../../snapshots/0a20c98b56378e59c979ccae2f886d55cbfc1052faf3d77a07597ead00714174/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f5b6ce37bc096ab267ef9bca3934f4ffa7beed0da832c6c5eb3c0ec3ce26d1c8/contract';
import endContract from '../../snapshots/f5b6ce37bc096ab267ef9bca3934f4ffa7beed0da832c6c5eb3c0ec3ce26d1c8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'menu_component',
        columns: [
          col('cook_id', 'character varying(36)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('menu_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'menu_component',
        constraint: 'menu_component_menu_id_name_key',
        columns: ['menu_id', 'name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'menu_component',
        index: 'menu_component_cook_id_idx_21278fc4',
        columns: ['cook_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'menu_component',
        index: 'menu_component_menu_id_idx_acdcfcd6',
        columns: ['menu_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'menu_component',
        foreignKey: {
          name: 'menu_component_menu_id_fkey',
          columns: ['menu_id'],
          references: { schema: 'public', table: 'menu', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'menu_component',
        foreignKey: {
          name: 'menu_component_cook_id_fkey',
          columns: ['cook_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
