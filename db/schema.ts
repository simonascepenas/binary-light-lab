import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  teacherToken: text('teacher_token').notNull(),
  title: text('title').notNull(),
  taskType: text('task_type').notNull(),
  level: integer('level').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('idx_sessions_code').on(table.code),
  uniqueIndex('idx_sessions_teacher_token').on(table.teacherToken),
]);

export const sessionStudents = sqliteTable('session_students', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull(),
  displayName: text('display_name').notNull(),
  joinedAt: text('joined_at').notNull(),
}, (table) => [
  uniqueIndex('idx_session_students_session_name').on(table.sessionId, table.displayName),
]);

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
  sessionId: integer('session_id'),
  studentId: integer('student_id'),
}, (table) => [
  index('idx_results_score_duration').on(table.score, table.durationSeconds),
  index('idx_results_session_student').on(table.sessionId, table.studentId),
]);
