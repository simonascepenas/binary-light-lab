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
  sessionId?: number | null;
  studentId?: number | null;
};

export type SessionTaskType = 'numbers' | 'words' | 'sentences';
export type ClassroomSession = { id: number; code: string; title: string; taskType: SessionTaskType; level: number; createdAt: string };
export type SessionReportRow = { studentId: number; displayName: string; joinedAt: string; completed: number; score: number | null; accuracy: number | null; durationSeconds: number | null; mistakes: number | null; completedAt: string | null };

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
    completed_at TEXT NOT NULL,
    session_id INTEGER,
    student_id INTEGER
  )`).run();
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      teacher_token TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      task_type TEXT NOT NULL,
      level INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS session_students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      display_name TEXT NOT NULL COLLATE NOCASE,
      joined_at TEXT NOT NULL,
      UNIQUE(session_id, display_name)
    )`),
  ]);
  const info = await env.DB.prepare('PRAGMA table_info(results)').all<{ name: string }>();
  const columns = new Set(info.results.map((column) => column.name));
  if (!columns.has('task_type')) await env.DB.prepare("ALTER TABLE results ADD COLUMN task_type TEXT NOT NULL DEFAULT 'mixed'").run();
  if (!columns.has('level')) await env.DB.prepare('ALTER TABLE results ADD COLUMN level INTEGER NOT NULL DEFAULT 0').run();
  if (!columns.has('questions_total')) await env.DB.prepare('ALTER TABLE results ADD COLUMN questions_total INTEGER NOT NULL DEFAULT 5').run();
  if (!columns.has('session_id')) await env.DB.prepare('ALTER TABLE results ADD COLUMN session_id INTEGER').run();
  if (!columns.has('student_id')) await env.DB.prepare('ALTER TABLE results ADD COLUMN student_id INTEGER').run();
  await env.DB.batch([
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_results_score_duration ON results(score DESC, duration_seconds ASC)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_results_session_student ON results(session_id, student_id)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_session_students_session ON session_students(session_id)`),
  ]);
}

export async function saveResult(result: Omit<SavedResult, 'id'>) {
  await ensureSchema();
  let sessionId: number | null = null;
  let studentId: number | null = null;
  if (result.classCode) {
    const session = await env.DB.prepare('SELECT id, task_type AS taskType, level FROM sessions WHERE code = ?').bind(result.classCode.toUpperCase()).first<{ id: number; taskType: string; level: number }>();
    if (session) {
      if (session.taskType !== result.taskType || session.level !== result.level) throw new Error('This result does not match the session assignment.');
      const student = await env.DB.prepare('SELECT id FROM session_students WHERE session_id = ? AND display_name = ? COLLATE NOCASE').bind(session.id, result.displayName).first<{ id: number }>();
      if (!student) throw new Error('Join the session before submitting the assignment.');
      sessionId = session.id;
      studentId = student.id;
    }
  }
  return env.DB.prepare(`INSERT INTO results
    (display_name, class_code, score, accuracy, duration_seconds, mistakes, task_type, level, questions_total, completed_at, session_id, student_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(result.displayName, result.classCode, result.score, result.accuracy, result.durationSeconds, result.mistakes, result.taskType, result.level, result.questionsTotal, result.completedAt, sessionId, studentId)
    .run();
}

export async function createSession(input: { title: string; taskType: SessionTaskType; level: number }) {
  await ensureSchema();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const values = crypto.getRandomValues(new Uint8Array(6));
    const code = [...values].map((value) => alphabet[value % alphabet.length]).join('');
    const teacherToken = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
    const createdAt = new Date().toISOString();
    try {
      await env.DB.prepare('INSERT INTO sessions (code, teacher_token, title, task_type, level, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(code, teacherToken, input.title, input.taskType, input.level, createdAt).run();
      return { code, teacherToken, title: input.title, taskType: input.taskType, level: input.level, createdAt };
    } catch (error) {
      if (attempt === 7) throw error;
    }
  }
  throw new Error('Could not create a unique session code.');
}

export async function getPublicSession(code: string): Promise<ClassroomSession | null> {
  await ensureSchema();
  return env.DB.prepare(`SELECT id, code, title, task_type AS taskType, level, created_at AS createdAt FROM sessions WHERE code = ?`)
    .bind(code.toUpperCase()).first<ClassroomSession>();
}

export async function joinSession(code: string, displayName: string) {
  const session = await getPublicSession(code);
  if (!session) return null;
  await env.DB.prepare(`INSERT INTO session_students (session_id, display_name, joined_at) VALUES (?, ?, ?)
    ON CONFLICT(session_id, display_name) DO NOTHING`).bind(session.id, displayName, new Date().toISOString()).run();
  const student = await env.DB.prepare('SELECT id, display_name AS displayName FROM session_students WHERE session_id = ? AND display_name = ? COLLATE NOCASE')
    .bind(session.id, displayName).first<{ id: number; displayName: string }>();
  return { session, student };
}

export async function getSessionReport(code: string, teacherToken: string) {
  await ensureSchema();
  const session = await env.DB.prepare(`SELECT id, code, title, task_type AS taskType, level, created_at AS createdAt FROM sessions WHERE code = ? AND teacher_token = ?`)
    .bind(code.toUpperCase(), teacherToken).first<ClassroomSession>();
  if (!session) return null;
  const report = await env.DB.prepare(`SELECT s.id AS studentId, s.display_name AS displayName, s.joined_at AS joinedAt,
    CASE WHEN r.id IS NULL THEN 0 ELSE 1 END AS completed, r.score, r.accuracy,
    r.duration_seconds AS durationSeconds, r.mistakes, r.completed_at AS completedAt
    FROM session_students s
    LEFT JOIN results r ON r.id = (SELECT r2.id FROM results r2 WHERE r2.session_id = s.session_id AND r2.student_id = s.id ORDER BY r2.score DESC, r2.duration_seconds ASC LIMIT 1)
    WHERE s.session_id = ? ORDER BY s.display_name COLLATE NOCASE`).bind(session.id).all<SessionReportRow>();
  return { session, students: report.results };
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
