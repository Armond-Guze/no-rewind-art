import { mobileApiBaseUrl } from '../config';
import type { MobileArtworkResponse } from '../types/artwork';

function apiUrl(path: string) {
  return `${mobileApiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function fetchMobileArtwork(): Promise<MobileArtworkResponse> {
  const response = await fetch(apiUrl('/api/mobile/artwork'));

  if (!response.ok) {
    throw new Error(`Artwork request failed with ${response.status}`);
  }

  return response.json() as Promise<MobileArtworkResponse>;
}

