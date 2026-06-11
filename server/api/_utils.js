export function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

export function errorJson(error) {
  const headers = {};

  if (error?.retryAfterSeconds) {
    headers['Retry-After'] = String(error.retryAfterSeconds);
  }

  return Response.json(
    {
      error: error?.message || 'Request failed.',
    },
    {
      status: error?.status || 500,
      headers: {
        'Cache-Control': 'no-store',
        ...headers,
      },
    },
  );
}

export function methodNotAllowed() {
  return json({ error: 'Method not allowed.' }, 405);
}

export function getBearerHeader(request) {
  return request.headers.get('authorization') || '';
}

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function readJsonBody(request, { maxBytes = 32 * 1024 } = {}) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    throw requestError('Send JSON with Content-Type application/json.', 415);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);

  if (contentLength > maxBytes) {
    throw requestError('Request body is too large.', 413);
  }

  const bodyText = await request.text();

  if (new TextEncoder().encode(bodyText).byteLength > maxBytes) {
    throw requestError('Request body is too large.', 413);
  }

  try {
    return JSON.parse(bodyText || '{}');
  } catch {
    throw requestError('Request body must be valid JSON.');
  }
}
