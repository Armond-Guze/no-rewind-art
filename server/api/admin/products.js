import { assertAdmin, listAdminProducts } from '../../backend.js';
import { errorJson, getBearerHeader, json, methodNotAllowed } from '../_utils.js';
import { assertRateLimit } from '../../rate-limit.js';

export async function GET(request) {
  try {
    assertRateLimit(request, {
      key: 'admin',
      limit: 90,
      windowMs: 10 * 60 * 1000,
    });
    assertAdmin(getBearerHeader(request));

    return json(await listAdminProducts());
  } catch (error) {
    return errorJson(error);
  }
}

export function POST() {
  return methodNotAllowed();
}
