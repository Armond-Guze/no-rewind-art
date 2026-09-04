const toneContent = {
  money: {
    seoAliases: [
      'money wall art',
      'entrepreneur wall art',
      'office motivation decor',
      'ambition canvas print',
      'money mindset decor',
      'success wall art',
      'business office artwork',
      'motivational canvas print',
    ],
    highlights: [
      'Bold money-mindset artwork with a strong, high-contrast room presence.',
      'Designed for offices, studios, and ambitious workspaces.',
    ],
  },
  minimal: {
    seoAliases: [
      'study room wall art',
      'creative workspace decor',
      'reading room wall art',
      'minimal office decor',
      'home office wall art',
      'student motivation decor',
      'focus canvas print',
      'motivational canvas print',
    ],
    highlights: [
      'Clean, understated artwork made to keep the room focused.',
      'A natural fit for study rooms, reading corners, and home offices.',
    ],
  },
  cassette: {
    seoAliases: [
      'retro motivational art',
      'music room wall art',
      'studio wall decor',
      'nostalgic canvas print',
      'cassette wall art',
      'bedroom motivation decor',
      'creative office artwork',
      'motivational canvas print',
    ],
    highlights: [
      'Retro cassette-inspired artwork built around perspective and forward motion.',
      'A natural fit for bedrooms, music rooms, studios, and creative spaces.',
    ],
  },
  space: {
    seoAliases: [
      'future focused wall art',
      'space inspired wall art',
      'gaming room decor',
      'studio motivation art',
      'bedroom wall art',
      'dreamer canvas print',
      'creative workspace decor',
      'motivational canvas print',
    ],
    highlights: [
      'Cinematic, future-focused artwork with a modern room presence.',
      'A natural fit for bedrooms, studios, gaming rooms, and creative spaces.',
    ],
  },
  focus: {
    seoAliases: [
      'discipline wall art',
      'focus room decor',
      'gym motivation wall art',
      'office wall art',
      'daily motivation decor',
      'productivity wall art',
      'bedroom canvas print',
      'motivational canvas print',
    ],
    highlights: [
      'Direct motivational artwork centered on discipline and daily momentum.',
      'A natural fit for offices, gyms, bedrooms, and focused workspaces.',
    ],
  },
}

const legacyDetailPatterns = [
  /available as canvas/i,
  /available in (?:the same )?.*canvas sizes/i,
  /built for bedrooms/i,
  /designed for entrepreneur offices/i,
  /great for (?:offices|students|readers)/i,
  /listing copy and final pricing/i,
  /made for study rooms/i,
  /made to order so every print/i,
  /money-focused artwork/i,
  /multiple canvas size/i,
  /printed on demand/i,
  /ready-to-hang canvas option/i,
  /separate listing from/i,
  /ships securely packed/i,
  /uses the .* mockups/i,
  /works well in bedrooms/i,
]

function normalizeTone(tone) {
  return typeof tone === 'string' && tone in toneContent ? tone : 'focus'
}

function normalizeTextValues(values) {
  if (!Array.isArray(values)) return []

  const uniqueValues = new Map()

  for (const value of values) {
    const text = String(value || '').replace(/\s+/g, ' ').trim()
    const normalized = text.toLowerCase()

    if (text && !uniqueValues.has(normalized)) {
      uniqueValues.set(normalized, text)
    }
  }

  return [...uniqueValues.values()]
}

/**
 * Returns stable, audience-led search phrases for a product theme.
 * These intentionally avoid title stuffing: the product title is already indexed separately.
 *
 * @param {unknown} tone
 */
export function buildDefaultSeoAliases(tone) {
  return [...toneContent[normalizeTone(tone)].seoAliases]
}

/**
 * Preserves hand-edited aliases and fills only missing values.
 *
 * @param {unknown} values
 * @param {unknown} tone
 */
export function resolveProductSeoAliases(values, tone) {
  const aliases = normalizeTextValues(values)
  return aliases.length ? aliases : buildDefaultSeoAliases(tone)
}

/**
 * Returns concise, customer-facing artwork highlights. Universal manufacturing,
 * shipping, and framing facts belong in the shared storefront product facts.
 *
 * @param {unknown} tone
 */
export function buildDefaultArtworkHighlights(tone) {
  return [...toneContent[normalizeTone(tone)].highlights]
}

/**
 * Replaces the old duplicated/importer boilerplate while preserving genuinely
 * custom product highlights.
 *
 * @param {unknown} values
 * @param {unknown} tone
 */
export function resolveArtworkHighlights(values, tone) {
  const highlights = normalizeTextValues(values)
  const containsLegacyCopy = highlights.some((highlight) =>
    legacyDetailPatterns.some((pattern) => pattern.test(highlight)),
  )

  return !highlights.length || containsLegacyCopy
    ? buildDefaultArtworkHighlights(tone)
    : highlights.slice(0, 3)
}
