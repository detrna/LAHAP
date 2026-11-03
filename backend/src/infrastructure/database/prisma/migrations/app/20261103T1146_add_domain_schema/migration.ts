#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/77ea4987cffaebf464d37c736e8c2b018e3ceeec4013710ff0e4ebf0d6f5b3ed/contract';
import startContract from '../../snapshots/77ea4987cffaebf464d37c736e8c2b018e3ceeec4013710ff0e4ebf0d6f5b3ed/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/bd11cbb126004cf3cdb8b83400d0a40f6b72b645c129559949f4d3fa9cf68ba6/contract';
import endContract from '../../snapshots/bd11cbb126004cf3cdb8b83400d0a40f6b72b645c129559949f4d3fa9cf68ba6/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'allergy',
        columns: [
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('name', 'character varying(50)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
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
        table: 'announcement',
        columns: [
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('menu_schedule_id', 'character varying(36)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('package_id', 'character varying(36)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('scope', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('title', 'character varying(150)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
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
        table: 'business',
        columns: [
          col('address', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('delivery_free_radius', 'numeric(5,2)', {
            notNull: true,
            default: lit('1.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('delivery_max_distance', 'numeric(5,2)', {
            notNull: true,
            default: lit('10.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('delivery_price_per_km', 'numeric(10,2)', {
            notNull: true,
            default: lit('5000.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('latitude', 'numeric(10,8)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 8 } },
          }),
          col('longitude', 'numeric(11,8)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 11, scale: 8 } },
          }),
          col('name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('payment_timeout_minutes', 'int4', {
            notNull: true,
            default: lit(15),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updated_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('whatsapp_number', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'delivery_obstacle',
        columns: [
          col('author_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('note', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('order_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('photo_key', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ingredient',
        columns: [
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('minimum_threshold', 'numeric(10,2)', {
            notNull: true,
            default: lit('10.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('photo_key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('stock', 'numeric(10,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('unit', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
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
        table: 'ingredient_allergy',
        columns: [
          col('allergy_id', 'character varying(36)', {
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
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'membership',
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
          col('started_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('tier_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
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
      this.createTable({
        schema: 'public',
        table: 'menu',
        columns: [
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('is_alternative', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('photo_key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tags', 'text[]', { notNull: true, codecRef: { codecId: 'pg/text@1', many: true } }),
          col('updated_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'menu_tags_elem_not_null_aecbe9e2',
            sql`array_position("tags", NULL) IS NULL`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'menu_ingredient',
        columns: [
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('ingredient_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('menu_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('quantity_per_portion', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'message_template',
        columns: [
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
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
        table: 'notification',
        columns: [
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('is_read', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('title', 'character varying(150)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
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
      this.createTable({
        schema: 'public',
        table: 'order',
        columns: [
          col('courier_id', 'character varying(36)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('menu_schedule_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('skip_reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('subscription_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('updated_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('uses_alternative_menu', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'order_status_history',
        columns: [
          col('admin_note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('changed_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('changed_by_id', 'character varying(36)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('from_status', 'character varying(30)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('order_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('to_status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'package',
        columns: [
          col('base_price', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('delivery_free_radius', 'numeric(5,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('delivery_max_distance', 'numeric(5,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('delivery_price_per_km', 'numeric(10,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('delivery_times', 'time[]', {
            notNull: true,
            codecRef: { codecId: 'pg/time-temporal@1', many: true },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('end_at', 'timestamp', { codecRef: { codecId: 'pg/timestamp-temporal@1' } }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('is_active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('periods', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('photo_key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('start_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('updated_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'package_delivery_times_elem_not_null_b6b07774',
            sql`array_position("delivery_times", NULL) IS NULL`,
          ),
          checkExpression(
            'package_periods_elem_not_null_37d7d0fb',
            sql`array_position("periods", NULL) IS NULL`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'payment',
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
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('method', 'character varying(50)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
          col('paid_at', 'timestamp', { codecRef: { codecId: 'pg/timestamp-temporal@1' } }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('subscription_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('transaction_id', 'character varying(100)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('type', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
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
      this.createTable({
        schema: 'public',
        table: 'promo_code',
        columns: [
          col('allow_stack_with_tier', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('code', 'character varying(50)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('discount_type', 'character varying(10)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 10 } },
          }),
          col('discount_value', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('is_active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('min_purchase', 'numeric(12,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('quota', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updated_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('valid_until', 'timestamp', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'schedule',
        columns: [
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('date', 'date', { notNull: true, codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('delivery_time', 'time', {
            notNull: true,
            codecRef: { codecId: 'pg/time-temporal@1' },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('is_published', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('package_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
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
        table: 'schedule_menu',
        columns: [
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('is_primary', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('menu_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('schedule_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'subscription',
        columns: [
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
          col('delivery_fee_total', 'numeric(12,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('delivery_latitude', 'numeric(10,8)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 8 } },
          }),
          col('delivery_longitude', 'numeric(11,8)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 11, scale: 8 } },
          }),
          col('end_date', 'date', { notNull: true, codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('food_subtotal', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('is_delivery', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('needs_refund', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('package_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('period', 'character varying(10)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 10 } },
          }),
          col('price_per_portion', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('promo_code_id', 'character varying(36)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('promo_discount', 'numeric(12,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('purchase_type', 'character varying(10)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 10 } },
          }),
          col('recipient_name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('start_date', 'date', { notNull: true, codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('tier_discount', 'numeric(12,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('tier_id', 'character varying(36)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('total_price', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
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
      this.createTable({
        schema: 'public',
        table: 'tier',
        columns: [
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('discount_percent', 'numeric(5,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('duration_days', 'int4', {
            notNull: true,
            default: lit(30),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('name', 'character varying(50)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
          col('photo_key', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('required_subscription_days', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
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
        table: 'user',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('allergy_note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('email', 'character varying(100)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('is_active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('latitude', 'numeric(10,8)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 8 } },
          }),
          col('longitude', 'numeric(11,8)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 11, scale: 8 } },
          }),
          col('name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('password', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('phone', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('role', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
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
        table: 'user_allergy',
        columns: [
          col('allergy_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('created_at', 'timestamp', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-temporal@1' },
          }),
          col('id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
          col('user_id', 'character varying(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 36 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'allergy',
        constraint: 'allergy_name_key',
        columns: ['name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ingredient',
        constraint: 'ingredient_name_key',
        columns: ['name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ingredient_allergy',
        constraint: 'ingredient_allergy_ingredient_id_allergy_id_key',
        columns: ['ingredient_id', 'allergy_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'membership',
        constraint: 'membership_user_id_key',
        columns: ['user_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'menu_ingredient',
        constraint: 'menu_ingredient_menu_id_ingredient_id_key',
        columns: ['menu_id', 'ingredient_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'order',
        constraint: 'order_subscription_id_menu_schedule_id_key',
        columns: ['subscription_id', 'menu_schedule_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'payment',
        constraint: 'payment_transaction_id_key',
        columns: ['transaction_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'promo_code',
        constraint: 'promo_code_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'schedule',
        constraint: 'schedule_package_id_date_delivery_time_key',
        columns: ['package_id', 'date', 'delivery_time'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'schedule_menu',
        constraint: 'schedule_menu_schedule_id_menu_id_key',
        columns: ['schedule_id', 'menu_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'schedule_menu',
        constraint: 'schedule_menu_schedule_id_is_primary_key',
        columns: ['schedule_id', 'is_primary'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tier',
        constraint: 'tier_name_key',
        columns: ['name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tier',
        constraint: 'tier_required_subscription_days_key',
        columns: ['required_subscription_days'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_phone_key',
        columns: ['phone'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user_allergy',
        constraint: 'user_allergy_user_id_allergy_id_key',
        columns: ['user_id', 'allergy_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'announcement',
        index: 'announcement_created_at_idx_225d8c0f',
        columns: ['created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'announcement',
        index: 'announcement_menu_schedule_id_idx_31d1228b',
        columns: ['menu_schedule_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'announcement',
        index: 'announcement_package_id_idx_bbf840ab',
        columns: ['package_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'announcement',
        index: 'announcement_scope_idx_5e57bd12',
        columns: ['scope'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'delivery_obstacle',
        index: 'delivery_obstacle_author_id_idx_f3862461',
        columns: ['author_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'delivery_obstacle',
        index: 'delivery_obstacle_order_id_created_at_idx_7a2aab70',
        columns: ['order_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'delivery_obstacle',
        index: 'delivery_obstacle_order_id_idx_39ad19ad',
        columns: ['order_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ingredient',
        index: 'ingredient_stock_minimum_threshold_idx_e0123a7f',
        columns: ['stock', 'minimum_threshold'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ingredient_allergy',
        index: 'ingredient_allergy_allergy_id_idx_b97c230e',
        columns: ['allergy_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ingredient_allergy',
        index: 'ingredient_allergy_ingredient_id_idx_30032a11',
        columns: ['ingredient_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'membership',
        index: 'membership_expires_at_idx_35365ada',
        columns: ['expires_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'membership',
        index: 'membership_tier_id_idx_a6a1df3c',
        columns: ['tier_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'menu',
        index: 'menu_is_alternative_idx_a72d2138',
        columns: ['is_alternative'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'menu',
        index: 'menu_name_idx_ce87e6ba',
        columns: ['name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'menu_ingredient',
        index: 'menu_ingredient_ingredient_id_idx_30032a11',
        columns: ['ingredient_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'menu_ingredient',
        index: 'menu_ingredient_menu_id_idx_acdcfcd6',
        columns: ['menu_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_created_at_idx_225d8c0f',
        columns: ['created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_user_id_is_read_idx_d34c4b82',
        columns: ['user_id', 'is_read'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_courier_id_idx_8d2a554b',
        columns: ['courier_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_menu_schedule_id_idx_31d1228b',
        columns: ['menu_schedule_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_subscription_id_idx_1e74615f',
        columns: ['subscription_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_status_history',
        index: 'order_status_history_changed_by_id_idx_dd031b3b',
        columns: ['changed_by_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_status_history',
        index: 'order_status_history_order_id_changed_at_idx_7a38ef2f',
        columns: ['order_id', 'changed_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_status_history',
        index: 'order_status_history_order_id_idx_39ad19ad',
        columns: ['order_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'package',
        index: 'package_is_active_idx_68cfa343',
        columns: ['is_active'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'package',
        index: 'package_name_idx_ce87e6ba',
        columns: ['name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payment',
        index: 'payment_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payment',
        index: 'payment_subscription_id_idx_1e74615f',
        columns: ['subscription_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payment',
        index: 'payment_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'promo_code',
        index: 'promo_code_is_active_valid_until_idx_ff091af7',
        columns: ['is_active', 'valid_until'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'schedule',
        index: 'schedule_date_idx_b4ca319c',
        columns: ['date'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'schedule',
        index: 'schedule_is_published_idx_524f5def',
        columns: ['is_published'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'schedule',
        index: 'schedule_package_id_idx_bbf840ab',
        columns: ['package_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'schedule_menu',
        index: 'schedule_menu_menu_id_idx_acdcfcd6',
        columns: ['menu_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'schedule_menu',
        index: 'schedule_menu_schedule_id_idx_83757f9e',
        columns: ['schedule_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'subscription',
        index: 'subscription_needs_refund_idx_12ceb89e',
        columns: ['needs_refund'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'subscription',
        index: 'subscription_package_id_idx_bbf840ab',
        columns: ['package_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'subscription',
        index: 'subscription_promo_code_id_idx_44a32b68',
        columns: ['promo_code_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'subscription',
        index: 'subscription_start_date_end_date_idx_7bb2ae1b',
        columns: ['start_date', 'end_date'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'subscription',
        index: 'subscription_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'subscription',
        index: 'subscription_tier_id_idx_a6a1df3c',
        columns: ['tier_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'subscription',
        index: 'subscription_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user',
        index: 'user_role_idx_2c1ddf83',
        columns: ['role'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user_allergy',
        index: 'user_allergy_allergy_id_idx_b97c230e',
        columns: ['allergy_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user_allergy',
        index: 'user_allergy_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'announcement',
        foreignKey: {
          name: 'announcement_package_id_fkey',
          columns: ['package_id'],
          references: { schema: 'public', table: 'package', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'announcement',
        foreignKey: {
          name: 'announcement_menu_schedule_id_fkey',
          columns: ['menu_schedule_id'],
          references: { schema: 'public', table: 'schedule', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'delivery_obstacle',
        foreignKey: {
          name: 'delivery_obstacle_order_id_fkey',
          columns: ['order_id'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'delivery_obstacle',
        foreignKey: {
          name: 'delivery_obstacle_author_id_fkey',
          columns: ['author_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ingredient_allergy',
        foreignKey: {
          name: 'ingredient_allergy_ingredient_id_fkey',
          columns: ['ingredient_id'],
          references: { schema: 'public', table: 'ingredient', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ingredient_allergy',
        foreignKey: {
          name: 'ingredient_allergy_allergy_id_fkey',
          columns: ['allergy_id'],
          references: { schema: 'public', table: 'allergy', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'membership',
        foreignKey: {
          name: 'membership_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'membership',
        foreignKey: {
          name: 'membership_tier_id_fkey',
          columns: ['tier_id'],
          references: { schema: 'public', table: 'tier', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'menu_ingredient',
        foreignKey: {
          name: 'menu_ingredient_menu_id_fkey',
          columns: ['menu_id'],
          references: { schema: 'public', table: 'menu', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'menu_ingredient',
        foreignKey: {
          name: 'menu_ingredient_ingredient_id_fkey',
          columns: ['ingredient_id'],
          references: { schema: 'public', table: 'ingredient', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order',
        foreignKey: {
          name: 'order_subscription_id_fkey',
          columns: ['subscription_id'],
          references: { schema: 'public', table: 'subscription', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order',
        foreignKey: {
          name: 'order_menu_schedule_id_fkey',
          columns: ['menu_schedule_id'],
          references: { schema: 'public', table: 'schedule', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order',
        foreignKey: {
          name: 'order_courier_id_fkey',
          columns: ['courier_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_status_history',
        foreignKey: {
          name: 'order_status_history_order_id_fkey',
          columns: ['order_id'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_status_history',
        foreignKey: {
          name: 'order_status_history_changed_by_id_fkey',
          columns: ['changed_by_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payment',
        foreignKey: {
          name: 'payment_subscription_id_fkey',
          columns: ['subscription_id'],
          references: { schema: 'public', table: 'subscription', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payment',
        foreignKey: {
          name: 'payment_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'schedule',
        foreignKey: {
          name: 'schedule_package_id_fkey',
          columns: ['package_id'],
          references: { schema: 'public', table: 'package', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'schedule_menu',
        foreignKey: {
          name: 'schedule_menu_schedule_id_fkey',
          columns: ['schedule_id'],
          references: { schema: 'public', table: 'schedule', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'schedule_menu',
        foreignKey: {
          name: 'schedule_menu_menu_id_fkey',
          columns: ['menu_id'],
          references: { schema: 'public', table: 'menu', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'subscription',
        foreignKey: {
          name: 'subscription_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'subscription',
        foreignKey: {
          name: 'subscription_package_id_fkey',
          columns: ['package_id'],
          references: { schema: 'public', table: 'package', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'subscription',
        foreignKey: {
          name: 'subscription_promo_code_id_fkey',
          columns: ['promo_code_id'],
          references: { schema: 'public', table: 'promo_code', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'subscription',
        foreignKey: {
          name: 'subscription_tier_id_fkey',
          columns: ['tier_id'],
          references: { schema: 'public', table: 'tier', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'user_allergy',
        foreignKey: {
          name: 'user_allergy_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'user_allergy',
        foreignKey: {
          name: 'user_allergy_allergy_id_fkey',
          columns: ['allergy_id'],
          references: { schema: 'public', table: 'allergy', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
