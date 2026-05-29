'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Box, Inbox, LogOut, ShieldCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabaseClient } from '../../lib/supabase';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';

export default function AccountPageClient() {
  const [session, setSession] = useState<Session | null>(null);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabaseClient) {
      queueMicrotask(() => {
        setConfigured(false);
        setLoading(false);
      });
      return;
    }

    let active = true;

    void supabaseClient.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setConfigured(true);
          setSession(data.session);
        }
      })
      .catch(() => {
        if (active) {
          setConfigured(true);
          setSession(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    if (!supabaseClient) {
      return;
    }

    setError('');

    const { error: signOutError } = await supabaseClient.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
    }
  }

  return (
    <StorefrontShell>
      <StorefrontTracker />
      <main className="account-page">
        <section className="account-hero">
          <p className="eyebrow">Customer account</p>
          <h1>Your account</h1>
          <p>Manage your Armoze sign-in, saved session, and support details.</p>
        </section>

        <section className="account-shell">
          <div className="account-benefits" aria-label="Account benefits">
            <article>
              <Inbox aria-hidden="true" size={24} />
              <h2>Order updates</h2>
              <p>Use the same email at checkout and sign-in so support can find your order history faster.</p>
            </article>
            <article>
              <Box aria-hidden="true" size={24} />
              <h2>Made to order</h2>
              <p>Your prints are produced after checkout, then packed for safe delivery.</p>
            </article>
            <article>
              <ShieldCheck aria-hidden="true" size={24} />
              <h2>Secure access</h2>
              <p>Account access is handled through Supabase Auth with persistent browser sessions.</p>
            </article>
          </div>

          <aside className="account-panel" aria-label="Account status">
            {loading ? (
              <div className="account-state">
                <ShieldCheck aria-hidden="true" size={32} />
                <h2>Checking session</h2>
                <p>Looking for an active Armoze account session in this browser.</p>
              </div>
            ) : !configured ? (
              <div className="account-state">
                <ShieldCheck aria-hidden="true" size={32} />
                <h2>Accounts are almost ready</h2>
                <p>Supabase public auth settings still need to be configured before customer accounts can open.</p>
                <Link className="button button-secondary" href="/collections/best-sellers">
                  Browse Prints
                </Link>
              </div>
            ) : session?.user ? (
              <div className="account-state signed-in-account">
                <BadgeCheck aria-hidden="true" size={32} />
                <h2>Signed in</h2>
                <p>{session.user.email}</p>
                <button className="button button-primary" type="button" onClick={() => void signOut()}>
                  <LogOut aria-hidden="true" size={17} />
                  Sign Out
                </button>
                {error ? <p className="account-error">{error}</p> : null}
              </div>
            ) : (
              <div className="account-state">
                <ShieldCheck aria-hidden="true" size={32} />
                <h2>Sign in to continue</h2>
                <p>Open your Armoze account to keep your email and support flow connected.</p>
                <Link className="button button-primary" href="/sign-in">
                  Sign In
                </Link>
              </div>
            )}
          </aside>
        </section>
      </main>
    </StorefrontShell>
  );
}
