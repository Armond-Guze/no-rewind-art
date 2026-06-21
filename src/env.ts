type PublicEnv = Record<string, string | undefined>;

const nextEnv: PublicEnv =
  typeof process === 'undefined'
    ? {}
    : {
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        VITE_GA_MEASUREMENT_ID: process.env.VITE_GA_MEASUREMENT_ID,
        VITE_GOOGLE_ADS_ID: process.env.VITE_GOOGLE_ADS_ID,
        VITE_GOOGLE_ADS_PURCHASE_LABEL: process.env.VITE_GOOGLE_ADS_PURCHASE_LABEL,
        VITE_GOOGLE_ADS_PURCHASE_EVENT_NAME: process.env.VITE_GOOGLE_ADS_PURCHASE_EVENT_NAME,
        NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
        NEXT_PUBLIC_GOOGLE_ADS_ID: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
        NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL: process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL,
        NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_EVENT_NAME:
          process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_EVENT_NAME,
        VITE_META_PIXEL_ID: process.env.VITE_META_PIXEL_ID,
        NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
      };

export function getPublicEnv(name: string) {
  if (name === 'VITE_GA_MEASUREMENT_ID') {
    return nextEnv.VITE_GA_MEASUREMENT_ID || nextEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
  }

  if (name === 'VITE_GOOGLE_ADS_ID') {
    return nextEnv.VITE_GOOGLE_ADS_ID || nextEnv.NEXT_PUBLIC_GOOGLE_ADS_ID || '';
  }

  if (name === 'VITE_GOOGLE_ADS_PURCHASE_LABEL') {
    return nextEnv.VITE_GOOGLE_ADS_PURCHASE_LABEL || nextEnv.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || '';
  }

  if (name === 'VITE_GOOGLE_ADS_PURCHASE_EVENT_NAME') {
    return (
      nextEnv.VITE_GOOGLE_ADS_PURCHASE_EVENT_NAME ||
      nextEnv.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_EVENT_NAME ||
      ''
    );
  }

  if (name === 'VITE_META_PIXEL_ID') {
    return nextEnv.VITE_META_PIXEL_ID || nextEnv.NEXT_PUBLIC_META_PIXEL_ID || '';
  }

  return nextEnv[name] || '';
}
