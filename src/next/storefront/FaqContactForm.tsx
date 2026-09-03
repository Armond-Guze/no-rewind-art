'use client';

import { useState, type FormEvent } from 'react';
import './faq-contact-form.css';

export default function FaqContactForm({ topic = 'Other' }: { topic?: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;
    const form = event.currentTarget;
    setStatus('sending');
    setMessage('');
    try {
      const response = await fetch('/api/support', { method: 'POST', body: new FormData(form) });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || 'Your message could not be sent. Please try again.');
      form.reset();
      setStatus('success');
      setMessage('Your message was sent. We usually reply by email within 1 business day.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Your message could not be sent. Please try again.');
    }
  }

  return (
    <form className="faq-contact-form" onSubmit={handleSubmit} encType="multipart/form-data">
      <label><span className="sr-only">Name</span><input name="name" placeholder="Name" autoComplete="name" minLength={2} maxLength={80} required /></label>
      <label><span className="sr-only">Email</span><input name="email" type="email" placeholder="Email" autoComplete="email" maxLength={160} required /></label>
      <label><span className="sr-only">Message</span><textarea name="message" placeholder="Message" rows={5} minLength={10} maxLength={3000} required /></label>
      <input type="hidden" name="topic" value={topic} />
      <label className="faq-honeypot" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
      <button className="faq-send" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send message'}</button>
      {message ? <p className={`faq-form-message ${status}`} role={status === 'error' ? 'alert' : 'status'}>{message}</p> : null}
    </form>
  );
}
