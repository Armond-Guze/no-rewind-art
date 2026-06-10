import { listCustomerOrders } from '../../backend.js';
import { errorJson, getBearerHeader, json, methodNotAllowed } from '../_utils.js';
import { assertRateLimit } from '../../rate-limit.js';

export async function GET(request) {
  try {
    assertRateLimit(request, {
      key: 'account-orders',
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });

    return json(await listCustomerOrders(getBearerHeader(request)));
  } catch (error) {
    return errorJson(error);
  }
}

export function POST() {
  return methodNotAllowed();
}
