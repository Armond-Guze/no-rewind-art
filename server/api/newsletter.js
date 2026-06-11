import { subscribeToNewsletter } from '../backend.js';
import { errorJson, json, methodNotAllowed, readJsonBody } from './_utils.js';
import { assertRateLimit, rateLimits } from '../rate-limit.js';

export async function POST(request) {
  try {
    assertRateLimit(request, rateLimits.newsletter);

    return json(await subscribeToNewsletter(await readJsonBody(request, { maxBytes: 2 * 1024 })));
  } catch (error) {
    return errorJson(error);
  }
}

export function GET() {
  return methodNotAllowed();
}
