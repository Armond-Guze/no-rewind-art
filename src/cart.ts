export type StoredCartItem = {
  lineKey: string;
  productId: string;
  sizeId: string;
  frameId: string;
  quantity: number;
};

export const cartStorageKey = 'armoze_cart_items';
export const cartUpdatedEvent = 'armoze-cart-updated';

export function makeCartLineKey(productId: string, sizeId: string, frameId: string) {
  return `${productId}::${sizeId}::${frameId}`;
}

function normalizeStoredCartItem(value: unknown): StoredCartItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Partial<StoredCartItem>;
  const productId = typeof item.productId === 'string' ? item.productId : '';
  const sizeId = typeof item.sizeId === 'string' ? item.sizeId : '';
  const frameId = typeof item.frameId === 'string' ? item.frameId : '';
  const quantity = Math.max(1, Math.min(Number(item.quantity) || 1, 10));

  if (!productId || !sizeId || !frameId) {
    return null;
  }

  return {
    lineKey:
      typeof item.lineKey === 'string' && item.lineKey
        ? item.lineKey
        : makeCartLineKey(productId, sizeId, frameId),
    productId,
    sizeId,
    frameId,
    quantity,
  };
}

export function readStoredCart() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(cartStorageKey) || '[]');

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeStoredCartItem(item))
      .filter((item): item is StoredCartItem => Boolean(item));
  } catch {
    return [];
  }
}

export function writeStoredCart(items: StoredCartItem[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(cartStorageKey, JSON.stringify(items));
}

export function getStoredCartCount() {
  return readStoredCart().reduce((total, item) => total + item.quantity, 0);
}

export function notifyStoredCartUpdated(cart = readStoredCart()) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(cartUpdatedEvent, { detail: { cart } }));
}

export function addStoredCartItem(item: Omit<StoredCartItem, 'lineKey'>) {
  const lineKey = makeCartLineKey(item.productId, item.sizeId, item.frameId);
  const currentCart = readStoredCart();
  const nextCart = currentCart.some((cartItem) => cartItem.lineKey === lineKey)
    ? currentCart.map((cartItem) =>
        cartItem.lineKey === lineKey
          ? { ...cartItem, quantity: Math.min(cartItem.quantity + item.quantity, 10) }
          : cartItem,
      )
    : [...currentCart, { ...item, lineKey }];

  writeStoredCart(nextCart);
  notifyStoredCartUpdated(nextCart);

  return nextCart;
}
