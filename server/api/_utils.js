export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export function errorJson(error) {
  return json(
    {
      error: error?.message || 'Request failed.',
    },
    error?.status || 500,
  );
}

export function methodNotAllowed() {
  return json({ error: 'Method not allowed.' }, 405);
}

export function getBearerHeader(request) {
  return request.headers.get('authorization') || '';
}
