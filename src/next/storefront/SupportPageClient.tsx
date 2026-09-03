'use client';

import './support-page.css';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { ImagePlus, Send, X } from 'lucide-react';
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
          <h1>Contact Us</h1>
          <p>
            We’d love to hear from you. Our team is here to help.<br />
            Send a message below. We usually reply within 1 business day.
          </p>
          <div className="support-quick-links">
            <Link href="/order-status">Track an order</Link>
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </div>
        </section>

        <section className="support-request-section" id="support-request" aria-labelledby="support-request-title">
          <h2 id="support-request-title" className="sr-only">Send a request</h2>
          <form className="support-request-form" onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="support-form-grid">
              <label>
                <span className="sr-only">Name</span>
                <input name="name" type="text" placeholder="Name" autoComplete="name" minLength={2} maxLength={80} required />
              </label>
              <label>
                <span className="sr-only">Email address</span>
                <input name="email" type="email" placeholder="Email" autoComplete="email" maxLength={160} required />
              </label>
              <label>
                <span className="sr-only">Order number (optional)</span>
                <input name="orderNumber" type="text" autoComplete="off" maxLength={100} placeholder="Order number (optional)" />
              </label>
              <label>
                <span className="sr-only">Subject</span>
                <select name="topic" defaultValue="" required>
                  <option value="" disabled>Subject</option>
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
              <span className="sr-only">Message</span>
              <textarea
                name="message"
                rows={5}
                minLength={10}
                maxLength={3000}
                placeholder="Message"
                required
              />
            </label>

            <div className="support-form-actions">
              <button className="button button-primary" type="submit" disabled={submitState === 'sending'}>
                <Send aria-hidden="true" size={17} />
                {submitState === 'sending' ? 'Sending Request' : 'Send Request'}
              </button>
              <button
                className="support-photo-button"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-describedby="support-photo-guidance"
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

            <p className="support-photo-guidance" id="support-photo-guidance">
              Optional photos: up to 3 JPG, PNG, WEBP, HEIC, or HEIF files. 3 MB each, 3.5 MB total.
            </p>

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

            <p className="support-privacy-note">
              Your details are used only to review and resolve your request.
            </p>

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

        <nav className="support-policy-links" aria-label="Support policies">
          <Link href="/shipping">Shipping policy</Link>
          <Link href="/returns">Returns &amp; refunds</Link>
        </nav>
      </main>
    </StorefrontShell>
  );
}
