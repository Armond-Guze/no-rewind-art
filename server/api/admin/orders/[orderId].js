import { updateAdminOrder } from '../../../backend.js';
import { assertAdminRequest } from '../_auth.js';
import { errorJson, json, methodNotAllowed, readJsonBody } from '../../_utils.js';

export async function PATCH(request) {
  try {
    assertAdminRequest(request);

    const url = new URL(request.url);
    const orderId = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
    return json(await updateAdminOrder(orderId, await readJsonBody(request, { maxBytes: 4 * 1024 })));
  } catch (error) {
    return errorJson(error);
  }
}

export function GET() {
  return methodNotAllowed();
}
