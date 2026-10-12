import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const results = sqliteTable('results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  displayName: text('display_name').notNull(),
  classCode: text('class_code').notNull().default(''),
  score: integer('score').notNull(),
  accuracy: integer('accuracy').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  mistakes: integer('mistakes').notNull(),
  taskType: text('task_type').notNull().default('mixed'),
  level: integer('level').notNull().default(0),
  questionsTotal: integer('questions_total').notNull().default(5),
  completedAt: text('completed_at').notNull(),
}, (table) => [
  index('idx_results_score_duration').on(table.score, table.durationSeconds),
]);
