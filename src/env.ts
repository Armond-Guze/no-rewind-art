type PublicEnv = Record<string, string | undefined>;

const nextEnv: PublicEnv =
  typeof process === 'undefined'
    ? {}
    : {
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
        VITE_GA_MEASUREMENT_ID: process.env.VITE_GA_MEASUREMENT_ID,
        VITE_GOOGLE_ADS_ID: process.env.VITE_GOOGLE_ADS_ID,
        VITE_GOOGLE_ADS_PURCHASE_LABEL: process.env.VITE_GOOGLE_ADS_PURCHASE_LABEL,
        VITE_META_PIXEL_ID: process.env.VITE_META_PIXEL_ID,
      };

export function getPublicEnv(name: string) {
  return nextEnv[name] || '';
}
