import { listResults, saveResult } from '@/db';
import { corsJson, corsOptions } from '../cors';

export const OPTIONS = corsOptions;

export async function GET(request: Request) {
  try {
    const classCode = new URL(request.url).searchParams.get('classCode')?.trim().slice(0, 20) ?? '';
    return corsJson(request, { results: await listResults(20, classCode) });
  } catch (error) {
    console.error(error);
    return corsJson(request, { results: [], error: 'Results are temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const displayName = String(body.displayName ?? '').trim().slice(0, 32);
    const classCode = String(body.classCode ?? '').trim().slice(0, 20);
    const durationSeconds = Math.max(1, Math.min(7200, Number(body.durationSeconds) || 1));
    const mistakes = Math.max(0, Math.min(100, Number(body.mistakes) || 0));
    const requestedTaskType = String(body.taskType ?? '');
    if (!['numbers', 'words', 'sentences'].includes(requestedTaskType)) return corsJson(request, { error: 'Valid task type is required.' }, { status: 400 });
    const taskType = requestedTaskType as 'numbers' | 'words' | 'sentences';
    const level = Number(body.level);
    if (!Number.isInteger(level) || level < 1 || level > 3) return corsJson(request, { error: 'Level must be 1, 2, or 3.' }, { status: 400 });
    const questionsByLevel = [5, 5, 8, 10];
    const questionsTotal = questionsByLevel[level] ?? 5;
    const score = Math.max(100, 1000 - durationSeconds - mistakes * 35);
    const accuracy = Math.round((questionsTotal / (questionsTotal + mistakes)) * 100);
    if (!displayName) return corsJson(request, { error: 'Display name is required.' }, { status: 400 });
    await saveResult({ displayName, classCode, score, accuracy, durationSeconds, mistakes, taskType, level, questionsTotal, completedAt: new Date().toISOString() });
    return corsJson(request, { ok: true }, { status: 201 });
  } catch (error) {
    console.error(error);
    return corsJson(request, { error: 'The result could not be saved.' }, { status: 500 });
  }
}
