'use client';

import type { PolicyPageContent } from './policy-content';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';

export default function PolicyPageClient({ page }: { page: PolicyPageContent }) {
  return (
    <StorefrontShell>
      <StorefrontTracker />
      <main className="policy-page">
        <section className="policy-hero">
          <p className="eyebrow">Store policy</p>
          <h1>{page.title}</h1>
          <p>{page.description}</p>
          <span>Last updated: {page.updated}</span>
        </section>

        <section className="policy-content" aria-label={page.title}>
          {page.sections.map((section) => (
            <article className="policy-section" key={section.title}>
              <h2>{section.title}</h2>
              <div>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </section>
      </main>
    </StorefrontShell>
  );
}
