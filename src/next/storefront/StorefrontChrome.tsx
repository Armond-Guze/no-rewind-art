'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { ArrowRight, CircleUserRound, Menu, X } from 'lucide-react';
import {
  cartUpdatedEvent,
  getStoredCartCount,
} from '../../cart';
import { supabaseClient } from '../../lib/supabase';
import {
  launchOfferDiscount,
  launchOfferCode,
  supportEmail,
  supportMailto,
} from './product-utils';
import { initStorefrontTracking, trackStorefrontEvent } from './analytics';

export function StorefrontTracker({
  eventName,
  payload,
}: {
  eventName?: string;
  payload?: Record<string, unknown>;
}) {
  const pathname = usePathname();

  useEffect(() => {
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

export function StorefrontShell({ children }: { children: ReactNode }) {
  return (
    <>
      <NextSiteHeader />
      <LaunchPromoBar />
      {children}
      <NextSiteFooter />
    </>
  );
}

function LaunchPromoBar() {
  return (
    <section className="launch-promo-bar" aria-label="Launch offer">
      <p>
        Enjoy {launchOfferDiscount} off with code <strong>{launchOfferCode}</strong>
      </p>
    </section>
  );
}

function NextSiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const closeMenu = () => setMenuOpen(false);
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
    document.body.classList.toggle('mobile-menu-lock', menuOpen);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.classList.remove('mobile-menu-lock');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className={`site-header${isHome ? ' home-header' : ''}${menuOpen ? ' menu-open' : ''}`}>
      <Link className="brand" href="/" aria-label="Armoze home">
        <img className="brand-mark" src="/armoze-site-logo.png" alt="" aria-hidden="true" />
      </Link>
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-controls="primary-navigation"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
      </button>
      <Link
        className={`mobile-account-nav-link${user ? ' signed-in' : ''}`}
        href={accountHref}
        aria-label={accountLabel}
        title={accountLabel}
        onClick={closeMenu}
      >
        <CircleUserRound aria-hidden="true" size={22} />
        <span className="sr-only">{accountLabel}</span>
      </Link>
      <button
        className={`mobile-menu-backdrop${menuOpen ? ' open' : ''}`}
        type="button"
        aria-label="Close navigation menu"
        onClick={closeMenu}
      />
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
        <Link href="/cart" onClick={closeMenu}>Cart ({cartCount})</Link>
        <Link
          className={`account-nav-link desktop-account-nav-link${user ? ' signed-in' : ''}`}
          href={accountHref}
          aria-label={accountLabel}
          title={accountLabel}
          onClick={closeMenu}
        >
          <CircleUserRound aria-hidden="true" size={22} />
          <span className="sr-only">{accountLabel}</span>
        </Link>
      </nav>
    </header>
  );
}

function NextSiteFooter() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('New drops, restocks, and studio updates. No spam.');
  const footerLinkGroups = [
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
        { href: '/support', label: 'Support' },
        { href: '/account', label: 'Account' },
        { href: '/sign-in', label: 'Profile' },
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
        body: JSON.stringify({ email: newsletterEmail }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Newsletter signup failed.');
      }

      setNewsletterStatus('success');
      setNewsletterMessage('You are on the list. First looks will land in your inbox.');
      trackStorefrontEvent('sign_up');
      setNewsletterEmail('');
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
          <p className="footer-copyright">2026 Armoze. Secure checkout by Stripe.</p>
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
            <a href="https://www.instagram.com/itsarmoze" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            <a href="https://www.tiktok.com/@itsarmoze" target="_blank" rel="noopener noreferrer">
              TikTok
            </a>
            <a href="https://www.youtube.com/@itsarmoze" target="_blank" rel="noopener noreferrer">
              YouTube
            </a>
          </section>
        </nav>

        <section className="footer-newsletter" aria-label="Newsletter signup">
          <h2>Straight to Your Space</h2>
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
      </div>

      <details className="footer-policy-menu">
        <summary>Policies &amp; Support</summary>
        <nav aria-label="Footer policies">
          <Link href="/support">Customer Support</Link>
          <a href={supportMailto}>Email: {supportEmail}</a>
          <Link href="/account">Order History</Link>
          <Link href="/shipping">Shipping Policy</Link>
          <Link href="/terms">Terms and Conditions</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/returns">Refund Policy</Link>
        </nav>
      </details>

      <div className="footer-bottom">
        <div className="footer-market-selectors" aria-label="Store settings">
          <span className="footer-market-pill">United States (USD $)</span>
          <span className="footer-market-pill">English</span>
        </div>
      </div>
    </footer>
  );
}
