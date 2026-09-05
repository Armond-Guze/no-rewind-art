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
  /\bcan be (?:adjusted|consolidated|refined|renamed|replaced|rewritten)\b/i,
  /designed for entrepreneur offices/i,
  /\bdummy\b/i,
  /\bfinal (?:artwork|listing|pricing|product|title)\b/i,
  /great for (?:offices|students|readers)/i,
  /listing copy and final pricing/i,
  /made for study rooms/i,
  /made to order so every print/i,
  /money-focused artwork/i,
  /multiple canvas size/i,
  /printed on demand/i,
  /ready-to-hang canvas option/i,
  /ready for (?:checkout )?(?:refinement|testing)/i,
  /separate listing from/i,
  /ships securely packed/i,
  /uses the .* mockups/i,
  /useful for testing/i,
  /works well in bedrooms/i,
]

function normalizeTone(tone) {
  return typeof tone === 'string' && Object.hasOwn(toneContent, tone) ? tone : 'focus'
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

function arraysMatch(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

/**
 * Returns stable search phrases: two product-specific phrases followed by
 * audience-led intents for the selected artwork theme.
 *
 * @param {unknown} tone
 * @param {unknown} [title]
 */
export function buildDefaultSeoAliases(tone, title) {
  const normalizedTitle = String(title || '').replace(/\s+/g, ' ').trim()
  const titlePhrases = normalizedTitle && normalizedTitle.length <= 47
    ? [`${normalizedTitle} wall art`, `${normalizedTitle} canvas print`]
    : []

  return normalizeTextValues([
    ...titlePhrases,
    ...toneContent[normalizeTone(tone)].seoAliases,
  ]).slice(0, 8)
}

/**
 * Identifies untouched suggestions so title or theme changes can refresh them
 * without overwriting genuinely hand-edited phrases.
 *
 * @param {unknown} values
 * @param {unknown} [title]
 */
export function isGeneratedSeoAliases(values, title) {
  const aliases = normalizeTextValues(values)

  return Object.keys(toneContent).some(
    (tone) => {
      const themeAliases = buildDefaultSeoAliases(tone)
      const wallArtSuffix = ' wall art'
      const canvasPrintSuffix = ' canvas print'
      const wallArtPhrase = aliases[0] || ''
      const canvasPrintPhrase = aliases[1] || ''
      const wallArtTitle = wallArtPhrase.toLowerCase().endsWith(wallArtSuffix)
        ? wallArtPhrase.slice(0, -wallArtSuffix.length)
        : ''
      const canvasPrintTitle = canvasPrintPhrase.toLowerCase().endsWith(canvasPrintSuffix)
        ? canvasPrintPhrase.slice(0, -canvasPrintSuffix.length)
        : ''
      const matchesTitlePattern =
        aliases.length === 8 &&
        wallArtTitle.length > 0 &&
        wallArtTitle.toLowerCase() === canvasPrintTitle.toLowerCase() &&
        arraysMatch(aliases.slice(2), themeAliases.slice(0, 6))

      return (
        arraysMatch(aliases, themeAliases) ||
        arraysMatch(aliases, buildDefaultSeoAliases(tone, title)) ||
        matchesTitlePattern
      )
    },
  )
}

/**
 * Preserves hand-edited aliases and fills only missing values.
 *
 * @param {unknown} values
 * @param {unknown} tone
 * @param {unknown} [title]
 */
export function resolveProductSeoAliases(values, tone, title) {
  const aliases = normalizeTextValues(values)
  return aliases.length && !isGeneratedSeoAliases(aliases, title)
    ? aliases
    : buildDefaultSeoAliases(tone, title)
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
  const defaults = buildDefaultArtworkHighlights(tone)
  const customHighlights = highlights.filter(
    (highlight) => !legacyDetailPatterns.some((pattern) => pattern.test(highlight)),
  )
  const nonDefaultCustomHighlights = customHighlights.filter(
    (highlight) => !defaults.includes(highlight),
  )
  const containsGeneratedDefaults = defaults.every((highlight) => highlights.includes(highlight))

  if (containsGeneratedDefaults && nonDefaultCustomHighlights.length) {
    return normalizeTextValues([
      ...nonDefaultCustomHighlights,
      defaults[1],
    ]).slice(0, 3)
  }

  if (customHighlights.length === highlights.length && highlights.length >= 2) {
    return highlights.slice(0, 3)
  }

  if (!customHighlights.length) return defaults

  const customWithRoomFit = normalizeTextValues([...customHighlights, defaults[1]])
  return customWithRoomFit.length >= 2
    ? customWithRoomFit.slice(0, 3)
    : normalizeTextValues([...customWithRoomFit, defaults[0]]).slice(0, 3)
}
