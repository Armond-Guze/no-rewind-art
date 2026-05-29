import { listPublicCatalog } from '../backend.js';
import { errorJson, json, methodNotAllowed } from './_utils.js';

export async function GET() {
  try {
    return json(await listPublicCatalog());
  } catch (error) {
    return errorJson(error);
  }
}

export function POST() {
  return methodNotAllowed();
}
