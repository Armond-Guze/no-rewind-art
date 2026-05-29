const publicEnv = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
  VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
  VITE_GA_MEASUREMENT_ID: process.env.VITE_GA_MEASUREMENT_ID || '',
  VITE_GOOGLE_ADS_ID: process.env.VITE_GOOGLE_ADS_ID || '',
  VITE_GOOGLE_ADS_PURCHASE_LABEL: process.env.VITE_GOOGLE_ADS_PURCHASE_LABEL || '',
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
};

export default nextConfig;
