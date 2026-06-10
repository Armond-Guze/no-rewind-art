import { subscribeToNewsletter } from '../backend.js';
import { errorJson, json, methodNotAllowed } from './_utils.js';
import { assertRateLimit } from '../rate-limit.js';

export async function POST(request) {
  try {
    assertRateLimit(request, {
      key: 'newsletter',
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    return json(await subscribeToNewsletter(await request.json()));
  } catch (error) {
    return errorJson(error);
  }
}

export function GET() {
  return methodNotAllowed();
}
