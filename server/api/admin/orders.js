import { listAdminOrders } from '../../backend.js';
import { assertAdminRequest } from './_auth.js';
import { errorJson, json, methodNotAllowed } from '../_utils.js';

export async function GET(request) {
  try {
    assertAdminRequest(request);

    const url = new URL(request.url);
    return json(await listAdminOrders({ limit: url.searchParams.get('limit') }));
  } catch (error) {
    return errorJson(error);
  }
}

export function POST() {
  return methodNotAllowed();
}
