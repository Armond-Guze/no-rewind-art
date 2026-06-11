import { createCheckoutSession } from '../backend.js';
import { errorJson, getBearerHeader, json, methodNotAllowed, readJsonBody } from './_utils.js';
import { assertRateLimit, rateLimits } from '../rate-limit.js';

export async function POST(request) {
  try {
    assertRateLimit(request, rateLimits.checkout);

    return json(await createCheckoutSession(await readJsonBody(request), getBearerHeader(request)));
  } catch (error) {
    return errorJson(error);
  }
}

export function GET() {
  return methodNotAllowed();
}
