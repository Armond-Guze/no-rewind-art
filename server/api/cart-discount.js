import { previewCartDiscount } from '../backend.js';
import { errorJson, json, methodNotAllowed, readJsonBody } from './_utils.js';
import { assertRateLimit, rateLimits } from '../rate-limit.js';

export async function POST(request) {
  try {
    assertRateLimit(request, rateLimits.discount);
    return json(await previewCartDiscount(await readJsonBody(request)));
  } catch (error) {
    return errorJson(error);
  }
}
export function GET() { return methodNotAllowed(); }
