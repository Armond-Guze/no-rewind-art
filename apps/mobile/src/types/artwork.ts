export type MobileArtwork = {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  tone: string;
  collectionSlugs: string[];
  aspectRatio: string;
  sizePreset: string;
  productUrl: string;
};

export type MobileArtworkResponse = {
  artwork: MobileArtwork[];
  generatedAt: string;
};

