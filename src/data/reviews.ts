export type ReviewHighlight = {
  name: string;
  date: string;
  rating: number;
  detail: string;
  quote: string;
};

export const etsyReviewHighlights: ReviewHighlight[] = [
  {
    name: 'Lorie',
    date: 'May 11, 2025',
    rating: 5,
    detail: 'Size: 24 x 18 | Style: No Frame',
    quote:
      "This cool piece just arrived & from the moment we opened it - we loved it. It's going to be such a nice addition to our rec room. I love the nostalgia aspect & the inspirational quote. It was shipped rather quickly & is just what we hoped it would be.",
  },
  {
    name: 'Davis',
    date: 'Jan 31, 2025',
    rating: 5,
    detail: 'Size: 24 x 18 | Style: Black Frame',
    quote: 'This has great resolution and is perfect in our retro themed office',
  },
  {
    name: 'Alex',
    date: 'Jan 19, 2025',
    rating: 5,
    detail: 'Size: 16 x 12 | Style: Black Frame',
    quote: 'Great picture for small home or wall!',
  },
  {
    name: 'Michelle',
    date: 'Sep 18, 2024',
    rating: 5,
    detail: 'Size: 48 x 32 | Style: Black Frame',
    quote: 'Item was perfect and exactly how it was described',
  },
  {
    name: 'Amanda',
    date: 'Jul 23, 2024',
    rating: 5,
    detail: 'Etsy verified purchase',
    quote: 'Looks amazing in our passport office',
  },
  {
    name: 'Nicolas',
    date: 'Dec 19, 2022',
    rating: 5,
    detail: 'Style: Black Frame | Size: 36 x 24',
    quote: 'Great quality and frame. Print is very clear and arrived very quickly and well packaged.',
  },
];
