import { getHealth } from '../backend.js';
import { errorJson, json, methodNotAllowed } from './_utils.js';

export async function GET() {
  try {
    return json(await getHealth());
  } catch (error) {
    return errorJson(error);
  }
}

export function POST() {
  return methodNotAllowed();
}
