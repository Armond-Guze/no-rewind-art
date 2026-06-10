import { createCheckoutSession } from '../backend.js';
import { errorJson, json, methodNotAllowed } from './_utils.js';
import { assertRateLimit } from '../rate-limit.js';

export async function POST(request) {
  try {
    assertRateLimit(request, {
      key: 'checkout',
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    return json(await createCheckoutSession(await request.json()));
  } catch (error) {
    return errorJson(error);
  }
}

export function GET() {
  return methodNotAllowed();
}
