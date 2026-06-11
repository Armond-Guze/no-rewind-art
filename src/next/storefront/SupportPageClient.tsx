'use client';

import Link from 'next/link';
import { Clock, Mail, PackageCheck, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { supportEmail, supportMailto } from './product-utils';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';

const supportCards = [
  {
    title: 'Email support',
    body: `Reach Armoze at ${supportEmail}. Email is the official support channel and preferred contact method.`,
    icon: Mail,
  },
  {
    title: 'Response time',
    body: 'Most support emails receive a reply within 1 business day, Monday through Friday.',
    icon: Clock,
  },
  {
    title: 'Order lookup',
    body: 'Use the same email from checkout when signing in so your paid orders and tracking details stay connected.',
    icon: PackageCheck,
  },
];

const helpTopics = [
  {
    title: 'Shipping and tracking',
    body: 'Canvas prints are produced in 2-3 business days, then standard U.S. shipping is typically 2-5 business days after production.',
    href: '/shipping',
    icon: Truck,
  },
  {
    title: 'Damage or wrong item',
    body: 'Email your order number, checkout email, photos of the item, and photos of the packaging within 7 days of delivery.',
    href: '/returns',
    icon: ShieldCheck,
  },
  {
    title: 'Returns and refunds',
    body: 'Returns are accepted within 30 days of delivery. Customers pay return shipping for non-defective returns; damaged, defective, or incorrect items are handled free of extra return cost when approved.',
    href: '/returns',
    icon: RotateCcw,
  },
];

export default function SupportPageClient() {
  return (
    <StorefrontShell>
      <StorefrontTracker />
      <main className="support-page">
        <section className="support-hero">
          <p className="eyebrow">Customer support</p>
          <h1>Get help with your order.</h1>
          <p>
            Armoze support is handled by email so order details, photos, shipping updates,
            and replacement decisions stay in one clear thread.
          </p>
          <div className="support-hero-actions">
            <a className="button button-primary" href={supportMailto}>
              Email Support
            </a>
            <Link className="button button-secondary" href="/account">
              View Orders
            </Link>
          </div>
        </section>

        <section className="support-channel-grid" aria-label="Customer support channels">
          {supportCards.map((card) => {
            const Icon = card.icon;

            return (
              <article key={card.title}>
                <Icon aria-hidden="true" size={24} />
                <h2>{card.title}</h2>
                <p>{card.body}</p>
              </article>
            );
          })}
        </section>

        <section className="support-help-grid" aria-label="Common support topics">
          <div className="support-section-heading">
            <p className="eyebrow">Common help</p>
            <h2>What to send us.</h2>
          </div>
          <div className="support-topic-list">
            {helpTopics.map((topic) => {
              const Icon = topic.icon;

              return (
                <article key={topic.title}>
                  <Icon aria-hidden="true" size={22} />
                  <div>
                    <h3>{topic.title}</h3>
                    <p>{topic.body}</p>
                    <Link href={topic.href}>Read policy</Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="support-note" aria-label="Support availability">
          <h2>Support availability</h2>
          <p>
            Phone support and live chat are not currently offered. Email is the official
            support channel for Armoze orders, shipping questions, damaged items, returns,
            refunds, and account help.
          </p>
          <a href={supportMailto}>{supportEmail}</a>
        </section>
      </main>
    </StorefrontShell>
  );
}
