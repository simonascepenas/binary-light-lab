import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const results = sqliteTable('results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  displayName: text('display_name').notNull(),
  classCode: text('class_code').notNull().default(''),
  score: integer('score').notNull(),
  accuracy: integer('accuracy').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  mistakes: integer('mistakes').notNull(),
  completedAt: text('completed_at').notNull(),
}, (table) => [
  index('idx_results_score_duration').on(table.score, table.durationSeconds),
]);
