'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { ArrowRight, CircleUserRound, Menu, Minus, Plus, Search, ShoppingBag, X } from 'lucide-react';
import {
  cartUpdatedEvent,
  getStoredCartCount,
  notifyStoredCartUpdated,
  readStoredCart,
  writeStoredCart,
  type StoredCartItem,
} from '../../cart';
import { products as catalogProducts, type FrameOption, type Product, type SizeOption } from '../../data/products';
import { supabaseClient } from '../../lib/supabase';
import {
  formatPrice,
  getCartProductImage,
  getConfiguredUnitPrice,
  getFrameOption,
  getSizeOption,
  getSizeOptionAspectRatio,
  launchOfferDiscount,
  launchOfferCode,
  supportEmail,
  supportMailto,
} from './product-utils';
import { getProductTrackingItem, initStorefrontTracking, trackStorefrontEvent } from './analytics';
import { captureStorefrontAttribution, getCheckoutAttribution } from './attribution';
import { ProductImage } from './OptimizedArtwork';

const newsletterPopupDelayMs = 12000;
const newsletterPopupDismissMs = 7 * 24 * 60 * 60 * 1000;
const newsletterPopupSubscribedDismissMs = 365 * 24 * 60 * 60 * 1000;
const newsletterPopupDismissedUntilKey = 'armoze-newsletter-popup-dismissed-until';
const newsletterPopupSubscribedKey = 'armoze-newsletter-popup-subscribed';

export function StorefrontTracker({
  eventName,
  payload,
}: {
  eventName?: string;
  payload?: Record<string, unknown>;
}) {
  const pathname = usePathname();

  useEffect(() => {
    captureStorefrontAttribution();
    initStorefrontTracking();
    trackStorefrontEvent('page_view');
  }, [pathname]);

  useEffect(() => {
    if (eventName) {
      trackStorefrontEvent(eventName, payload);
    }
  }, [eventName, payload]);

  return null;
}

export function StorefrontShell({
  children,
  products,
}: {
  children: ReactNode;
  products?: Product[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const drawerProducts = products?.length ? products : catalogProducts;
  const { isScrolled, isHidden } = useStorefrontTopChromeState(menuOpen || searchOpen);
  const isHome = pathname === '/';
  const openCartDrawer = () => {
    setMenuOpen(false);
    setSearchOpen(false);
    setCartDrawerOpen(true);
  };

  return (
    <>
      <LaunchPromoBar isHome={isHome} isScrolled={isScrolled} isHidden={isHidden} />
      <NextSiteHeader
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        isScrolled={isScrolled}
        isHidden={isHidden}
        onCartOpen={openCartDrawer}
      />
      {children}
      <CartDrawer
        products={drawerProducts}
        shouldFetchCatalog={!products?.length}
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      />
      <NewsletterDiscountPopup />
      <NextSiteFooter />
    </>
  );
}

type NewsletterResponse = {
  discount?: {
    code?: string;
    label?: string;
  };
  email?: {
    sent?: boolean;
  };
  error?: string;
};

function getStoredDismissedUntil() {
  if (typeof window === 'undefined') {
    return 0;
  }

  return Number(window.localStorage.getItem(newsletterPopupDismissedUntilKey) || 0);
}

function rememberNewsletterPopupDismissal(durationMs: number) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    newsletterPopupDismissedUntilKey,
    String(Date.now() + durationMs),
  );
}

function NewsletterDiscountPopup() {
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState(`Join the list and get ${launchOfferDiscount} off your first order.`);
  const [discountCode, setDiscountCode] = useState(launchOfferCode);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (window.localStorage.getItem(newsletterPopupSubscribedKey) === 'true') {
      return undefined;
    }

    if (getStoredDismissedUntil() > Date.now()) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, newsletterPopupDelayMs);

    const handleExitIntent = (event: globalThis.MouseEvent) => {
      if (event.clientY > 24 || event.relatedTarget) {
        return;
      }

      if (getStoredDismissedUntil() > Date.now()) {
        return;
      }

      window.clearTimeout(timer);
      setOpen(true);
    };

    document.documentElement.addEventListener('mouseout', handleExitIntent);

    return () => {
      window.clearTimeout(timer);
      document.documentElement.removeEventListener('mouseout', handleExitIntent);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    emailInputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        rememberNewsletterPopupDismissal(newsletterPopupDismissMs);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setMessage('Saving your email...');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, source: 'popup' }),
      });
      const data = (await response.json().catch(() => ({}))) as NewsletterResponse;

      if (!response.ok) {
        throw new Error(data.error || 'Newsletter signup failed.');
      }

      const nextDiscountCode = data.discount?.code || launchOfferCode;

      setDiscountCode(nextDiscountCode);
      setSubmitted(true);
      setStatus('success');
      setMessage(
        data.email?.sent
          ? `Check your inbox. Your code is ${nextDiscountCode}.`
          : `Your code is ${nextDiscountCode}. Use it at checkout.`,
      );
      setEmail('');
      trackStorefrontEvent('sign_up');

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(newsletterPopupSubscribedKey, 'true');
      }

      rememberNewsletterPopupDismissal(newsletterPopupSubscribedDismissMs);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Newsletter signup failed.');
    }
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(discountCode);
      setMessage(`Copied ${discountCode}.`);
    } catch {
      setMessage(`Your code is ${discountCode}.`);
    }
  }

  function handleClose() {
    setOpen(false);
    rememberNewsletterPopupDismissal(submitted ? newsletterPopupSubscribedDismissMs : newsletterPopupDismissMs);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="newsletter-popup-overlay" role="presentation">
      <section
        aria-labelledby="newsletter-popup-title"
        aria-modal="true"
        className="newsletter-popup"
        role="dialog"
      >
        <button
          type="button"
          className="newsletter-popup-close"
          onClick={handleClose}
          aria-label="Close newsletter discount popup"
        >
          <X aria-hidden="true" size={18} strokeWidth={2.4} />
        </button>

        <div className="newsletter-popup-copy">
          <p>{launchOfferDiscount} off your first order</p>
          <h2 id="newsletter-popup-title">Get the launch code.</h2>
          <span>Bold canvas drops, restocks, and studio updates.</span>
        </div>

        {submitted ? (
          <div className="newsletter-popup-success">
            <span className="newsletter-popup-code">{discountCode}</span>
            <button type="button" onClick={handleCopyCode}>
              Copy code
            </button>
          </div>
        ) : (
          <form className="newsletter-popup-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="newsletter-popup-email">
              Email address
            </label>
            <input
              id="newsletter-popup-email"
              ref={emailInputRef}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Your E-mail"
              autoComplete="email"
              required
            />
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Sending' : 'Send my code'}
            </button>
          </form>
        )}

        <p className={`newsletter-popup-message ${status}`} aria-live="polite">
          {message}
        </p>
      </section>
    </div>
  );
}

function useStorefrontTopChromeState(menuOpen: boolean) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let frameId = 0;

    const updateScrollState = () => {
      const nextScrollY = Math.max(0, window.scrollY);
      const scrollDelta = nextScrollY - lastScrollY;

      // Hysteresis: different on/off thresholds so tiny scroll jitter near the
      // boundary doesn't rapidly toggle the header style mid-scroll.
      setIsScrolled((current) => (current ? nextScrollY > 8 : nextScrollY > 24));
      setIsHidden((currentHidden) => {
        if (menuOpen || nextScrollY < 92) {
          return false;
        }

        if (scrollDelta > 3) {
          return true;
        }

        if (scrollDelta < 0) {
          return false;
        }

        return currentHidden;
      });

      lastScrollY = nextScrollY;
      frameId = 0;
    };

    const handleScroll = () => {
      if (!frameId) {
        frameId = window.requestAnimationFrame(updateScrollState);
      }
    };

    updateScrollState();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener('scroll', handleScroll);
    };
  }, [menuOpen]);

  return { isScrolled, isHidden };
}

function LaunchPromoBar({
  isHome,
  isScrolled,
  isHidden,
}: {
  isHome: boolean;
  isScrolled: boolean;
  isHidden: boolean;
}) {
  const className = [
    'launch-promo-bar',
    isHome ? 'home-promo-bar' : undefined,
    isScrolled ? 'is-scrolled' : undefined,
    isHidden ? 'is-hidden' : undefined,
  ].filter(Boolean).join(' ');

  return (
    <section className={className} aria-label="Launch offer">
      <p>
        {launchOfferDiscount} off your first order with code <strong>{launchOfferCode}</strong>
      </p>
    </section>
  );
}

function NextSiteHeader({
  menuOpen,
  setMenuOpen,
  searchOpen,
  setSearchOpen,
  isScrolled,
  isHidden,
  onCartOpen,
}: {
  menuOpen: boolean;
  setMenuOpen: (menuOpen: boolean | ((open: boolean) => boolean)) => void;
  searchOpen: boolean;
  setSearchOpen: (searchOpen: boolean | ((open: boolean) => boolean)) => void;
  isScrolled: boolean;
  isHidden: boolean;
  onCartOpen: () => void;
}) {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const closeMenu = () => setMenuOpen(false);
  const closeSearch = () => setSearchOpen(false);
  const closeOverlays = () => {
    setMenuOpen(false);
    setSearchOpen(false);
  };
  const handleCartClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    closeOverlays();
    onCartOpen();
  };
  const isHome = pathname === '/';
  const accountHref = user ? '/account' : '/sign-in';
  const accountLabel = user ? 'View account' : 'Sign in or create account';

  useEffect(() => {
    const syncCartCount = () => setCartCount(getStoredCartCount());

    syncCartCount();
    window.addEventListener(cartUpdatedEvent, syncCartCount);
    window.addEventListener('storage', syncCartCount);

    return () => {
      window.removeEventListener(cartUpdatedEvent, syncCartCount);
      window.removeEventListener('storage', syncCartCount);
    };
  }, []);

  useEffect(() => {
    if (!supabaseClient) {
      return;
    }

    let active = true;

    void supabaseClient.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setUser(nextSession?.user ?? null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const hasOpenOverlay = menuOpen || searchOpen;

    document.body.classList.toggle('mobile-menu-lock', hasOpenOverlay);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };

    if (hasOpenOverlay) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.classList.remove('mobile-menu-lock');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, searchOpen, setMenuOpen, setSearchOpen]);

  return (
    <header
      className={`site-header${isHome ? ' home-header' : ''}${menuOpen ? ' menu-open' : ''}${
        searchOpen ? ' search-open' : ''
      }${
        isScrolled ? ' is-scrolled' : ''
      }${isHidden ? ' is-hidden' : ''}`}
    >
      <Link className="brand" href="/" aria-label="Armoze home">
        <img className="brand-mark" src="/armoze-site-logo.png" alt="" aria-hidden="true" />
        <img className="brand-wordmark" src="/armoze-wordmark.png" alt="" aria-hidden="true" />
      </Link>
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-controls="primary-navigation"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        onClick={() => {
          setSearchOpen(false);
          setMenuOpen((open) => !open);
        }}
      >
        {menuOpen ? (
          <X aria-hidden="true" size={22} />
        ) : (
          <Menu aria-hidden="true" className="mobile-menu-icon" size={22} strokeWidth={2.8} />
        )}
      </button>
      <button
        className="mobile-search-nav-button"
        type="button"
        aria-controls="mobile-site-search"
        aria-expanded={searchOpen}
        aria-label={searchOpen ? 'Close search' : 'Open search'}
        onClick={() => {
          setMenuOpen(false);
          setSearchOpen((open) => !open);
        }}
      >
        <Search aria-hidden="true" size={21} strokeWidth={2.2} />
      </button>
      <Link
        className={`mobile-account-nav-link${user ? ' signed-in' : ''}`}
        href={accountHref}
        aria-label={accountLabel}
        title={accountLabel}
        onClick={closeOverlays}
      >
        <CircleUserRound aria-hidden="true" size={22} />
        <span className="sr-only">{accountLabel}</span>
      </Link>
      <Link
        className="mobile-cart-nav-link"
        href="/cart"
        aria-label={`View cart${cartCount ? `, ${cartCount} item${cartCount === 1 ? '' : 's'}` : ''}`}
        title="View cart"
        onClick={handleCartClick}
      >
        <ShoppingBag aria-hidden="true" size={22} />
        <span className="mobile-cart-count" aria-hidden="true">{cartCount}</span>
        <span className="sr-only">View cart</span>
      </Link>
      <button
        className={`mobile-menu-backdrop${menuOpen || searchOpen ? ' open' : ''}`}
        type="button"
        aria-label="Close navigation overlay"
        onClick={closeOverlays}
      />
      <section
        className={`mobile-search-panel${searchOpen ? ' open' : ''}`}
        id="mobile-site-search"
        aria-label="Site search"
        aria-hidden={searchOpen ? undefined : true}
      >
        <button className="mobile-search-close" type="button" onClick={closeSearch}>
          Close
        </button>
        <form className="mobile-search-form" action="/collections/best-sellers">
          <label className="sr-only" htmlFor="mobile-search-query">
            Search products
          </label>
          <input
            id="mobile-search-query"
            name="search"
            type="search"
            placeholder="Search products, categories, inspiration"
            autoComplete="off"
          />
          <button type="submit" aria-label="Submit search">
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </form>
        <p>Search for products, categories, information, inspiration, etc.</p>
        <div className="mobile-search-suggestions" aria-label="Search suggestions">
          <strong>Suggestions:</strong>
          <Link href="/collections/best-sellers" onClick={closeSearch}>Best Sellers</Link>
          <Link href="/collections/discipline-focus" onClick={closeSearch}>Focus</Link>
          <Link href="/collections/money-ambition" onClick={closeSearch}>Money</Link>
        </div>
      </section>
      <nav
        className={`nav-links${menuOpen ? ' open' : ''}`}
        id="primary-navigation"
        aria-label="Primary navigation"
      >
        <div className="mobile-menu-brand" aria-hidden="true">
          <img className="brand-mark" src="/armoze-site-logo.png" alt="" />
        </div>
        <Link href="/collections/best-sellers" onClick={closeMenu}>Best Sellers</Link>
        <Link href="/collections/money-ambition" onClick={closeMenu}>Money</Link>
        <Link href="/collections/discipline-focus" onClick={closeMenu}>Focus</Link>
        <Link href="/collections/new-arrivals" onClick={closeMenu}>New Arrivals</Link>
      </nav>
      <div className="desktop-header-actions">
        <form className="desktop-search-form" action="/collections/best-sellers">
          <label className="sr-only" htmlFor="desktop-search-query">
            Search products
          </label>
          <input
            id="desktop-search-query"
            name="search"
            type="search"
            placeholder="Search"
            autoComplete="off"
          />
          <button type="submit" aria-label="Submit search">
            <Search aria-hidden="true" size={18} strokeWidth={2.4} />
          </button>
        </form>
        <Link
          className={`desktop-login-nav-link${user ? ' signed-in' : ''}`}
          href={accountHref}
          aria-label={accountLabel}
          title={accountLabel}
          onClick={closeMenu}
        >
          {user ? 'Account' : 'Login'}
        </Link>
        <Link
          className="desktop-bag-nav-link"
          href="/cart"
          aria-label={`View bag${cartCount ? `, ${cartCount} item${cartCount === 1 ? '' : 's'}` : ''}`}
          title="View bag"
          onClick={handleCartClick}
        >
          <span>Bag</span>
          <span className="desktop-bag-count" aria-hidden="true">{cartCount}</span>
        </Link>
      </div>
    </header>
  );
}

type CartDrawerLine = StoredCartItem & {
  product: Product;
  sizeOption: SizeOption;
  frameOption: FrameOption;
  unitPrice: number;
};

function buildCartDrawerLines(cart: StoredCartItem[], products: Product[]) {
  return cart
    .map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);

      if (!product) {
        return null;
      }

      const sizeOption = getSizeOption(product, item.sizeId);
      const frameOption = getFrameOption(product, item.frameId, sizeOption);

      return {
        ...item,
        product,
        sizeOption,
        frameOption,
        unitPrice: getConfiguredUnitPrice(product, sizeOption, frameOption),
      };
    })
    .filter((item): item is CartDrawerLine => Boolean(item));
}

function getCartDrawerSubtotal(cartLines: CartDrawerLine[]) {
  return cartLines.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

type PublicCatalogResponse = {
  products?: Product[];
};

function CartDrawer({
  products,
  shouldFetchCatalog,
  isOpen,
  onClose,
}: {
  products: Product[];
  shouldFetchCatalog: boolean;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [cart, setCart] = useState<StoredCartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [fetchedProducts, setFetchedProducts] = useState<Product[] | null>(null);
  const catalogFetchState = useRef<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [checkoutState, setCheckoutState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [checkoutError, setCheckoutError] = useState('');
  const drawerProducts = shouldFetchCatalog ? fetchedProducts ?? products : products;
  const cartLines = useMemo(() => buildCartDrawerLines(cart, drawerProducts), [cart, drawerProducts]);
  const subtotal = useMemo(() => getCartDrawerSubtotal(cartLines), [cartLines]);
  const itemCount = cartLines.reduce((total, item) => total + item.quantity, 0);

  const closeDrawer = useCallback(() => {
    setCheckoutError('');
    setCheckoutState('idle');
    onClose();
  }, [onClose]);

  useEffect(() => {
    const syncStoredCart = () => {
      setCart(readStoredCart());
      setCartReady(true);
    };

    syncStoredCart();
    window.addEventListener(cartUpdatedEvent, syncStoredCart);
    window.addEventListener('storage', syncStoredCart);

    return () => {
      window.removeEventListener(cartUpdatedEvent, syncStoredCart);
      window.removeEventListener('storage', syncStoredCart);
    };
  }, []);

  useEffect(() => {
    if (!shouldFetchCatalog || !cartReady || !cart.length || catalogFetchState.current !== 'idle') {
      return;
    }

    let cancelled = false;
    catalogFetchState.current = 'loading';

    async function fetchPublicCatalog() {
      try {
        const response = await fetch('/api/products', {
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Public catalog request failed');
        }

        const catalog = (await response.json()) as PublicCatalogResponse;

        if (!cancelled && Array.isArray(catalog.products) && catalog.products.length) {
          setFetchedProducts(catalog.products);
          catalogFetchState.current = 'ready';
          return;
        }

        if (!cancelled) {
          catalogFetchState.current = 'error';
        }
      } catch (error) {
        console.warn('Cart drawer catalog unavailable; using bundled catalog.', error);

        if (!cancelled) {
          catalogFetchState.current = 'error';
        }
      }
    }

    void fetchPublicCatalog();

    return () => {
      cancelled = true;
    };
  }, [cart.length, cartReady, shouldFetchCatalog]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.body.classList.add('cart-drawer-lock');

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDrawer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('cart-drawer-lock');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeDrawer]);

  function updateQuantity(lineKey: string, nextQuantity: number) {
    const nextCart = cart
      .map((item) =>
        item.lineKey === lineKey
          ? { ...item, quantity: Math.max(0, Math.min(nextQuantity, 10)) }
          : item,
      )
      .filter((item) => item.quantity > 0);

    writeStoredCart(nextCart);
    notifyStoredCartUpdated(nextCart);
  }

  function removeItem(lineKey: string) {
    const nextCart = cart.filter((item) => item.lineKey !== lineKey);

    writeStoredCart(nextCart);
    notifyStoredCartUpdated(nextCart);
  }

  async function startCheckout() {
    if (!cartLines.length) {
      return;
    }

    setCheckoutState('loading');
    setCheckoutError('');

    const trackingItems = cartLines.map((item) =>
      getProductTrackingItem(item.product, item.sizeOption, item.frameOption, item.quantity),
    );

    trackStorefrontEvent('begin_checkout', {
      currency: 'USD',
      value: subtotal / 100,
      coupon: launchOfferCode,
      items: trackingItems,
    });

    try {
      const { data: authData } = supabaseClient
        ? await supabaseClient.auth.getSession()
        : { data: { session: null } };
      const accessToken = authData.session?.access_token;
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          attribution: getCheckoutAttribution(),
          items: cartLines.map((item) => ({
            id: item.productId,
            sizeId: item.sizeOption.id,
            frameId: item.frameOption.id,
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || 'Checkout request failed');
      }

      const data = (await response.json()) as { url?: string };

      if (!data.url) {
        throw new Error('Checkout URL missing');
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error(error);
      setCheckoutError(error instanceof Error ? error.message : 'Checkout request failed');
      setCheckoutState('error');
    }
  }

  return (
    <>
      <button
        aria-label="Close shopping bag"
        className={`cart-drawer-backdrop${isOpen ? ' open' : ''}`}
        type="button"
        onClick={closeDrawer}
      />
      <aside
        aria-hidden={isOpen ? undefined : true}
        aria-label="Shopping bag"
        aria-modal="true"
        className={`cart-drawer${isOpen ? ' open' : ''}`}
        role="dialog"
      >
        <header className="cart-drawer-header">
          <div>
            <strong>Bag</strong>
            <span>
              {cartReady ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : 'Loading'}
            </span>
          </div>
          <button className="cart-drawer-close" type="button" onClick={closeDrawer}>
            Close
          </button>
        </header>

        {cartReady && cartLines.length ? (
          <>
            <div className="cart-drawer-body">
              <div className="cart-drawer-items">
                {cartLines.map(({ frameOption, lineKey, product, quantity, sizeOption, unitPrice }) => (
                  <article className="cart-drawer-item" key={lineKey}>
                    <Link
                      className="cart-drawer-item-media"
                      href={`/products/${product.slug}`}
                      onClick={closeDrawer}
                      style={{ aspectRatio: getSizeOptionAspectRatio(sizeOption) }}
                    >
                      <ProductImage
                        product={product}
                        src={getCartProductImage(product)}
                        aspectRatio={getSizeOptionAspectRatio(sizeOption)}
                        className="cart-line-product-image"
                        priority
                        sizes="180px"
                      />
                    </Link>
                    <div className="cart-drawer-item-main">
                      <div className="cart-drawer-item-topline">
                        <div>
                          <h3>
                            <Link href={`/products/${product.slug}`} onClick={closeDrawer}>
                              {product.title}
                            </Link>
                          </h3>
                          <p>{sizeOption.label}</p>
                          <p>{frameOption.label}</p>
                        </div>
                        <strong>{formatPrice(unitPrice)}</strong>
                      </div>
                      <div className="cart-drawer-item-actions">
                        <div className="cart-drawer-quantity-controls" aria-label={`${product.title} quantity`}>
                          <button
                            aria-label={`Decrease ${product.title} quantity`}
                            type="button"
                            onClick={() => updateQuantity(lineKey, quantity - 1)}
                          >
                            <Minus aria-hidden="true" size={15} />
                          </button>
                          <span>{quantity}</span>
                          <button
                            aria-label={`Increase ${product.title} quantity`}
                            type="button"
                            onClick={() => updateQuantity(lineKey, quantity + 1)}
                          >
                            <Plus aria-hidden="true" size={15} />
                          </button>
                        </div>
                        <button className="cart-drawer-remove" type="button" onClick={() => removeItem(lineKey)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <footer className="cart-drawer-footer">
              <details className="cart-drawer-note">
                <summary>Add order note +</summary>
                <textarea aria-label="Order note" rows={3} />
              </details>
              <div className="cart-drawer-summary-row">
                <span>Subtotal</span>
                <strong>{formatPrice(subtotal)} USD</strong>
              </div>
              <div className="cart-drawer-summary-row">
                <span>Delivery Charges</span>
                <small>Free shipping. Tax calculated at checkout.</small>
              </div>
              <div className="cart-drawer-footer-actions">
                <button
                  className="cart-drawer-checkout"
                  disabled={checkoutState === 'loading'}
                  type="button"
                  onClick={startCheckout}
                >
                  {checkoutState === 'loading' ? 'Opening checkout' : 'Checkout'}
                </button>
                <button className="cart-drawer-secondary-action" type="button" onClick={closeDrawer}>
                  Shopping bag
                  <ArrowRight aria-hidden="true" size={14} />
                </button>
              </div>
              {checkoutState === 'error' ? (
                <p className="cart-drawer-error">
                  {checkoutError || 'Checkout could not be started. Please try again.'}
                </p>
              ) : null}
            </footer>
          </>
        ) : (
          <div className="cart-drawer-empty">
            <ShoppingBag aria-hidden="true" size={34} />
            <h3>{cartReady ? 'Your bag is empty' : 'Loading your bag'}</h3>
            <p>
              {cartReady
                ? 'Add a print from the shop to start checkout.'
                : 'Checking your saved Armoze prints.'}
            </p>
            {cartReady ? (
              <Link className="cart-drawer-browse" href="/collections/best-sellers" onClick={closeDrawer}>
                Browse prints
              </Link>
            ) : null}
          </div>
        )}
      </aside>
    </>
  );
}

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

type FooterLinkGroup = {
  title: string;
  links: FooterLink[];
};

function NextSiteFooter() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('Get 15% off your first order with code FIRST15. New drops and restocks — no spam.');
  const footerLinkGroups: FooterLinkGroup[] = [
    {
      title: 'Shop',
      links: [
        { href: '/collections/best-sellers', label: 'Best Sellers' },
        { href: '/collections/new-arrivals', label: 'New Arrivals' },
        { href: '/collections/money-ambition', label: 'Money' },
        { href: '/collections/discipline-focus', label: 'Focus' },
      ],
    },
    {
      title: 'Company',
      links: [
        { href: '/about', label: 'Our Story' },
        { href: '/support', label: 'Support' },
        { href: '/account', label: 'Account' },
      ],
    },
    {
      title: 'Information',
      links: [
        { href: '/support', label: 'Contact' },
        { href: '/shipping', label: 'Shipping' },
        { href: '/returns', label: 'Returns' },
        { href: '/privacy', label: 'Privacy' },
        { href: '/terms', label: 'Terms' },
      ],
    },
  ];
  const footerSocialLinks: FooterLink[] = [
    { href: 'https://www.instagram.com/itsarmoze', label: 'Instagram', external: true },
    { href: 'https://www.tiktok.com/@itsarmoze', label: 'TikTok', external: true },
    { href: 'https://www.youtube.com/@itsarmoze', label: 'YouTube', external: true },
  ];
  const mobileFooterGroups: FooterLinkGroup[] = [
    ...footerLinkGroups,
    {
      title: 'Socials',
      links: footerSocialLinks,
    },
  ];

  async function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewsletterStatus('loading');
    setNewsletterMessage('Adding you to the Armoze list...');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newsletterEmail, source: 'footer' }),
      });
      const data = (await response.json().catch(() => ({}))) as NewsletterResponse;

      if (!response.ok) {
        throw new Error(data.error || 'Newsletter signup failed.');
      }

      const discountCode = data.discount?.code || launchOfferCode;

      setNewsletterStatus('success');
      setNewsletterMessage(
        data.email?.sent
          ? `You are on the list. Your ${discountCode} code is in your inbox.`
          : `You are on the list. Your code is ${discountCode}.`,
      );
      trackStorefrontEvent('sign_up');
      setNewsletterEmail('');

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(newsletterPopupSubscribedKey, 'true');
      }

      rememberNewsletterPopupDismissal(newsletterPopupSubscribedDismissMs);
    } catch (error) {
      setNewsletterStatus('error');
      setNewsletterMessage(error instanceof Error ? error.message : 'Newsletter signup failed.');
    }
  }

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="footer-logo" href="/" aria-label="Armoze home">
            Armoze
          </Link>
          <p>Motivational canvas prints made for focused rooms, ambitious routines, and better everyday walls.</p>
          <p className="footer-copyright">&copy; 2026 Armoze.</p>
        </div>

        <nav className="footer-link-columns" aria-label="Footer navigation">
          {footerLinkGroups.map((group) => (
            <section className="footer-link-column" key={group.title}>
              <h2>{group.title}</h2>
              {group.links.map((link) => (
                <Link href={link.href} key={`${group.title}-${link.href}`}>
                  {link.label}
                </Link>
              ))}
            </section>
          ))}
          <section className="footer-link-column">
            <h2>Socials</h2>
            {footerSocialLinks.map((link) => (
              <a href={link.href} key={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ))}
          </section>
        </nav>

        <section className="footer-newsletter" aria-label="Newsletter signup">
          <h2>Straight to Your Routine</h2>
          <form onSubmit={handleNewsletterSubmit}>
            <label className="sr-only" htmlFor="next-newsletter-email">
              Email address
            </label>
            <div className="newsletter-form-row">
              <input
                id="next-newsletter-email"
                type="email"
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                placeholder="Your E-mail"
                autoComplete="email"
                required
              />
              <button type="submit" disabled={newsletterStatus === 'loading'} aria-label="Sign up for the newsletter">
                <ArrowRight aria-hidden="true" size={18} strokeWidth={2.4} />
              </button>
            </div>
            <p className={`newsletter-message ${newsletterStatus}`}>{newsletterMessage}</p>
          </form>
        </section>

        <nav className="footer-mobile-accordions" aria-label="Footer mobile navigation">
          {mobileFooterGroups.map((group) => (
            <details className="footer-mobile-accordion" key={group.title}>
              <summary>{group.title}</summary>
              <div className="footer-mobile-accordion-links">
                {group.links.map((link) =>
                  link.external ? (
                    <a href={link.href} key={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} key={link.href}>
                      {link.label}
                    </Link>
                  ),
                )}
              </div>
            </details>
          ))}
        </nav>
      </div>

      <details className="footer-policy-menu">
        <summary>Policies &amp; Support</summary>
        <nav aria-label="Footer policies">
          <Link href="/support">Customer Support</Link>
          <Link href="/about">Our Story</Link>
          <a href={supportMailto}>Email: {supportEmail}</a>
          <Link href="/account">Order History</Link>
          <Link href="/shipping">Shipping Policy</Link>
          <Link href="/terms">Terms and Conditions</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/returns">Refund Policy</Link>
        </nav>
      </details>

      <div className="footer-bottom">
        <p className="footer-bottom-copy">&copy; 2026 Armoze.</p>
        <ul className="footer-payment-badges" aria-label="Accepted payment methods">
          <li>Visa</li>
          <li>Mastercard</li>
          <li>Amex</li>
          <li>Klarna</li>
          <li>Amazon Pay</li>
          <li>Cash App</li>
        </ul>
        <div className="footer-market-selectors" aria-label="Store settings">
          <span className="footer-market-pill">United States (USD $)</span>
          <span className="footer-market-pill">English</span>
        </div>
      </div>
    </footer>
  );
}
