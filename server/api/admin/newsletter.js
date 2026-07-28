import {
  createAdminNewsletterDraft,
  listAdminNewsletter,
  syncAdminNewsletterSubscribers,
} from '../../backend.js';
import { assertAdminRequest } from './_auth.js';
import { errorJson, json, methodNotAllowed, readJsonBody } from '../_utils.js';

export async function GET(request) {
  try {
    assertAdminRequest(request);

    return json(await listAdminNewsletter());
  } catch (error) {
    return errorJson(error);
  }
}

export async function POST(request) {
  try {
    assertAdminRequest(request);

    const body = await readJsonBody(request, { maxBytes: 12 * 1024 });

    if (body?.action === 'sync') {
      return json(await syncAdminNewsletterSubscribers());
    }

    if (body?.action === 'create-draft') {
      return json(await createAdminNewsletterDraft(body));
    }

    return json({ error: 'Unknown newsletter action.' }, 400);
  } catch (error) {
    return errorJson(error);
  }
}

export function PATCH() {
  return methodNotAllowed();
}
