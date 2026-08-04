import { updateAdminProduct } from '../../../backend.js';
import { assertAdminRequest } from '../_auth.js';
import { errorJson, json, methodNotAllowed, readJsonBody } from '../../_utils.js';

export async function PATCH(request) {
  try {
    await assertAdminRequest(request);

    const url = new URL(request.url);
    const productId = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
    return json(await updateAdminProduct(productId, await readJsonBody(request, { maxBytes: 64 * 1024 })));
  } catch (error) {
    return errorJson(error);
  }
}

export function GET() {
  return methodNotAllowed();
}
