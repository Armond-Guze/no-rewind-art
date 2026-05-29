import { assertAdmin, listAdminOrders } from '../../backend.js';
import { errorJson, getBearerHeader, json, methodNotAllowed } from '../_utils.js';

export async function GET(request) {
  try {
    assertAdmin(getBearerHeader(request));

    const url = new URL(request.url);
    return json(await listAdminOrders({ limit: url.searchParams.get('limit') }));
  } catch (error) {
    return errorJson(error);
  }
}

export function POST() {
  return methodNotAllowed();
}
