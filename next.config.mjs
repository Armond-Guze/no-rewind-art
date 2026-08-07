// Pixel IDs are public browser identifiers, not secrets. Keep the ARMOZE pixel as a
// fallback so production tracking is not disabled by a missing Vercel env value.
const openAiAdsPixelId =
  process.env.VITE_OPENAI_ADS_PIXEL_ID ||
  process.env.NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID ||
  'X9EVsaEqTjPiZpLG17gifT';

const publicEnv = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  VITE_GA_MEASUREMENT_ID: process.env.VITE_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
  NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.VITE_GA_MEASUREMENT_ID || '',
  VITE_GOOGLE_ADS_ID: process.env.VITE_GOOGLE_ADS_ID || process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '',
  NEXT_PUBLIC_GOOGLE_ADS_ID: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || process.env.VITE_GOOGLE_ADS_ID || '',
  VITE_GOOGLE_ADS_PURCHASE_LABEL:
    process.env.VITE_GOOGLE_ADS_PURCHASE_LABEL || process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || '',
  NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL:
    process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || process.env.VITE_GOOGLE_ADS_PURCHASE_LABEL || '',
  VITE_GOOGLE_ADS_PURCHASE_EVENT_NAME:
    process.env.VITE_GOOGLE_ADS_PURCHASE_EVENT_NAME ||
    process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_EVENT_NAME ||
    'conversion_event_purchase_1',
  NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_EVENT_NAME:
    process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_EVENT_NAME ||
    process.env.VITE_GOOGLE_ADS_PURCHASE_EVENT_NAME ||
    'conversion_event_purchase_1',
  VITE_META_PIXEL_ID: process.env.VITE_META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || '',
  NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.VITE_META_PIXEL_ID || '',
  VITE_OPENAI_ADS_PIXEL_ID: openAiAdsPixelId,
  NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID: openAiAdsPixelId,
  NEXT_PUBLIC_GOOGLE_CUSTOMER_REVIEWS_MERCHANT_ID:
    process.env.NEXT_PUBLIC_GOOGLE_CUSTOMER_REVIEWS_MERCHANT_ID ||
    process.env.GOOGLE_CUSTOMER_REVIEWS_MERCHANT_ID ||
    '5793512839',
  NEXT_PUBLIC_GOOGLE_CUSTOMER_REVIEWS_BADGE_ENABLED:
    process.env.NEXT_PUBLIC_GOOGLE_CUSTOMER_REVIEWS_BADGE_ENABLED || 'false',
  NEXT_PUBLIC_GOOGLE_CUSTOMER_REVIEWS_BADGE_POSITION:
    process.env.NEXT_PUBLIC_GOOGLE_CUSTOMER_REVIEWS_BADGE_POSITION || '',
  NEXT_PUBLIC_GOOGLE_CUSTOMER_REVIEWS_BADGE_REGION:
    process.env.NEXT_PUBLIC_GOOGLE_CUSTOMER_REVIEWS_BADGE_REGION || '',
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: publicEnv,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/images/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/lander',
        destination: '/',
        permanent: true,
      },
      {
        source: '/collections/discipline-focus',
        destination: '/collections/music',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
