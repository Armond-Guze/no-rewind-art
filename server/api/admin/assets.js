import { listAdminAssets } from '../../backend.js';
import { assertAdminRequest } from './_auth.js';
import { errorJson, json, methodNotAllowed } from '../_utils.js';

export async function GET(request) {
  try {
    await assertAdminRequest(request);

    return json(await listAdminAssets());
  } catch (error) {
    return errorJson(error);
  }
}

export function POST() {
  return methodNotAllowed();
}
