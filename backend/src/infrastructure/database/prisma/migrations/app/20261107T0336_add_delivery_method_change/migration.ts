#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/eaaa12097b855472fefde902e39ad6e7bc2776b0a86bf4289e4cb3b10166896f/contract';
import endContract from '../../snapshots/eaaa12097b855472fefde902e39ad6e7bc2776b0a86bf4289e4cb3b10166896f/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f8dd7e04764ab17064c1bc8ea93eafd9299ba58549f49cd48643664961879fea/contract';
import startContract from '../../snapshots/f8dd7e04764ab17064c1bc8ea93eafd9299ba58549f49cd48643664961879fea/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';

const { sql: db, raw, contract } = postgres({ contract: contractFromJson<End>(endContract) });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'delivery_method_change',
        columns: [
          col('amount', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('delivery_address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('delivery_distance_km', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('delivery_fee_per_slot', 'numeric(10,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('delivery_latitude', 'numeric(10,8)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 8 } },
          }),
          col('delivery_longitude', 'numeric(11,8)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 11, scale: 8 } },
          }),
          col('effective_from', 'date', {
            notNull: true,
            codecRef: { codecId: 'pg/date-temporal@1' },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('needs_refund', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('payment_id', 'character varying(36)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('refunded_at', 'timestamp', { codecRef: { codecId: 'pg/timestamp-temporal@1' } }),
          col('requested_by_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('slot_count', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('subscription_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('to_delivery', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('updated_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'delivery_method_change_slot',
        columns: [
          col('change_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('fee', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('order_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('delivery_fee', 'numeric(10,2)', {
          notNull: true,
          default: lit('0.00'),
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('is_delivery', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
      }),
      this.dataTransform(contract, 'backfill-order-is_delivery', {
        backfillsColumn: { schema: 'public', table: 'order', column: 'is_delivery' },
        check: () => db.public.order.select('id').where((f, fns) => fns.eq(f.is_delivery, null)).limit(1),
        run: () =>
          raw.sql`UPDATE "order" SET is_delivery = subscription.is_delivery, delivery_fee = CASE WHEN subscription.is_delivery THEN subscription.delivery_fee_per_slot ELSE 0 END FROM subscription WHERE subscription.id = "order".subscription_id AND "order".is_delivery IS NULL`
            .affectedCount()
            .build(),
      }),
      this.setNotNull({ schema: 'public', table: 'order', column: 'is_delivery' }),
      this.addUnique({
        schema: 'public',
        table: 'delivery_method_change',
        constraint: 'delivery_method_change_payment_id_key',
        columns: ['payment_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'delivery_method_change_slot',
        constraint: 'delivery_method_change_slot_change_id_order_id_key',
        columns: ['change_id', 'order_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'delivery_method_change',
        index: 'delivery_method_change_needs_refund_idx_12ceb89e',
        columns: ['needs_refund'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'delivery_method_change',
        index: 'delivery_method_change_requested_by_id_idx_d76f2dd3',
        columns: ['requested_by_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'delivery_method_change',
        index: 'delivery_method_change_subscription_id_idx_1e74615f',
        columns: ['subscription_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'delivery_method_change_slot',
        index: 'delivery_method_change_slot_change_id_idx_582c0040',
        columns: ['change_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'delivery_method_change_slot',
        index: 'delivery_method_change_slot_order_id_idx_39ad19ad',
        columns: ['order_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'delivery_method_change',
        foreignKey: {
          name: 'delivery_method_change_subscription_id_fkey',
          columns: ['subscription_id'],
          references: { schema: 'public', table: 'subscription', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'delivery_method_change',
        foreignKey: {
          name: 'delivery_method_change_requested_by_id_fkey',
          columns: ['requested_by_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'delivery_method_change',
        foreignKey: {
          name: 'delivery_method_change_payment_id_fkey',
          columns: ['payment_id'],
          references: { schema: 'public', table: 'payment', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'delivery_method_change_slot',
        foreignKey: {
          name: 'delivery_method_change_slot_change_id_fkey',
          columns: ['change_id'],
          references: { schema: 'public', table: 'delivery_method_change', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'delivery_method_change_slot',
        foreignKey: {
          name: 'delivery_method_change_slot_order_id_fkey',
          columns: ['order_id'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
