import { listAdminProducts } from '../../backend.js';
import { assertAdminRequest } from './_auth.js';
import { errorJson, json, methodNotAllowed } from '../_utils.js';

export async function GET(request) {
  try {
    assertAdminRequest(request);

    return json(await listAdminProducts());
  } catch (error) {
    return errorJson(error);
  }
}

export function POST() {
  return methodNotAllowed();
}
