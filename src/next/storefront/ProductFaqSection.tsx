'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import FaqContactForm from './FaqContactForm';
import { faqGroups } from './faq-content';
import './product-faq.css';

const productQuestions = ['sizes', 'ready-to-hang', 'made-to-order', 'returns', 'damaged']
  .map((id) => faqGroups.flatMap((group) => group.questions).find((item) => item.id === id))
  .filter((item) => item !== undefined);

export default function ProductFaqSection() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="product-faq" id="product-faqs" aria-labelledby="product-faq-title">
      <div className="product-faq-main">
        <header className="product-faq-heading">
          <h2 id="product-faq-title">FAQs</h2>
          <p>Please read our <Link href="/faqs">FAQs</Link> page to find out more.</p>
        </header>
        <div className="product-faq-questions">
          {productQuestions.map((item) => {
            const isOpen = expanded === item.id;
            return (
              <div className={`product-faq-item${isOpen ? ' is-open' : ''}`} key={item.id}>
                <h3>
                  <button id={`product-faq-question-${item.id}`} type="button" aria-expanded={isOpen} aria-controls={`product-faq-answer-${item.id}`} onClick={() => setExpanded(isOpen ? null : item.id)}>
                    <span>{item.question}</span><Plus size={18} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </h3>
                <div className="product-faq-answer" id={`product-faq-answer-${item.id}`} role="region" aria-labelledby={`product-faq-question-${item.id}`} aria-hidden={!isOpen} inert={!isOpen}>
                  <div><div className="product-faq-answer-inner">
                    <p>{item.answer}</p>
                    {'link' in item && item.link ? <Link href={item.link.href}>{item.link.label}</Link> : null}
                  </div></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <aside className="product-faq-contact" aria-labelledby="product-faq-contact-title">
        <h3 id="product-faq-contact-title">Didn’t find your<br />answer?</h3>
        <p>Don’t hesitate to contact us.</p>
        <FaqContactForm topic="Product question" />
      </aside>
    </section>
  );
}
