import { useEffect, useState } from 'react';
import { clearNewsletterDiscountCode, getNewsletterDiscountCode, saveNewsletterDiscountCode } from './discount';

type DiscountQuote = { code: string; amount: number; subtotal: number; signature: string };

export function useCartDiscount(isOpen: boolean, cartSignature: string, subtotal: number) {
  const [code, setCode] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; quote: DiscountQuote | null; error: string } | null>(null);
  const requestKey = JSON.stringify({ code, cartSignature, subtotal, attempt });
  const canValidate = Boolean(isOpen && code && subtotal > 0);

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => {
      setCode(getNewsletterDiscountCode());
      setAttempt((count) => count + 1);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!canValidate) return;
    const controller = new AbortController();
    async function validate() {
      try {
        const response = await fetch('/api/cart-discount', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ discountCode: code, items: JSON.parse(cartSignature) }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to apply this code.');
        if (controller.signal.aborted) return;
        if (data.subtotal !== subtotal) throw new Error('Your cart prices have changed. Refresh the page and try again.');
        setResult({ key: requestKey, quote: { code: data.code, amount: data.amount, subtotal, signature: cartSignature }, error: '' });
        saveNewsletterDiscountCode(data.code);
      } catch (failure) {
        if (controller.signal.aborted) return;
        setResult({ key: requestKey, quote: null, error: failure instanceof Error ? failure.message : 'Unable to check this code. Try again.' });
        if (getNewsletterDiscountCode() === code) clearNewsletterDiscountCode();
      }
    }
    void validate();
    return () => controller.abort();
  }, [canValidate, code, cartSignature, subtotal, requestKey]);

  return {
    quote: canValidate && result?.key === requestKey ? result.quote : null,
    loading: canValidate && result?.key !== requestKey,
    error: canValidate && result?.key === requestKey ? result.error : '',
    apply: (value: string) => { clearNewsletterDiscountCode(); setCode(value.trim().toUpperCase()); setAttempt((count) => count + 1); },
    remove: () => { setCode(''); clearNewsletterDiscountCode(); },
  };
}
