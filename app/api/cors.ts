const GITHUB_PAGES_ORIGIN = 'https://simonascepenas.github.io';

function headersFor(request: Request) {
  const origin = request.headers.get('Origin');
  if (origin !== GITHUB_PAGES_ORIGIN) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export function corsJson(request: Request, body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  Object.entries(headersFor(request)).forEach(([name, value]) => headers.set(name, value));
  return Response.json(body, { ...init, headers });
}

export function corsOptions(request: Request) {
  return new Response(null, { status: 204, headers: headersFor(request) });
}
