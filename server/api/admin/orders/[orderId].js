import { assertAdmin, updateAdminOrder } from '../../../backend.js';
import { errorJson, getBearerHeader, json, methodNotAllowed } from '../../_utils.js';
import { assertRateLimit } from '../../../rate-limit.js';

export async function PATCH(request) {
  try {
    assertRateLimit(request, {
      key: 'admin',
      limit: 90,
      windowMs: 10 * 60 * 1000,
    });
    assertAdmin(getBearerHeader(request));

    const url = new URL(request.url);
    const orderId = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
    return json(await updateAdminOrder(orderId, await request.json()));
  } catch (error) {
    return errorJson(error);
  }
}

export function GET() {
  return methodNotAllowed();
}
