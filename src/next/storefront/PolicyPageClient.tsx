'use client';

import type { PolicyPageContent } from './policy-content';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';

function PolicyParagraph({ paragraph }: { paragraph: PolicyPageContent['sections'][number]['body'][number] }) {
  if (typeof paragraph === 'string') {
    return <p>{paragraph}</p>;
  }

  return (
    <p>
      {paragraph.text}{' '}
      {paragraph.links?.map((link, index) => (
        <span key={link.href}>
          {index > 0 ? ' | ' : ''}
          <a href={link.href}>{link.label}</a>
        </span>
      ))}
    </p>
  );
}

export default function PolicyPageClient({ page }: { page: PolicyPageContent }) {
  return (
    <StorefrontShell>
      <StorefrontTracker />
      <main className="policy-page">
        <section className="policy-hero">
          <p className="eyebrow">Store policy</p>
          <h1>{page.title}</h1>
          {!page.hideDescription && <p>{page.description}</p>}
          <span>Last updated: {page.updated}</span>
        </section>

        <section className="policy-content" aria-label={page.title}>
          {page.sections.map((section) => (
            <article className="policy-section" key={section.title}>
              <h2>{section.title}</h2>
              <div>
                {section.body.map((paragraph, index) => (
                  <PolicyParagraph
                    key={typeof paragraph === 'string' ? paragraph : `${section.title}-${index}`}
                    paragraph={paragraph}
                  />
                ))}
              </div>
            </article>
          ))}
        </section>
      </main>
    </StorefrontShell>
  );
}
