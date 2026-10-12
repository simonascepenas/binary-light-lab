import { env } from 'cloudflare:workers';

export type SavedResult = {
  id: number;
  displayName: string;
  classCode: string;
  score: number;
  accuracy: number;
  durationSeconds: number;
  mistakes: number;
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
    completed_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_results_score_duration
    ON results(score DESC, duration_seconds ASC)`).run();
}

export async function saveResult(result: Omit<SavedResult, 'id'>) {
  await ensureSchema();
  return env.DB.prepare(`INSERT INTO results
    (display_name, class_code, score, accuracy, duration_seconds, mistakes, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(result.displayName, result.classCode, result.score, result.accuracy, result.durationSeconds, result.mistakes, result.completedAt)
    .run();
}

export async function listResults(limit = 20): Promise<SavedResult[]> {
  await ensureSchema();
  const response = await env.DB.prepare(`SELECT
    id, display_name AS displayName, class_code AS classCode, score, accuracy,
    duration_seconds AS durationSeconds, mistakes, completed_at AS completedAt
    FROM results ORDER BY score DESC, duration_seconds ASC LIMIT ?`)
    .bind(limit)
    .all<SavedResult>();
  return response.results;
}
