const newsletterCodeStorageKey = 'armoze-newsletter-code';

export function saveNewsletterDiscountCode(code: string) {
  const normalized = String(code || '').trim().toUpperCase();

  if (!normalized) {
    return;
  }

  try {
    window.localStorage.setItem(newsletterCodeStorageKey, normalized);
  } catch {
    // Storage unavailable (private browsing); the code still works typed manually.
  }
}

export function getNewsletterDiscountCode(): string {
  try {
    return window.localStorage.getItem(newsletterCodeStorageKey) || '';
  } catch {
    return '';
  }
}

export function clearNewsletterDiscountCode() {
  try { window.localStorage.removeItem(newsletterCodeStorageKey); } catch { /* Storage may be unavailable. */ }
}
