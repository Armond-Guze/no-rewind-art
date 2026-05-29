'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { CircleUserRound, Menu, X } from 'lucide-react';
import {
  cartUpdatedEvent,
  getStoredCartCount,
} from '../../cart';
import { supabaseClient } from '../../lib/supabase';
import {
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
      {children}
      <NextSiteFooter />
    </>
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
        <img className="brand-mark" src="/armoze-logo.png" alt="" aria-hidden="true" />
        <span>Armoze</span>
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
      <div className="footer-brand">
        <Link className="footer-logo" href="/" aria-label="Armoze home">
          <img className="brand-mark" src="/armoze-logo.png" alt="" aria-hidden="true" />
          <span>Armoze</span>
        </Link>
        <p>Motivational canvas prints for ambitious spaces.</p>
      </div>

      <nav className="footer-links" aria-label="Footer navigation">
        <Link href="/collections/best-sellers">Best Sellers</Link>
        <Link href="/collections/money-ambition">Money</Link>
        <Link href="/collections/discipline-focus">Focus</Link>
        <Link href="/collections/new-arrivals">New Arrivals</Link>
        <Link href="/#support">Support</Link>
        <Link href="/shipping">Shipping</Link>
        <Link href="/returns">Returns</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </nav>

      <section className="footer-support" aria-label="Customer support">
        <span>Support</span>
        <a href={supportMailto}>{supportEmail}</a>
      </section>

      <section className="footer-newsletter" aria-label="Newsletter signup">
        <div>
          <span>Newsletter</span>
          <h2>Get the next drop first.</h2>
        </div>
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
            <button type="submit" disabled={newsletterStatus === 'loading'}>
              {newsletterStatus === 'loading' ? 'Joining' : 'Sign Up'}
            </button>
          </div>
          <p className={`newsletter-message ${newsletterStatus}`}>{newsletterMessage}</p>
        </form>
      </section>

      <details className="footer-policy-menu">
        <summary>Policies &amp; Support</summary>
        <nav aria-label="Footer policies">
          <a href={supportMailto}>Support: {supportEmail}</a>
          <Link href="/terms">Terms and Conditions</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/returns">Refund Policy</Link>
        </nav>
      </details>

      <div className="footer-bottom">
        <span>2026 Armoze</span>
        <span>Made to order</span>
        <span>Secure checkout</span>
      </div>
    </footer>
  );
}
