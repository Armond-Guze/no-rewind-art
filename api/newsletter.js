import { subscribeToNewsletter } from '../server/backend.js';
import { errorJson, json, methodNotAllowed } from './_utils.js';

export async function POST(request) {
  try {
    return json(await subscribeToNewsletter(await request.json()));
  } catch (error) {
    return errorJson(error);
  }
}

export function GET() {
  return methodNotAllowed();
}
