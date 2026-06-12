import { getGoogleCustomerReviewOptIn } from '../../backend.js';
import { errorJson, json, methodNotAllowed } from '../_utils.js';
import { assertRateLimit, rateLimits } from '../../rate-limit.js';

export async function GET(request) {
  try {
    assertRateLimit(request, rateLimits.accountOrders);

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');

    return json(await getGoogleCustomerReviewOptIn(sessionId));
  } catch (error) {
    return errorJson(error);
  }
}

export function POST() {
  return methodNotAllowed();
}
