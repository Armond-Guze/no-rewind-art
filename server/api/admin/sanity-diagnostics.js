import { getSanityCatalogDiagnostics } from '../../product-store.js';
import { assertAdmin } from '../../backend.js';
import { errorJson, getBearerHeader, json, methodNotAllowed } from '../_utils.js';

export async function GET(request) {
  try {
    assertAdmin(getBearerHeader(request));

    return json(await getSanityCatalogDiagnostics());
  } catch (error) {
    return errorJson(error);
  }
}

export function POST() {
  return methodNotAllowed();
}
