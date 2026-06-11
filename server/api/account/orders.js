import { listCustomerOrders } from '../../backend.js';
import { errorJson, getBearerHeader, json, methodNotAllowed } from '../_utils.js';
import { assertRateLimit, rateLimits } from '../../rate-limit.js';

export async function GET(request) {
  try {
    assertRateLimit(request, rateLimits.accountOrders);

    return json(await listCustomerOrders(getBearerHeader(request)));
  } catch (error) {
    return errorJson(error);
  }
}

export function POST() {
  return methodNotAllowed();
}
