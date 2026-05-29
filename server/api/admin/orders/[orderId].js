import { assertAdmin, updateAdminOrder } from '../../../backend.js';
import { errorJson, getBearerHeader, json, methodNotAllowed } from '../../_utils.js';

export async function PATCH(request) {
  try {
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
