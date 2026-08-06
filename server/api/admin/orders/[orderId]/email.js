import { sendAdminOrderEmail } from '../../../../backend.js';
import { assertAdminRequest } from '../../_auth.js';
import { errorJson, json, methodNotAllowed, readJsonBody } from '../../../_utils.js';

export async function POST(request) {
  try {
    await assertAdminRequest(request);

    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const orderId = decodeURIComponent(pathSegments.at(-2) || '');
    const result = await sendAdminOrderEmail(
      orderId,
      await readJsonBody(request, { maxBytes: 1024 }),
    );

    if (result.email.sent) {
      return json(result);
    }

    return json(
      {
        ...result,
        error: result.email.reason || 'Customer email could not be sent.',
      },
      result.email.skipped ? 503 : 502,
    );
  } catch (error) {
    return errorJson(error);
  }
}

export function GET() {
  return methodNotAllowed();
}
