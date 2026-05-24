import { buildGoogleMerchantFeedXml } from '../server/google-merchant-feed.js';
import { errorJson, methodNotAllowed } from './_utils.js';

export async function GET() {
  try {
    return new Response(await buildGoogleMerchantFeedXml(), {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  } catch (error) {
    return errorJson(error);
  }
}

export function POST() {
  return methodNotAllowed();
}
