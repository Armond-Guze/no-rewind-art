import { assertAdminAuthorization } from '../../admin-auth.js';
import { assertRateLimit, rateLimits } from '../../rate-limit.js';
import { getBearerHeader } from '../_utils.js';

export async function assertAdminRequest(request) {
  let identity;

  try {
    identity = await assertAdminAuthorization(getBearerHeader(request));
  } catch (error) {
    assertRateLimit(request, rateLimits.adminAuthFailed);
    throw error;
  }

  assertRateLimit(request, rateLimits.admin);
  return identity;
}
