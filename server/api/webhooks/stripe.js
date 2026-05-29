import { processStripeWebhook } from '../../backend.js';
import { errorJson, json, methodNotAllowed } from '../_utils.js';

export async function POST(request) {
  try {
    return json(
      await processStripeWebhook(
        await request.text(),
        request.headers.get('stripe-signature') || '',
      ),
    );
  } catch (error) {
    return errorJson(error);
  }
}

export function GET() {
  return methodNotAllowed();
}
