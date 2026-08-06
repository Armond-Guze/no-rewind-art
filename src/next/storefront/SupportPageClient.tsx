'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Clock,
  ImagePlus,
  Mail,
  PackageCheck,
  RotateCcw,
  Send,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { supportEmail } from './product-utils';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';

const maxPhotos = 3;
const maxPhotoBytes = 3 * 1024 * 1024;
const maxTotalPhotoBytes = 3.5 * 1024 * 1024;
const allowedPhotoTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

type SupportPhoto = {
  file: File;
  previewUrl: string;
};

type SubmitState = 'idle' | 'sending' | 'success' | 'error';

const supportCards = [
  {
    title: 'One clear request',
    body: 'Send the order details and photos together so support can review everything without extra back-and-forth.',
    icon: Mail,
  },
  {
    title: 'Response time',
    body: 'Most requests receive a reply within 1 business day, Monday through Friday.',
    icon: Clock,
  },
  {
    title: 'Order lookup',
    body: 'Use the email from checkout and include your order number when you have it.',
    icon: PackageCheck,
  },
];

const helpTopics = [
  {
    title: 'Shipping and tracking',
    body: 'Most orders are expected to arrive in 5–8 business days.',
    href: '/shipping',
    icon: Truck,
  },
  {
    title: 'Damage or wrong item',
    body: 'Send your order number, checkout email, photos of the item, and photos of the packaging within 7 days of delivery.',
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

function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SupportPageClient() {
  const [photos, setPhotos] = useState<SupportPhoto[]>([]);
  const [photoError, setPhotoError] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef(new Set<string>());

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;

    return () => {
      previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, []);

  function removePhoto(photoToRemove: SupportPhoto) {
    URL.revokeObjectURL(photoToRemove.previewUrl);
    previewUrlsRef.current.delete(photoToRemove.previewUrl);
    setPhotos((currentPhotos) =>
      currentPhotos.filter((photo) => photo.previewUrl !== photoToRemove.previewUrl),
    );
    setPhotoError('');
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';

    if (!selectedFiles.length) {
      return;
    }

    if (photos.length + selectedFiles.length > maxPhotos) {
      setPhotoError(`Choose up to ${maxPhotos} photos.`);
      return;
    }

    const invalidType = selectedFiles.find((file) => !allowedPhotoTypes.has(file.type));

    if (invalidType) {
      setPhotoError('Photos must be JPG, PNG, WEBP, HEIC, or HEIF files.');
      return;
    }

    const oversizedFile = selectedFiles.find((file) => file.size > maxPhotoBytes);

    if (oversizedFile) {
      setPhotoError(`${oversizedFile.name} is over the 3 MB per-photo limit.`);
      return;
    }

    const totalBytes = [...photos.map((photo) => photo.file), ...selectedFiles].reduce(
      (total, file) => total + file.size,
      0,
    );

    if (totalBytes > maxTotalPhotoBytes) {
      setPhotoError('Keep the combined photo size under 3.5 MB.');
      return;
    }

    const nextPhotos = selectedFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);
      return { file, previewUrl };
    });

    setPhotos((currentPhotos) => [...currentPhotos, ...nextPhotos]);
    setPhotoError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState('sending');
    setSubmitMessage('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    photos.forEach((photo) => formData.append('photos', photo.file, photo.file.name));

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        body: formData,
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error || 'Your request could not be sent. Please try again.');
      }

      form.reset();
      photos.forEach((photo) => {
        URL.revokeObjectURL(photo.previewUrl);
        previewUrlsRef.current.delete(photo.previewUrl);
      });
      setPhotos([]);
      setPhotoError('');
      setSubmitState('success');
      setSubmitMessage('Your request was sent. Armoze will reply by email within 1 business day.');
    } catch (error) {
      setSubmitState('error');
      setSubmitMessage(
        error instanceof Error ? error.message : 'Your request could not be sent. Please try again.',
      );
    }
  }

  return (
    <StorefrontShell>
      <StorefrontTracker />
      <main className="support-page">
        <section className="support-hero">
          <p className="eyebrow">Customer support</p>
          <h1>We are here to help.</h1>
          <p>
            Tell us what happened, add your order details, and include photos when they help.
            Everything arrives together for a faster review.
          </p>
          <div className="support-hero-actions">
            <a className="button button-primary" href="#support-request">
              Start a Request
            </a>
            <Link className="button button-secondary" href="/account">
              View Orders
            </Link>
          </div>
        </section>

        <section className="support-request-section" id="support-request" aria-labelledby="support-request-title">
          <div className="support-request-intro">
            <p className="eyebrow">Send a request</p>
            <h2 id="support-request-title">Put every detail in one place.</h2>
            <p>
              For a damaged or incorrect item, include one photo of the full canvas, one close-up,
              and one photo of the shipping box when possible.
            </p>
            <div className="support-response-note">
              <Clock aria-hidden="true" size={19} />
              <span><strong>Typical reply:</strong> within 1 business day</span>
            </div>
          </div>

          <form className="support-request-form" onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="support-form-grid">
              <label>
                <span>Name</span>
                <input name="name" type="text" autoComplete="name" maxLength={80} required />
              </label>
              <label>
                <span>Email used at checkout</span>
                <input name="email" type="email" autoComplete="email" maxLength={160} required />
              </label>
              <label>
                <span>Order number <small>Optional</small></span>
                <input name="orderNumber" type="text" autoComplete="off" maxLength={100} placeholder="Order or checkout ID" />
              </label>
              <label>
                <span>What do you need help with?</span>
                <select name="topic" defaultValue="" required>
                  <option value="" disabled>Select a topic</option>
                  <option value="Order status or tracking">Order status or tracking</option>
                  <option value="Damaged item">Damaged item</option>
                  <option value="Wrong item">Wrong item</option>
                  <option value="Return or refund">Return or refund</option>
                  <option value="Product question">Product question</option>
                  <option value="Account help">Account help</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>

            <label className="support-message-field">
              <span>How can we help?</span>
              <textarea
                name="message"
                rows={6}
                minLength={10}
                maxLength={3000}
                placeholder="Describe the issue and the outcome you need."
                required
              />
            </label>

            <div className="support-photo-field">
              <div>
                <span>Photos <small>Optional</small></span>
                <p>Up to 3 photos. JPG, PNG, WEBP, HEIC, or HEIF. 3.5 MB combined.</p>
              </div>
              <button
                className="support-photo-button"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photos.length >= maxPhotos}
              >
                <ImagePlus aria-hidden="true" size={18} />
                Add Photos
              </button>
              <input
                ref={fileInputRef}
                className="support-photo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                multiple
                onChange={handlePhotoChange}
              />
            </div>

            {photos.length ? (
              <div className="support-photo-list" aria-label="Selected photos">
                {photos.map((photo) => (
                  <div className="support-photo-preview" key={photo.previewUrl}>
                    {/* Browser-generated object URLs do not benefit from image optimization. */}
                    <img src={photo.previewUrl} alt="" />
                    <div>
                      <strong>{photo.file.name}</strong>
                      <span>{formatFileSize(photo.file.size)}</span>
                    </div>
                    <button type="button" onClick={() => removePhoto(photo)} aria-label={`Remove ${photo.file.name}`}>
                      <X aria-hidden="true" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {photoError ? <p className="support-form-error" role="alert">{photoError}</p> : null}

            <label className="support-honeypot" aria-hidden="true">
              Company
              <input name="company" type="text" tabIndex={-1} autoComplete="off" />
            </label>

            <div className="support-form-footer">
              <p>
                By sending this request, you allow Armoze to use these details only to review
                and resolve your support case.
              </p>
              <button className="button button-primary" type="submit" disabled={submitState === 'sending'}>
                <Send aria-hidden="true" size={17} />
                {submitState === 'sending' ? 'Sending Request' : 'Send Request'}
              </button>
            </div>

            {submitMessage ? (
              <p
                className={`support-submit-message ${submitState}`}
                role={submitState === 'error' ? 'alert' : 'status'}
              >
                {submitMessage}
              </p>
            ) : null}
          </form>
        </section>

        <section className="support-channel-grid" aria-label="Customer support details">
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
            <h2>Before you send.</h2>
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
            Phone support and live chat are not currently offered. The form above is the official
            support channel for orders, shipping questions, damaged items, returns, refunds, and
            account help. You can also email us directly.
          </p>
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
        </section>
      </main>
    </StorefrontShell>
  );
}
