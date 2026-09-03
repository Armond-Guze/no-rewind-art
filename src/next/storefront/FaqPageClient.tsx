'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { faqGroups } from './faq-content';
import FaqContactForm from './FaqContactForm';
import { supportEmail } from './product-utils';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';
import './faq-page.css';

export default function FaqPageClient() {
  const [expanded, setExpanded] = useState<Record<string, string | null>>({});

  return (
    <StorefrontShell>
      <StorefrontTracker />
      <main className="faq-page">
        <div className="faq-page-inner">
          <header className="faq-hero">
            <h1>FAQs</h1>
            <p>A little help, all in one place.<br />Find answers about your order, shipping, returns, and our canvas prints.</p>
          </header>
          <div className="faq-layout">
            <div className="faq-groups">
              {faqGroups.map((group) => (
                <section className="faq-group" id={group.id} key={group.id} aria-labelledby={`${group.id}-title`}>
                  <h2 id={`${group.id}-title`}>{group.title}</h2>
                  <p className="faq-group-description">{group.description}</p>
                  <div className="faq-questions">
                    {group.questions.map((item) => {
                      const isOpen = expanded[group.id] === item.id;
                      return (
                        <div className={`faq-item${isOpen ? ' is-open' : ''}`} key={item.id}>
                          <h3><button id={`faq-question-${item.id}`} type="button" aria-expanded={isOpen} aria-controls={`faq-answer-${item.id}`} onClick={() => setExpanded((current) => ({ ...current, [group.id]: isOpen ? null : item.id }))}><span>{item.question}</span><Plus size={18} strokeWidth={1.5} aria-hidden="true" /></button></h3>
                          <div className="faq-answer" id={`faq-answer-${item.id}`} role="region" aria-labelledby={`faq-question-${item.id}`} aria-hidden={!isOpen} inert={!isOpen}>
                            <div><div className="faq-answer-inner"><p>{item.answer}</p>{'link' in item && item.link ? <Link href={item.link.href}>{item.link.label}</Link> : null}</div></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            <aside className="faq-contact" aria-labelledby="faq-contact-title">
              <h2 id="faq-contact-title">Didn’t find your answer?</h2>
              <p>We’re here to help. Send us a message.</p>
              <FaqContactForm />
              <div className="faq-contact-links">
                <Link href="/order-status">Track an order</Link>
                <Link href="/support#support-request">Need to add photos? Start a request</Link>
                <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
              </div>
              <p className="faq-reply-time">Usually a reply within 1 business day, Monday–Friday.</p>
            </aside>
          </div>
        </div>
      </main>
    </StorefrontShell>
  );
}
