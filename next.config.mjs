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
  VITE_GOOGLE_ADS_ID: process.env.VITE_GOOGLE_ADS_ID || '',
  VITE_GOOGLE_ADS_PURCHASE_LABEL: process.env.VITE_GOOGLE_ADS_PURCHASE_LABEL || '',
  VITE_GOOGLE_ADS_PURCHASE_EVENT_NAME:
    process.env.VITE_GOOGLE_ADS_PURCHASE_EVENT_NAME || 'conversion_event_purchase',
  VITE_META_PIXEL_ID: process.env.VITE_META_PIXEL_ID || '',
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
        source: '/products/97-percent',
        destination: '/collections/discipline-focus',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
