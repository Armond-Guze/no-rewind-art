'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import './search-drawer.css';

const informationLinks = [
  { href: '/about', label: 'About' },
  { href: '/support', label: 'Contact' },
  { href: '/order-status', label: 'Track an Order' },
];

export function SearchDrawer({ open, onClose, categories }: {
  open: boolean;
  onClose: () => void;
  categories: { href: string; label: string }[];
}) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const drawer = drawerRef.current;
    // Keep the mobile keyboard closed until the customer taps the search field.
    const initialFocus = window.matchMedia('(min-width: 761px)').matches ? inputRef.current : drawer;
    initialFocus?.focus({ preventScroll: true });

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = Array.from(drawer?.querySelectorAll<HTMLElement>('a[href], button, input') ?? [])
        .filter((element) => element.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const focusInside = items.includes(document.activeElement as HTMLElement);
      if (event.shiftKey && (!focusInside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!focusInside || document.activeElement === last)) {
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
    <div className={`storefront-search-overlay${open ? ' is-open' : ''}`} inert={!open} aria-hidden={!open}>
      <div className="storefront-search-scrim" onClick={onClose} aria-hidden="true" />
      <div ref={drawerRef} className="storefront-search-drawer" id="storefront-search" role="dialog" aria-modal={open ? true : undefined} aria-labelledby="storefront-search-title" tabIndex={-1}>
        <button
          className="storefront-search-handle"
          type="button"
          aria-label="Close search"
          onClick={onClose}
          onTouchStart={(event) => { touchStartY.current = event.touches[0].clientY; }}
          onTouchEnd={(event) => {
            if (touchStartY.current !== null && event.changedTouches[0].clientY - touchStartY.current > 45) onClose();
            touchStartY.current = null;
          }}
        ><span /></button>
        <div className="storefront-search-heading">
          <h2 id="storefront-search-title">Search</h2>
          <button className="storefront-search-close" type="button" aria-label="Close search" onClick={onClose}><X size={20} strokeWidth={1.5} aria-hidden="true" /></button>
        </div>
        <div className="storefront-search-content">
          <form className="storefront-search-form" role="search" action="/collections/best-sellers" onSubmit={onClose}>
            <label className="sr-only" htmlFor="storefront-search-query">Search products</label>
            <input ref={inputRef} id="storefront-search-query" name="search" type="search" placeholder="Search for ..." autoComplete="off" enterKeyHint="search" />
            <button type="submit" aria-label="Submit search"><Search size={21} strokeWidth={1.6} aria-hidden="true" /></button>
          </form>
          <nav className="storefront-search-links" aria-label="Popular categories">
            <h3>Popular categories</h3>
            {categories.map(({ href, label }) => <Link key={href} href={href} onClick={onClose}>{label}</Link>)}
          </nav>
          <nav className="storefront-search-links" aria-label="Information">
            <h3>Info</h3>
            {informationLinks.map(({ href, label }) => <Link key={href} href={href} onClick={onClose}>{label}</Link>)}
          </nav>
        </div>
      </div>
    </div>
  );
}
