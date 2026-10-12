import { listResults, saveResult } from '@/db';

export async function GET() {
  try {
    return Response.json({ results: await listResults(20) });
  } catch (error) {
    console.error(error);
    return Response.json({ results: [], error: 'Results are temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const displayName = String(body.displayName ?? '').trim().slice(0, 32);
    const classCode = String(body.classCode ?? '').trim().slice(0, 20);
    const score = Math.max(0, Math.min(1000, Number(body.score) || 0));
    const accuracy = Math.max(0, Math.min(100, Number(body.accuracy) || 0));
    const durationSeconds = Math.max(1, Math.min(7200, Number(body.durationSeconds) || 1));
    const mistakes = Math.max(0, Math.min(100, Number(body.mistakes) || 0));
    if (!displayName) return Response.json({ error: 'Display name is required.' }, { status: 400 });
    await saveResult({ displayName, classCode, score, accuracy, durationSeconds, mistakes, completedAt: new Date().toISOString() });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'The result could not be saved.' }, { status: 500 });
  }
}
