import { env } from 'cloudflare:workers';

export type SavedResult = {
  id: number;
  displayName: string;
  classCode: string;
  score: number;
  accuracy: number;
  durationSeconds: number;
  mistakes: number;
  taskType: 'numbers' | 'words' | 'sentences' | 'mixed';
  level: number;
  questionsTotal: number;
  completedAt: string;
};

async function ensureSchema() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name TEXT NOT NULL,
    class_code TEXT NOT NULL DEFAULT '',
    score INTEGER NOT NULL,
    accuracy INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    mistakes INTEGER NOT NULL,
    task_type TEXT NOT NULL DEFAULT 'mixed',
    level INTEGER NOT NULL DEFAULT 0,
    questions_total INTEGER NOT NULL DEFAULT 5,
    completed_at TEXT NOT NULL
  )`).run();
  const info = await env.DB.prepare('PRAGMA table_info(results)').all<{ name: string }>();
  const columns = new Set(info.results.map((column) => column.name));
  if (!columns.has('task_type')) await env.DB.prepare("ALTER TABLE results ADD COLUMN task_type TEXT NOT NULL DEFAULT 'mixed'").run();
  if (!columns.has('level')) await env.DB.prepare('ALTER TABLE results ADD COLUMN level INTEGER NOT NULL DEFAULT 0').run();
  if (!columns.has('questions_total')) await env.DB.prepare('ALTER TABLE results ADD COLUMN questions_total INTEGER NOT NULL DEFAULT 5').run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_results_score_duration
    ON results(score DESC, duration_seconds ASC)`).run();
}

export async function saveResult(result: Omit<SavedResult, 'id'>) {
  await ensureSchema();
  return env.DB.prepare(`INSERT INTO results
    (display_name, class_code, score, accuracy, duration_seconds, mistakes, task_type, level, questions_total, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(result.displayName, result.classCode, result.score, result.accuracy, result.durationSeconds, result.mistakes, result.taskType, result.level, result.questionsTotal, result.completedAt)
    .run();
}

export async function listResults(limit = 20, classCode = ''): Promise<SavedResult[]> {
  await ensureSchema();
  const query = classCode ? `SELECT
    id, display_name AS displayName, class_code AS classCode, score, accuracy,
    duration_seconds AS durationSeconds, mistakes, task_type AS taskType,
    level, questions_total AS questionsTotal, completed_at AS completedAt
    FROM results WHERE class_code = ? ORDER BY score DESC, duration_seconds ASC LIMIT ?`
    : `SELECT
    id, display_name AS displayName, class_code AS classCode, score, accuracy,
    duration_seconds AS durationSeconds, mistakes, task_type AS taskType,
    level, questions_total AS questionsTotal, completed_at AS completedAt
    FROM results ORDER BY score DESC, duration_seconds ASC LIMIT ?`;
  const statement = env.DB.prepare(query);
  const response = classCode
    ? await statement.bind(classCode, limit).all<SavedResult>()
    : await statement.bind(limit).all<SavedResult>();
  return response.results;
}
