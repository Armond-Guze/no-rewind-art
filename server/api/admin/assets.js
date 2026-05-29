import { assertAdmin, listAdminAssets } from '../../backend.js';
import { errorJson, getBearerHeader, json, methodNotAllowed } from '../_utils.js';

export async function GET(request) {
  try {
    assertAdmin(getBearerHeader(request));

    return json(await listAdminAssets());
  } catch (error) {
    return errorJson(error);
  }
}

export function POST() {
  return methodNotAllowed();
}
