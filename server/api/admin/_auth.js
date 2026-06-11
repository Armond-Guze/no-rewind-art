import { assertAdmin } from '../../backend.js';
import { assertRateLimit, rateLimits } from '../../rate-limit.js';
import { getBearerHeader } from '../_utils.js';

export function assertAdminRequest(request) {
  try {
    assertAdmin(getBearerHeader(request));
  } catch (error) {
    assertRateLimit(request, rateLimits.adminAuthFailed);
    throw error;
  }

  assertRateLimit(request, rateLimits.admin);
}
