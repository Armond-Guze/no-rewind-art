declare const process: {
  env?: Record<string, string | undefined>;
};

const env = process.env ?? {};

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, '');
}

export const mobileApiBaseUrl = trimTrailingSlash(
  env.EXPO_PUBLIC_API_BASE_URL || 'https://armoze.com',
);

export const armozeSiteUrl = trimTrailingSlash(
  env.EXPO_PUBLIC_SITE_URL || 'https://armoze.com',
);

