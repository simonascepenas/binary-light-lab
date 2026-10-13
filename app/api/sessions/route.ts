import { createSession, getPublicSession, getSessionReport, joinSession, type SessionTaskType } from '@/db';
import { corsJson, corsOptions } from '../cors';

export const OPTIONS = corsOptions;

const taskTypes: SessionTaskType[] = ['numbers', 'words', 'sentences'];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = (url.searchParams.get('code') ?? '').trim().toUpperCase().slice(0, 6);
    const teacherToken = (url.searchParams.get('teacherToken') ?? '').trim().slice(0, 128);
    if (!code) return corsJson(request, { error: 'Session code is required.' }, { status: 400 });
    if (teacherToken) {
      const report = await getSessionReport(code, teacherToken);
      return report ? corsJson(request, report) : corsJson(request, { error: 'Session code or teacher key is incorrect.' }, { status: 403 });
    }
    const session = await getPublicSession(code);
    return session ? corsJson(request, { session }) : corsJson(request, { error: 'Session not found.' }, { status: 404 });
  } catch (error) {
    console.error(error);
    return corsJson(request, { error: 'The session is temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? '');
    if (action === 'create') {
      const title = String(body.title ?? '').trim().slice(0, 80);
      const taskType = String(body.taskType ?? '') as SessionTaskType;
      const level = Number(body.level);
      if (!title) return corsJson(request, { error: 'Session title is required.' }, { status: 400 });
      if (!taskTypes.includes(taskType)) return corsJson(request, { error: 'Choose a valid assignment.' }, { status: 400 });
      if (!Number.isInteger(level) || level < 1 || level > 3) return corsJson(request, { error: 'Choose level 1, 2, or 3.' }, { status: 400 });
      return corsJson(request, { session: await createSession({ title, taskType, level }) }, { status: 201 });
    }
    if (action === 'join') {
      const code = String(body.code ?? '').trim().toUpperCase().slice(0, 6);
      const displayName = String(body.displayName ?? '').trim().slice(0, 32);
      const participantToken = String(body.participantToken ?? '').trim().slice(0, 64);
      if (!code || !displayName) return corsJson(request, { error: 'Session code and name are required.' }, { status: 400 });
      const joined = await joinSession(code, displayName, participantToken || crypto.randomUUID());
      return joined ? corsJson(request, joined, { status: 201 }) : corsJson(request, { error: 'Session not found.' }, { status: 404 });
    }
    return corsJson(request, { error: 'Unknown session action.' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return corsJson(request, { error: 'The session request could not be completed.' }, { status: 500 });
  }
}
