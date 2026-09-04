'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CircleUserRound,
  ChevronLeft,
  Gift,
  Globe,
  Headphones,
  LockKeyhole,
  Mail,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  StickyNote,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import {
  SiAmazonpay,
  SiAmericanexpress,
  SiCashapp,
  SiKlarna,
  SiMastercard,
  SiVisa,
} from 'react-icons/si';
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
  createCheckoutRequestId,
  formatPrice,
  getConfiguredUnitPrice,
  getFrameOption,
  getSizeOption,
  launchOfferDiscount,
  launchOfferCode,
  supportEmail,
  supportMailto,
} from './product-utils';
import { getProductTrackingItem, initStorefrontTracking, trackStorefrontEvent } from './analytics';
import {
  captureStorefrontAttribution,
  getCheckoutAttribution,
  getSafeStorefrontPagePath,
} from './attribution';
import { saveNewsletterDiscountCode } from './discount';
import { OptimizedRawImage, ProductThumbnail } from './OptimizedArtwork';
import { SearchDrawer } from './SearchDrawer';
import { useCartDiscount } from './useCartDiscount';
import { getCartOrderNote, saveCartOrderNote } from './cart-preferences';
import './storefront-navigation.css';
import './cart-drawer.css';
import './footer-benefits.css';
import './footer-reveal.css';

const newsletterPopupDelayMs = 12000;
const newsletterPopupDismissMs = 7 * 24 * 60 * 60 * 1000;
const newsletterPopupSubscribedDismissMs = 365 * 24 * 60 * 60 * 1000;
const newsletterPopupDismissedUntilKey = 'armoze-newsletter-popup-dismissed-until';
const newsletterPopupSubscribedKey = 'armoze-newsletter-popup-subscribed';
const storefrontSocialLinks = {
  instagram: 'https://www.instagram.com/itsarmoze',
  tiktok: 'https://www.tiktok.com/@itsarmoze',
  youtube: 'https://www.youtube.com/@itsarmoze',
} as const;
const footerPaymentMethods = [
  { id: 'visa', label: 'Visa', Icon: SiVisa },
  { id: 'mastercard', label: 'Mastercard', Icon: SiMastercard },
  { id: 'american-express', label: 'American Express', Icon: SiAmericanexpress },
  { id: 'klarna', label: 'Klarna', Icon: SiKlarna },
  { id: 'amazon-pay', label: 'Amazon Pay', Icon: SiAmazonpay },
  { id: 'cash-app', label: 'Cash App', Icon: SiCashapp },
] as const;

function InstagramIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.72-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z" />
    </svg>
  );
}

function YouTubeIcon({ size = 23 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.017 3.017 0 0 0 2.121 2.136c1.872.505 9.377.505 9.377.505s7.505 0 9.377-.505a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
    </svg>
  );
}

function RefinedMenuIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="mobile-menu-icon"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
    >
      <path d="M4 7h15" />
      <path d="M4 12h10.5" />
      <path d="M4 17h6" />
    </svg>
  );
}

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
    const pagePath = getSafeStorefrontPagePath();

    trackStorefrontEvent('page_view', {
      page_location: new URL(pagePath, window.location.origin).toString(),
      page_path: pagePath,
      page_title: document.title,
    });
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
  const dialogRef = useRef<HTMLElement>(null);
  const touchStartY = useRef<number | null>(null);
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [discountCode, setDiscountCode] = useState(launchOfferCode);

  const handleClose = useCallback(() => {
    setOpen(false);
    rememberNewsletterPopupDismissal(submitted ? newsletterPopupSubscribedDismissMs : newsletterPopupDismissMs);
  }, [submitted]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const preview = process.env.NODE_ENV === 'development' &&
      new URLSearchParams(window.location.search).get('newsletter') === 'preview';

    if (!preview && window.localStorage.getItem(newsletterPopupSubscribedKey) === 'true') {
      return undefined;
    }

    if (!preview && getStoredDismissedUntil() > Date.now()) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, preview ? 0 : newsletterPopupDelayMs);

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

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add('newsletter-popup-lock');
    dialogRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }

      if (event.key === 'Tab') {
        const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled])',
        ) || []).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];

        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('newsletter-popup-lock');
      previousFocus?.focus({ preventScroll: true });
    };
  }, [open, handleClose]);

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

      saveNewsletterDiscountCode(nextDiscountCode);
      setDiscountCode(nextDiscountCode);
      setSubmitted(true);
      setStatus('success');
      setMessage(
        data.email?.sent
          ? `Check your inbox. Your code is ${nextDiscountCode}.`
          : `Your code is ${nextDiscountCode}. Use it at checkout.`,
      );
      setEmail('');
      trackStorefrontEvent('generate_lead');

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

  if (!open) {
    return null;
  }

  return (
    <div
      className="newsletter-popup-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <section
        ref={dialogRef}
        aria-labelledby="newsletter-popup-title"
        aria-modal="true"
        className="newsletter-popup"
        role="dialog"
        tabIndex={-1}
      >
        <div className="newsletter-popup-artwork">
          <OptimizedRawImage
            src="/images/newsletter-dialed-in.webp"
            alt="Dialed In canvas artwork with focus, growth, and purpose controls"
            sizes="310px"
            fill
          />
        </div>
        <button
          type="button"
          className="newsletter-popup-handle"
          onClick={handleClose}
          onTouchStart={(event) => { touchStartY.current = event.touches[0].clientY; }}
          onTouchEnd={(event) => {
            if (touchStartY.current !== null && event.changedTouches[0].clientY - touchStartY.current > 40) {
              handleClose();
            }
            touchStartY.current = null;
          }}
          aria-label="Close newsletter discount popup"
        >
          <span />
        </button>
        <button
          type="button"
          className="newsletter-popup-close"
          onClick={handleClose}
          aria-label="Close newsletter discount popup"
        >
          <X aria-hidden="true" size={18} strokeWidth={1.6} />
        </button>

        <div className="newsletter-popup-content">
          <div className="newsletter-popup-copy">
            <p>{submitted ? "You're on the list" : 'First timer?'}</p>
            <h2 id="newsletter-popup-title">
              {submitted ? <>Enjoy <span className="newsletter-popup-offer">{launchOfferDiscount} off</span> your first order</> :
                <>Sign up and get <span className="newsletter-popup-offer">{launchOfferDiscount} off</span> your first order</>}
            </h2>
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
              <div className="newsletter-popup-input-row">
                <input
                  id="newsletter-popup-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                />
                <button type="submit" disabled={status === 'loading'} aria-label={status === 'loading' ? 'Subscribing' : 'Sign up for 15% off'}>
                  <ArrowRight aria-hidden="true" size={22} strokeWidth={1.7} />
                </button>
              </div>
            </form>
          )}

          <p className={`newsletter-popup-message ${status}`} aria-live="polite">
            {message}
          </p>
          <p className="newsletter-popup-description">
            Subscribe to our newsletter and be the first to hear about our new arrivals, special promotions and online exclusives.
          </p>
          <div className="newsletter-popup-socials" aria-label="Follow Armoze">
            <a href={storefrontSocialLinks.instagram} target="_blank" rel="noreferrer" aria-label="Armoze on Instagram">
              <InstagramIcon size={20} />
            </a>
            <a href={storefrontSocialLinks.tiktok} target="_blank" rel="noreferrer" aria-label="Armoze on TikTok">
              <TikTokIcon size={18} />
            </a>
            <a href={storefrontSocialLinks.youtube} target="_blank" rel="noreferrer" aria-label="Armoze on YouTube">
              <YouTubeIcon size={21} />
            </a>
          </div>
        </div>
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
  const promoMessages = [
    {
      id: 'launch-offer',
      Icon: Gift,
      content: (
        <span>
          {launchOfferDiscount} off with code <strong>{launchOfferCode}</strong>
        </span>
      ),
    },
    {
      id: 'contact',
      Icon: Mail,
      content: <Link href="/support">A question? Visit our contact page</Link>,
    },
  ] as const;
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [previousPromoIndex, setPreviousPromoIndex] = useState<number | null>(null);
  const [promoDirection, setPromoDirection] = useState<'forward' | 'backward'>('forward');
  const [rotationVersion, setRotationVersion] = useState(0);
  const activePromoIndexRef = useRef(0);
  const transitionTimerRef = useRef<number | null>(null);

  const showPromo = useCallback((step: 1 | -1) => {
    const currentIndex = activePromoIndexRef.current;
    const nextIndex = (currentIndex + step + promoMessages.length) % promoMessages.length;

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }

    setPreviousPromoIndex(currentIndex);
    setPromoDirection(step > 0 ? 'forward' : 'backward');
    activePromoIndexRef.current = nextIndex;
    setActivePromoIndex(nextIndex);
    transitionTimerRef.current = window.setTimeout(() => {
      setPreviousPromoIndex(null);
      transitionTimerRef.current = null;
    }, 520);
  }, [promoMessages.length]);

  useEffect(() => {
    const rotationTimer = window.setInterval(() => showPromo(1), 2500);

    return () => window.clearInterval(rotationTimer);
  }, [rotationVersion, showPromo]);

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }
  }, []);

  const movePromo = (step: 1 | -1) => {
    showPromo(step);
    setRotationVersion((version) => version + 1);
  };
  const className = [
    'launch-promo-bar',
    isHome ? 'home-promo-bar' : undefined,
    isScrolled ? 'is-scrolled' : undefined,
    isHidden ? 'is-hidden' : undefined,
  ].filter(Boolean).join(' ');

  return (
    <section className={className} aria-label="Store announcements">
      <div className={`launch-promo-carousel direction-${promoDirection}`}>
        <button
          className="launch-promo-arrow"
          type="button"
          aria-label="Previous announcement"
          onClick={() => movePromo(-1)}
        >
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.7} />
        </button>
        <div className="launch-promo-viewport" aria-live="polite">
          {promoMessages.map(({ id, Icon, content }, index) => {
            const isActive = index === activePromoIndex;
            const isPrevious = index === previousPromoIndex;

            return (
              <div
                className={`launch-promo-slide${isActive ? ' is-active' : ''}${isPrevious ? ' is-previous' : ''}`}
                aria-hidden={!isActive}
                inert={!isActive}
                key={id}
              >
                <Icon aria-hidden="true" size={15} strokeWidth={1.7} />
                {content}
              </div>
            );
          })}
        </div>
        <button
          className="launch-promo-arrow"
          type="button"
          aria-label="Next announcement"
          onClick={() => movePromo(1)}
        >
          <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
        </button>
      </div>
    </section>
  );
}

const primaryNavigationLinks = [
  { href: '/collections/best-sellers', label: 'Best Sellers' },
  { href: '/collections/money-ambition', label: 'Money' },
  { href: '/collections/music', label: 'Music' },
  { href: '/collections/new-arrivals', label: 'New Arrivals' },
];

function MobileNavigationSheet({ open, onClose, accountHref, signedIn }: {
  open: boolean;
  onClose: () => void;
  accountHref: string;
  signedIn: boolean;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const sheet = sheetRef.current;
    sheet?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = sheet?.querySelectorAll<HTMLElement>('a[href], button');
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !sheet?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sheet?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      document.removeEventListener('keydown', trapFocus);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <div className={`navigation-sheet-overlay${open ? ' is-open' : ''}`} inert={!open} aria-hidden={!open}>
      <div className="navigation-sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div ref={sheetRef} className="navigation-sheet" id="mobile-navigation" role="dialog" aria-modal={open ? true : undefined} aria-label="Navigation menu">
        <button
          className="navigation-sheet-handle"
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          onTouchStart={(event) => { touchStartY.current = event.touches[0].clientY; }}
          onTouchEnd={(event) => {
            if (touchStartY.current !== null && event.changedTouches[0].clientY - touchStartY.current > 45) onClose();
            touchStartY.current = null;
          }}
        ><span /></button>
        <nav className="navigation-sheet-links" aria-label="Mobile primary navigation">
          {primaryNavigationLinks.map(({ href, label }) => (
            <Link key={href} href={href} onClick={onClose}>
              <span>{label}</span><ChevronRight size={19} strokeWidth={1.6} aria-hidden="true" />
            </Link>
          ))}
        </nav>
        <div className="navigation-sheet-footer">
          <div className="navigation-sheet-locale" aria-label="Store language and currency">
            <span>English</span><span>United States (USD $)</span>
          </div>
          <div className="navigation-sheet-account-row">
            <Link className="navigation-sheet-login" href={accountHref} onClick={onClose}>
              <CircleUserRound size={18} strokeWidth={1.6} aria-hidden="true" />{signedIn ? 'Account' : 'Login'}
            </Link>
            <div className="navigation-sheet-socials" aria-label="Follow Armoze">
              <a href={storefrontSocialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram @itsarmoze" onClick={onClose}><InstagramIcon /></a>
              <a href={storefrontSocialLinks.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok @itsarmoze" onClick={onClose}><TikTokIcon /></a>
              <a href={storefrontSocialLinks.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube @itsarmoze" onClick={onClose}><YouTubeIcon /></a>
            </div>
          </div>
        </div>
      </div>
    </div>
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
    const desktop = window.matchMedia('(min-width: 761px)');
    const closeOnDesktop = () => {
      if (desktop.matches) {
        setMenuOpen(false);
      }
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [setMenuOpen]);

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
    <>
    <header
      className={`site-header storefront-navigation${pathname === '/about' ? ' story-header' : ''}${isHome ? ' home-header' : ''}${menuOpen ? ' menu-open' : ''}${
        searchOpen ? ' search-open' : ''
      }${
        isScrolled ? ' is-scrolled' : ''
      }${isHidden ? ' is-hidden' : ''}`}
    >
      <Link className="brand" href="/" aria-label="Armoze home">
        <span className="brand-mark" aria-hidden="true" />
      </Link>
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-controls="mobile-navigation"
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
          <RefinedMenuIcon size={24} />
        )}
      </button>
      <div className="mobile-header-actions">
        <button
          className="mobile-search-nav-button"
          type="button"
          aria-controls="storefront-search"
          aria-expanded={searchOpen}
          aria-label={searchOpen ? 'Close search' : 'Open search'}
          onClick={() => {
            setMenuOpen(false);
            setSearchOpen((open) => !open);
          }}
        >
          <Search aria-hidden="true" size={21} strokeWidth={1.75} />
        </button>
        <Link
          className="mobile-cart-nav-link"
          href="/cart"
          aria-label={`View cart${cartCount ? `, ${cartCount} item${cartCount === 1 ? '' : 's'}` : ''}`}
          title="View cart"
          onClick={handleCartClick}
        >
          <ShoppingBag aria-hidden="true" size={22} strokeWidth={1.65} />
          <span className="mobile-cart-count" aria-hidden="true">{cartCount}</span>
          <span className="sr-only">View cart</span>
        </Link>
      </div>
      <nav
        className="nav-links"
        id="primary-navigation"
        aria-label="Primary navigation"
      >
        {primaryNavigationLinks.map(({ href, label }) => (
          <Link key={href} href={href} onClick={closeMenu}>{label}</Link>
        ))}
      </nav>
      <div className="desktop-header-actions">
        <button
          className="desktop-search-nav-button"
          type="button"
          aria-controls="storefront-search"
          aria-expanded={searchOpen}
          aria-label={searchOpen ? 'Close search' : 'Open search'}
          onClick={() => {
            setMenuOpen(false);
            setSearchOpen((open) => !open);
          }}
        ><Search aria-hidden="true" size={23} strokeWidth={1.6} /></button>
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
    <MobileNavigationSheet open={menuOpen} onClose={closeMenu} accountHref={accountHref} signedIn={Boolean(user)} />
    <SearchDrawer open={searchOpen} onClose={closeSearch} categories={primaryNavigationLinks} />
    </>
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
  const [orderNote, setOrderNote] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [codeDraft, setCodeDraft] = useState('');
  const [activePanel, setActivePanel] = useState<'note' | 'shipping' | 'discount' | null>(null);
  const [panelView, setPanelView] = useState<'note' | 'shipping' | 'discount'>('note');
  const [activeTab, setActiveTab] = useState<'cart' | 'recent'>('cart');
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const drawerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const checkoutRequest = useRef<{ id: string; signature: string } | null>(null);
  const trackedDrawerView = useRef(false);
  const drawerProducts = shouldFetchCatalog ? fetchedProducts ?? products : products;
  const cartLines = useMemo(() => buildCartDrawerLines(cart, drawerProducts), [cart, drawerProducts]);
  const subtotal = useMemo(() => getCartDrawerSubtotal(cartLines), [cartLines]);
  const itemCount = cartLines.reduce((total, item) => total + item.quantity, 0);
  const cartSignature = JSON.stringify(cartLines.map((item) => ({ id: item.productId, sizeId: item.sizeOption.id, frameId: item.frameOption.id, quantity: item.quantity })));
  const discount = useCartDiscount(isOpen, cartSignature, subtotal);
  const discountedSubtotal = subtotal - (discount.quote?.amount || 0);
  const suggestions = drawerProducts.filter((product) => !cartLines.some((line) => line.productId === product.id)).slice(0, 8);
  const suggestion = suggestions[suggestionIndex % (suggestions.length || 1)];
  const recentlyViewed = recentSlugs.map((slug) => drawerProducts.find((product) => product.slug === slug)).filter((product): product is Product => Boolean(product));

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setOrderNote(getCartOrderNote());
      try {
      const saved: unknown = JSON.parse(window.localStorage.getItem('armoze-recent-prints') || '[]');
      const slugs = Array.isArray(saved) ? saved.filter((slug): slug is string => typeof slug === 'string') : [];
      const current = pathname?.startsWith('/products/') ? pathname.split('/')[2] : '';
      const next = (current ? [current, ...slugs.filter((slug) => slug !== current)] : slugs).slice(0, 8);
      setRecentSlugs(next);
      window.localStorage.setItem('armoze-recent-prints', JSON.stringify(next));
      } catch { /* Recently viewed is optional when storage is unavailable. */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  function openPanel(panel: 'note' | 'shipping' | 'discount') {
    setNoteDraft(orderNote);
    setCodeDraft(discount.quote?.code || '');
    setPanelView(panel);
    setActivePanel(panel);
  }

  const closeDrawer = useCallback(() => {
    setCheckoutError('');
    setCheckoutState('idle');
    setActivePanel(null);
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
      trackedDrawerView.current = false;
      return;
    }

    document.body.classList.add('cart-drawer-lock');
    const surface = activePanel ? panelRef.current : drawerRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (activePanel) setActivePanel(null);
        else closeDrawer();
      }
      if (event.key === 'Tab') {
        const items = Array.from(surface?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input, textarea') ?? [])
          .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest('[inert]'));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const focusInside = items.includes(document.activeElement as HTMLElement);
        if (event.shiftKey && (!focusInside || document.activeElement === first)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (!focusInside || document.activeElement === last)) {
          event.preventDefault(); first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('cart-drawer-lock');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeDrawer, activePanel]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    drawerRef.current?.focus({ preventScroll: true });
    return () => previousFocus?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (!activePanel) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const drawer = drawerRef.current;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      if (drawer?.classList.contains('open')) previousFocus?.focus({ preventScroll: true });
    };
  }, [activePanel]);

  useEffect(() => {
    if (!isOpen || !cartReady || !cartLines.length || trackedDrawerView.current) {
      return;
    }

    trackedDrawerView.current = true;
    trackStorefrontEvent('view_cart', {
      currency: 'USD',
      value: subtotal / 100,
      items: cartLines.map((item) =>
        getProductTrackingItem(item.product, item.sizeOption, item.frameOption, item.quantity),
      ),
    });
  }, [cartLines, cartReady, isOpen, subtotal]);

  function updateQuantity(lineKey: string, nextQuantity: number) {
    const line = cartLines.find((item) => item.lineKey === lineKey);
    const boundedQuantity = Math.max(0, Math.min(nextQuantity, 10));

    if (line && boundedQuantity !== line.quantity) {
      const quantityDelta = boundedQuantity - line.quantity;
      const changedQuantity = Math.abs(quantityDelta);

      trackStorefrontEvent(quantityDelta > 0 ? 'add_to_cart' : 'remove_from_cart', {
        currency: 'USD',
        value: (line.unitPrice * changedQuantity) / 100,
        items: [
          getProductTrackingItem(
            line.product,
            line.sizeOption,
            line.frameOption,
            changedQuantity,
          ),
        ],
      });
    }

    const nextCart = cart
      .map((item) =>
        item.lineKey === lineKey
          ? { ...item, quantity: boundedQuantity }
          : item,
      )
      .filter((item) => item.quantity > 0);

    writeStoredCart(nextCart);
    notifyStoredCartUpdated(nextCart);
  }

  function removeItem(lineKey: string) {
    const line = cartLines.find((item) => item.lineKey === lineKey);

    if (line) {
      trackStorefrontEvent('remove_from_cart', {
        currency: 'USD',
        value: (line.unitPrice * line.quantity) / 100,
        items: [
          getProductTrackingItem(
            line.product,
            line.sizeOption,
            line.frameOption,
            line.quantity,
          ),
        ],
      });
    }

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
    const checkoutItems = cartLines.map((item) => ({
      id: item.productId,
      sizeId: item.sizeOption.id,
      frameId: item.frameOption.id,
      quantity: item.quantity,
    }));
    const discountCode = discount.quote?.code || '';
    const checkoutSignature = JSON.stringify({ items: checkoutItems, orderNote: orderNote.trim(), discountCode });

    if (!checkoutRequest.current || checkoutRequest.current.signature !== checkoutSignature) {
      checkoutRequest.current = {
        id: createCheckoutRequestId(),
        signature: checkoutSignature,
      };
    }

    trackStorefrontEvent('begin_checkout', {
      currency: 'USD',
      value: subtotal / 100,
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
          checkoutRequestId: checkoutRequest.current.id,
          items: checkoutItems,
          orderNote: orderNote.trim(),
          ...(discountCode ? { discountCode } : {}),
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
      <div className={`bag-backdrop${isOpen ? ' open' : ''}`} onClick={closeDrawer} aria-hidden="true" />
      <aside ref={drawerRef} tabIndex={-1} inert={!isOpen} aria-hidden={!isOpen} aria-label="Shopping cart" aria-modal={isOpen ? true : undefined} className={`cart-drawer concept-cart${isOpen ? ' open' : ''}`} role="dialog">
        <div className="bag-base" inert={Boolean(activePanel)} aria-hidden={activePanel ? true : undefined}>
          <button className="bag-handle" type="button" aria-label="Close cart" onClick={closeDrawer}><span /></button>
          <header className="bag-header">
            <div className="bag-tabs" role="tablist" aria-label="Cart views" onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === 'Home' ? 'cart' : event.key === 'End' ? 'recent' : activeTab === 'cart' ? 'recent' : 'cart';
              setActiveTab(next);
              event.currentTarget.querySelector<HTMLButtonElement>(`#bag-${next}-tab`)?.focus();
            }}>
              <button id="bag-cart-tab" type="button" role="tab" tabIndex={activeTab === 'cart' ? 0 : -1} aria-selected={activeTab === 'cart'} aria-controls="bag-cart-content" onClick={() => setActiveTab('cart')}>Cart<sup>{itemCount || ''}</sup></button>
              <button id="bag-recent-tab" type="button" role="tab" tabIndex={activeTab === 'recent' ? 0 : -1} aria-selected={activeTab === 'recent'} aria-controls="bag-recent-content" onClick={() => setActiveTab('recent')}>Recently viewed</button>
            </div>
            <button className="bag-close" type="button" aria-label="Close cart" onClick={closeDrawer}><X size={21} strokeWidth={1.5} aria-hidden="true" /></button>
          </header>
          {activeTab === 'recent' ? (
            <div className="bag-body" id="bag-recent-content" role="tabpanel" aria-labelledby="bag-recent-tab">
              {recentlyViewed.length ? recentlyViewed.map((product) => (
                <Link className="bag-recent-item" key={product.id} href={`/products/${product.slug}`} onClick={closeDrawer}>
                  <span className="bag-suggestion-image"><ProductThumbnail product={product} sizes="(max-width: 760px) 64px, 84px" /></span>
                  <span>{product.title}<small>{formatPrice(getConfiguredUnitPrice(product, getSizeOption(product, ''), getFrameOption(product, '', getSizeOption(product, ''))))}</small></span>
                  <ChevronRight size={19} aria-hidden="true" />
                </Link>
              )) : <div className="bag-empty"><h3>Your next favorite is waiting.</h3><p>The prints you view will appear here.</p><Link className="bag-pill" href="/collections/best-sellers" onClick={closeDrawer}>Explore prints</Link></div>}
            </div>
          ) : (
            <div className="bag-cart-content" id="bag-cart-content" role="tabpanel" aria-labelledby="bag-cart-tab">
              <div className="bag-body">
                <div className="bag-shipping-promise"><p><Package size={18} strokeWidth={1.5} aria-hidden="true" /><span>Free shipping on every order. No minimum.</span></p><span className="bag-shipping-line" /></div>
                {cartReady && cartLines.length ? (
                  <>
                    <div className="bag-items">
                      {cartLines.map(({ frameOption, lineKey, product, quantity, sizeOption, unitPrice }) => (
                        <article className="bag-item" key={lineKey}>
                          <Link className="bag-item-image" href={`/products/${product.slug}`} onClick={closeDrawer}>
                            <ProductThumbnail product={product} sizes="(max-width: 760px) 72px, 96px" />
                          </Link>
                          <div className="bag-item-description"><h3><Link href={`/products/${product.slug}`} onClick={closeDrawer}>{product.title}</Link></h3><p>{sizeOption.label} · {frameOption.label}</p><strong>{formatPrice(unitPrice)}</strong></div>
                          <div className="bag-item-controls">
                            <div className="bag-quantity" aria-label={`${product.title} quantity`}>
                              <button type="button" aria-label={`Decrease ${product.title} quantity`} disabled={checkoutState === 'loading'} onClick={() => updateQuantity(lineKey, quantity - 1)}><Minus size={12} aria-hidden="true" /></button>
                              <span aria-live="polite">{quantity}</span>
                              <button type="button" aria-label={`Increase ${product.title} quantity`} disabled={quantity >= 10 || checkoutState === 'loading'} onClick={() => updateQuantity(lineKey, quantity + 1)}><Plus size={12} aria-hidden="true" /></button>
                            </div>
                            <button className="bag-remove" type="button" disabled={checkoutState === 'loading'} aria-label={`Remove ${product.title}`} onClick={() => removeItem(lineKey)}>Remove</button>
                          </div>
                        </article>
                      ))}
                    </div>
                    {suggestion ? <section className="bag-recommendations" aria-label="You may also like">
                      <div className="bag-recommendation-heading"><h3>You may also like</h3><button type="button" aria-label="Previous suggested print" onClick={() => setSuggestionIndex((index) => (index - 1 + suggestions.length) % suggestions.length)}><ChevronLeft size={17} aria-hidden="true" /></button><button type="button" aria-label="Next suggested print" onClick={() => setSuggestionIndex((index) => index + 1)}><ChevronRight size={17} aria-hidden="true" /></button></div>
                      <div className="bag-suggestion"><Link className="bag-suggestion-image" href={`/products/${suggestion.slug}`} onClick={closeDrawer}><ProductThumbnail product={suggestion} sizes="(max-width: 760px) 64px, 84px" /></Link><div><h4>{suggestion.title}</h4><p>{formatPrice(getConfiguredUnitPrice(suggestion, getSizeOption(suggestion, ''), getFrameOption(suggestion, '', getSizeOption(suggestion, ''))))}</p></div><Link className="bag-pill" href={`/products/${suggestion.slug}`} onClick={closeDrawer}><Plus size={16} aria-hidden="true" />View</Link></div>
                    </section> : null}
                  </>
                ) : <div className="bag-empty"><ShoppingBag size={34} strokeWidth={1.4} aria-hidden="true" /><h3>{cartReady ? 'Your cart is empty' : 'Loading your cart'}</h3><p>{cartReady ? 'Find a print that moves you.' : 'Checking your saved prints.'}</p>{cartReady ? <Link className="bag-pill" href="/collections/best-sellers" onClick={closeDrawer}>Explore prints</Link> : null}</div>}
              </div>
              {cartReady && cartLines.length ? <footer className="bag-footer">
                <div className="bag-tools"><button type="button" onClick={() => openPanel('note')}><StickyNote size={21} strokeWidth={1.5} aria-hidden="true" /><span>Order note{orderNote ? ' ✓' : ''}</span></button><button type="button" onClick={() => openPanel('shipping')}><Package size={21} strokeWidth={1.5} aria-hidden="true" /><span>Shipping</span></button><button type="button" onClick={() => openPanel('discount')}><Tag size={21} strokeWidth={1.5} aria-hidden="true" /><span>Discount</span></button></div>
                <div className="bag-totals">
                  {discount.quote ? <div className="bag-discount-row"><span><Tag size={18} strokeWidth={1.5} aria-hidden="true" />Order discount <small>{discount.quote.code}</small></span><strong>−{formatPrice(discount.quote.amount)}</strong></div> : null}
                  <div className="bag-total-row"><p>Taxes calculated at checkout.<br />Shipping is always free.</p><div><span>Subtotal</span><strong>{formatPrice(discountedSubtotal)} <small>USD</small></strong></div></div>
                  <button className="bag-checkout bag-pill" disabled={checkoutState === 'loading' || discount.loading} type="button" onClick={startCheckout}><LockKeyhole size={18} strokeWidth={1.5} aria-hidden="true" />{checkoutState === 'loading' ? 'Opening checkout…' : discount.loading ? 'Checking discount…' : 'Check out'}</button>
                  {checkoutState === 'error' ? <p className="bag-error" role="alert">{checkoutError || 'Checkout could not be started. Please try again.'}</p> : null}
                  {discount.error ? <p className="bag-error" role="status">{discount.error}</p> : null}
                </div>
              </footer> : null}
            </div>
          )}
        </div>
        <div className={`bag-panel-layer${activePanel ? ' open' : ''}`} inert={!activePanel} aria-hidden={!activePanel}>
          <div className="bag-panel-scrim" aria-hidden="true" onClick={() => setActivePanel(null)} />
          <div className="bag-panel" data-panel={panelView} ref={panelRef} tabIndex={-1} role="dialog" aria-modal={activePanel ? true : undefined} aria-labelledby="bag-panel-title">
            <div className="bag-panel-heading"><h3 id="bag-panel-title">{panelView === 'note' ? 'Order note' : panelView === 'shipping' ? 'Shipping' : 'Discount'}</h3><button type="button" aria-label="Close cart options" onClick={() => setActivePanel(null)}><X size={20} strokeWidth={1.5} aria-hidden="true" /></button></div>
            {panelView === 'note' ? <form onSubmit={(event) => { event.preventDefault(); const note = noteDraft.trim(); setOrderNote(note); saveCartOrderNote(note); setActivePanel(null); }}><label className="sr-only" htmlFor="bag-order-note">Order note</label><textarea id="bag-order-note" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} maxLength={500} rows={2} placeholder="Add a note to your order" /><button className="bag-pill" type="submit">Save</button></form> : null}
            {panelView === 'shipping' ? <div className="bag-shipping-details"><div><span>Standard shipping</span><strong>Free</strong></div><p>Most orders arrive in 5–8 business days.</p><Link href="/shipping" onClick={closeDrawer}>Shipping policy</Link><button type="button" className="bag-pill" onClick={() => setActivePanel(null)}>Done</button></div> : null}
            {panelView === 'discount' ? <form onSubmit={(event) => { event.preventDefault(); discount.apply(codeDraft); }}><label className="sr-only" htmlFor="bag-discount-code">Discount code</label><input id="bag-discount-code" value={codeDraft} onChange={(event) => setCodeDraft(event.target.value)} placeholder="Discount code" autoComplete="off" maxLength={80} required /><div className="bag-panel-actions"><button className="bag-pill" type="submit" disabled={discount.loading}>{discount.loading ? 'Applying…' : 'Apply'}</button>{discount.quote ? <button className="bag-remove" type="button" onClick={() => { discount.remove(); setCodeDraft(''); }}>Remove code</button> : null}</div>{discount.error ? <p className="bag-error" role="alert">{discount.error}</p> : null}{discount.quote ? <p className="bag-applied" role="status">{discount.quote.code} applied. You save {formatPrice(discount.quote.amount)}.</p> : null}</form> : null}
          </div>
        </div>
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

const footerBenefits = [
  { title: 'Customer service', description: 'Here to help, every step of the way.', Icon: Headphones },
  { title: 'Always free shipping', description: 'Free shipping on every order. No minimum.', Icon: Package },
  { title: 'Your first order, 15% off', description: 'Join the newsletter for your welcome offer.', Icon: Tag },
  { title: 'Secure payment', description: 'Your payment information is processed securely.', Icon: ShieldCheck },
];

function FooterBenefits() {
  const [activeBenefit, setActiveBenefit] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  function showBenefit(index: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({
      left: index * track.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }

  return (
    <section className="footer-benefits" aria-label="Shopping with Armoze">
      <div className="footer-benefits-surface">
        <div className="footer-benefits-inner" id="footer-benefits-track" ref={trackRef} onScroll={(event) => {
          const track = event.currentTarget;
          if (!track.clientWidth) return;
          setActiveBenefit(Math.max(0, Math.min(footerBenefits.length - 1, Math.round(track.scrollLeft / track.clientWidth))));
        }}>
          {footerBenefits.map(({ title, description, Icon }, index) => (
            <div className="footer-benefit" key={title} id={`footer-benefit-${index}`}>
              <Icon aria-hidden="true" size={24} strokeWidth={1.6} />
              <div><h2>{title}</h2><p>{description}</p></div>
            </div>
          ))}
        </div>
        <div className="footer-benefit-dots" role="group" aria-label="Choose a shopping benefit">
          {footerBenefits.map(({ title }, index) => (
            <button key={title} type="button" aria-label={`Show ${title.toLowerCase()}`} aria-controls={`footer-benefit-${index}`} aria-current={activeBenefit === index ? 'true' : undefined} onClick={() => showBenefit(index)} onKeyDown={(event) => {
              const nextIndex = event.key === 'ArrowRight' ? Math.min(index + 1, footerBenefits.length - 1)
                : event.key === 'ArrowLeft' ? Math.max(index - 1, 0)
                  : event.key === 'Home' ? 0 : event.key === 'End' ? footerBenefits.length - 1 : null;
              if (nextIndex === null) return;
              event.preventDefault();
              showBenefit(nextIndex);
              event.currentTarget.parentElement?.querySelectorAll('button')[nextIndex]?.focus({ preventScroll: true });
            }}><span /></button>
          ))}
        </div>
      </div>
    </section>
  );
}

function FooterReveal({ children }: { children: ReactNode }) {
  const revealWindowRef = useRef<HTMLDivElement>(null);
  const revealContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const revealWindow = revealWindowRef.current;
    const content = revealContentRef.current;
    if (!revealWindow || !content) return;

    const desktopMotion = window.matchMedia('(min-width: 761px) and (prefers-reduced-motion: no-preference)');
    let enabled = false;
    let footerHeight = 0;
    let motionFrame = 0;
    const updateMotion = () => {
      motionFrame = 0;
      if (!enabled) return;
      const distanceFromBottom = revealWindow.getBoundingClientRect().bottom - window.innerHeight;
      const progress = Math.max(0, Math.min(1, distanceFromBottom / footerHeight));
      // Move the entire footer, including payments and copyright, at a gentler scroll rate.
      content.style.setProperty('--footer-reveal-offset', `${(progress * footerHeight * 0.28).toFixed(2)}px`);
    };
    const queueMotion = () => {
      if (enabled && !motionFrame) motionFrame = window.requestAnimationFrame(updateMotion);
    };
    const updateReveal = () => {
      footerHeight = Math.ceil(content.getBoundingClientRect().height);
      // Keep tall footers in normal flow so every link remains reachable on short screens.
      enabled = desktopMotion.matches && footerHeight > 0 && footerHeight <= window.innerHeight - 80;
      revealWindow.style.setProperty('--footer-reveal-height', `${footerHeight}px`);
      revealWindow.dataset.reveal = String(enabled);
      if (!enabled) content.style.removeProperty('--footer-reveal-offset');
      queueMotion();
    };
    const observer = new ResizeObserver(updateReveal);
    observer.observe(content);
    desktopMotion.addEventListener('change', updateReveal);
    window.addEventListener('resize', updateReveal);
    window.addEventListener('scroll', queueMotion, { passive: true });
    updateReveal();

    return () => {
      observer.disconnect();
      desktopMotion.removeEventListener('change', updateReveal);
      window.removeEventListener('resize', updateReveal);
      window.removeEventListener('scroll', queueMotion);
      window.cancelAnimationFrame(motionFrame);
    };
  }, []);

  function revealFocusedFooter() {
    const revealWindow = revealWindowRef.current;
    if (revealWindow?.dataset.reveal !== 'true') return;
    const bounds = revealWindow.getBoundingClientRect();
    if (bounds.bottom > window.innerHeight || bounds.top < 0) {
      revealWindow.scrollIntoView({ block: 'end', behavior: 'instant' });
      const content = revealContentRef.current;
      content?.style.setProperty('--footer-reveal-offset', '0px');
      // Keyboard navigation should reveal its target immediately, without waiting for the easing.
      content?.getAnimations().forEach((animation) => animation.finish());
    }
  }

  return (
    <div className="footer-reveal-window" ref={revealWindowRef}>
      <div className="footer-reveal-content" ref={revealContentRef} onFocusCapture={revealFocusedFooter}>
        {children}
      </div>
    </div>
  );
}

function NextSiteFooter() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const footerLinkGroups: FooterLinkGroup[] = [
    {
      title: 'Shop',
      links: [
        { href: '/collections/best-sellers', label: 'Best Sellers' },
        { href: '/collections/new-arrivals', label: 'New Arrivals' },
        { href: '/collections/money-ambition', label: 'Money' },
        { href: '/collections/music', label: 'Music' },
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
        { href: '/faqs', label: 'FAQs' },
        { href: '/shipping', label: 'Shipping' },
        { href: '/returns', label: 'Returns' },
        { href: '/privacy', label: 'Privacy' },
        { href: '/terms', label: 'Terms' },
      ],
    },
  ];
  const footerSocialLinks: FooterLink[] = [
    { href: storefrontSocialLinks.instagram, label: 'Instagram', external: true },
    { href: storefrontSocialLinks.tiktok, label: 'TikTok', external: true },
    { href: storefrontSocialLinks.youtube, label: 'YouTube', external: true },
  ];
  const mobileFooterGroups: FooterLinkGroup[] = [
    ...footerLinkGroups,
    {
      title: 'Socials',
      links: footerSocialLinks,
    },
  ];
  const desktopFooterGroups: FooterLinkGroup[] = [
    { title: 'Collections', links: footerLinkGroups[0].links },
    {
      title: 'Information',
      links: [
        { href: '/about', label: 'Our Story' },
        { href: '/support', label: 'Contact Us' },
        { href: '/faqs', label: 'FAQs' },
        { href: '/shipping', label: 'Shipping' },
        { href: '/returns', label: 'Returns' },
        { href: '/privacy', label: 'Privacy Policy' },
        { href: '/terms', label: 'Terms of Service' },
      ],
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

      saveNewsletterDiscountCode(discountCode);
      setNewsletterStatus('success');
      setNewsletterMessage(
        data.email?.sent
          ? `You are on the list. Your ${discountCode} code is in your inbox.`
          : `You are on the list. Your code is ${discountCode}.`,
      );
      trackStorefrontEvent('generate_lead');
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
      <FooterBenefits />
      <FooterReveal>
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="footer-logo" href="/" aria-label="Armoze home">
            <span className="footer-mobile-only">Armoze</span>
            <span className="brand-mark footer-desktop-only" aria-hidden="true" />
          </Link>
          <p>Motivational canvas prints made for focused rooms, ambitious routines, and better everyday walls.</p>
          <p className="footer-legal-name">Armoze is operated by ARMOZE LLC.</p>
          <p className="footer-copyright">&copy; 2026 ARMOZE LLC. All rights reserved.</p>
        </div>

        <nav className="footer-link-columns" aria-label="Footer navigation">
          {desktopFooterGroups.map((group) => (
            <section className="footer-link-column" key={group.title}>
              <h2>{group.title}</h2>
              {group.links.map((link) => (
                <Link href={link.href} key={`${group.title}-${link.href}`}>
                  {link.label}
                </Link>
              ))}
            </section>
          ))}
          <a className="footer-contact-email" href={supportMailto}>{supportEmail}</a>
        </nav>

        <section className="footer-newsletter" aria-label="Newsletter signup">
          <p className="footer-newsletter-kicker">Newsletter</p>
          <h2 id="footer-newsletter-title">
            <span className="footer-mobile-only">Sign up to receive 15% off your first order</span>
            <span className="footer-desktop-only">Stay in the loop with our newsletter</span>
          </h2>
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
                placeholder="Email address"
                autoComplete="email"
                required
              />
              <button type="submit" disabled={newsletterStatus === 'loading'} aria-label="Sign up for the newsletter">
                <span className="footer-mobile-only">{newsletterStatus === 'loading' ? 'Subscribing' : 'Subscribe'}</span>
                <ArrowRight className="footer-desktop-only" aria-hidden="true" size={20} strokeWidth={1.8} />
              </button>
            </div>
            <small className="newsletter-consent">
              Occasional studio updates and new drops. Unsubscribe anytime.{' '}
              <Link href="/privacy">Privacy Policy</Link>.
            </small>
            <p className={`newsletter-message ${newsletterStatus}`} aria-live="polite">
              {newsletterMessage}
            </p>
          </form>
          <div className="footer-social-icons" aria-label="Follow Armoze">
            <a href={storefrontSocialLinks.instagram} target="_blank" rel="noreferrer" aria-label="Armoze on Instagram"><InstagramIcon size={22} /></a>
            <a href={storefrontSocialLinks.tiktok} target="_blank" rel="noreferrer" aria-label="Armoze on TikTok"><TikTokIcon size={20} /></a>
            <a href={storefrontSocialLinks.youtube} target="_blank" rel="noreferrer" aria-label="Armoze on YouTube"><YouTubeIcon size={23} /></a>
          </div>
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
        <p className="footer-bottom-copy">&copy; 2026 ARMOZE LLC.</p>
        <ul className="footer-payment-badges" aria-label="Accepted payment methods">
          {footerPaymentMethods.map(({ id, label, Icon }) => (
            <li key={id}>
              <Icon
                className={`footer-payment-icon footer-payment-icon-${id}`}
                aria-hidden="true"
                focusable="false"
              />
              <span className="sr-only">{label}</span>
            </li>
          ))}
        </ul>
        <div className="footer-market-selectors" aria-label="Store settings">
          <span className="footer-market-pill"><Globe className="footer-desktop-only" aria-hidden="true" size={16} />United States (USD $)</span>
          <span className="footer-market-pill"><Globe className="footer-desktop-only" aria-hidden="true" size={16} />English</span>
        </div>
      </div>
      </FooterReveal>
    </footer>
  );
}
