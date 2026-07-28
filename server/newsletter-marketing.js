import { Resend } from 'resend';

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getMarketingConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY || '',
    segmentId: process.env.RESEND_SEGMENT_ID || '',
    from:
      process.env.NEWSLETTER_CAMPAIGN_FROM ||
      process.env.NEWSLETTER_DISCOUNT_FROM ||
      process.env.CUSTOMER_EMAIL_FROM ||
      'Armoze <hello@armoze.com>',
    replyTo: process.env.NEWSLETTER_REPLY_TO || 'hello@armoze.com',
    siteUrl: process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || 'https://armoze.com',
  };
}

function getConfigurationStatus() {
  const config = getMarketingConfig();

  return {
    configured: Boolean(config.apiKey && config.segmentId),
    resendConfigured: Boolean(config.apiKey),
    segmentConfigured: Boolean(config.segmentId),
    from: config.from,
    replyTo: config.replyTo,
  };
}

function resendErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function paragraphsToHtml(value) {
  return String(value || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 18px;color:#242424;font-size:16px;line-height:1.7;">${escapeHtml(paragraph).replaceAll('\n', '<br>')}</p>`,
    )
    .join('');
}

function renderNewsletterHtml({
  previewText,
  headline,
  body,
  ctaLabel,
  ctaUrl,
  imageUrl,
  siteUrl,
}) {
  const wordmarkUrl = `${siteUrl.replace(/\/$/, '')}/armoze-wordmark.png`;
  const imageBlock = imageUrl
    ? `
      <tr>
        <td style="padding:0;">
          <img src="${escapeHtml(imageUrl)}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
        </td>
      </tr>
    `
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(headline)}</title>
  </head>
  <body style="margin:0;padding:0;background:#ece8df;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(previewText)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#ece8df;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;">
            <tr>
              <td align="center" style="padding:30px 24px;background:#080808;border-bottom:3px solid #d7a536;">
                <a href="${escapeHtml(siteUrl)}" style="text-decoration:none;">
                  <img src="${escapeHtml(wordmarkUrl)}" width="220" alt="Armoze" style="display:block;width:220px;max-width:80%;height:auto;border:0;">
                </a>
              </td>
            </tr>
            ${imageBlock}
            <tr>
              <td style="padding:42px 40px 34px;">
                <p style="margin:0 0 12px;color:#9a6b08;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">From the Armoze studio</p>
                <h1 style="margin:0 0 20px;color:#111111;font-family:Arial,sans-serif;font-size:34px;line-height:1.08;">${escapeHtml(headline)}</h1>
                ${paragraphsToHtml(body)}
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
                  <tr>
                    <td style="background:#111111;">
                      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:15px 24px;color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:.5px;text-decoration:none;">${escapeHtml(ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px;background:#111111;color:#bdb9b0;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;">
                <p style="margin:0 0 8px;">Armoze — art for the life you are building.</p>
                <p style="margin:0;">You joined the Armoze newsletter. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#ffffff;text-decoration:underline;">Unsubscribe</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function getNewsletterMarketingStatus() {
  return getConfigurationStatus();
}

export async function syncNewsletterContact(email) {
  const config = getMarketingConfig();

  if (!config.apiKey || !config.segmentId) {
    return {
      synced: false,
      skipped: true,
      reason: 'Set RESEND_API_KEY and RESEND_SEGMENT_ID to sync newsletter contacts.',
    };
  }

  const resend = new Resend(config.apiKey);
  const existing = await resend.contacts.get({ email });

  if (existing.data) {
    const update = await resend.contacts.update({
      email,
      unsubscribed: false,
    });

    if (update.error) {
      return {
        synced: false,
        skipped: false,
        reason: resendErrorMessage(update.error, 'Resend could not update the contact.'),
      };
    }

    const segment = await resend.contacts.segments.add({
      email,
      segmentId: config.segmentId,
    });

    if (segment.error) {
      return {
        synced: false,
        skipped: false,
        reason: resendErrorMessage(segment.error, 'Resend could not add the contact to the segment.'),
      };
    }

    return { synced: true, skipped: false, contactId: existing.data.id };
  }

  if (existing.error && Number(existing.error.statusCode || 0) !== 404) {
    return {
      synced: false,
      skipped: false,
      reason: resendErrorMessage(existing.error, 'Resend could not check the contact.'),
    };
  }

  const created = await resend.contacts.create({
    email,
    unsubscribed: false,
    segments: [{ id: config.segmentId }],
  });

  if (created.error) {
    return {
      synced: false,
      skipped: false,
      reason: resendErrorMessage(created.error, 'Resend could not create the contact.'),
    };
  }

  return {
    synced: true,
    skipped: false,
    contactId: created.data?.id || null,
  };
}

export async function listNewsletterBroadcasts() {
  const config = getMarketingConfig();

  if (!config.apiKey) {
    return [];
  }

  const resend = new Resend(config.apiKey);
  const result = await resend.broadcasts.list({ limit: 10 });

  if (result.error) {
    throw new Error(resendErrorMessage(result.error, 'Resend broadcasts could not be loaded.'));
  }

  return (result.data?.data || []).map((broadcast) => ({
    id: broadcast.id,
    name: broadcast.name || 'Untitled newsletter',
    status: broadcast.status,
    createdAt: broadcast.created_at,
    scheduledAt: broadcast.scheduled_at,
    sentAt: broadcast.sent_at,
  }));
}

export async function createNewsletterBroadcastDraft({
  subject,
  previewText,
  headline,
  body,
  ctaLabel,
  ctaUrl,
  imageUrl = '',
}) {
  const config = getMarketingConfig();

  if (!config.apiKey || !config.segmentId) {
    throw new Error('Newsletter drafts need RESEND_API_KEY and RESEND_SEGMENT_ID.');
  }

  const resend = new Resend(config.apiKey);
  const text = [
    headline,
    '',
    body,
    '',
    `${ctaLabel}: ${ctaUrl}`,
    '',
    'You joined the Armoze newsletter.',
    'Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}',
  ].join('\n');
  const result = await resend.broadcasts.create({
    segmentId: config.segmentId,
    from: config.from,
    replyTo: config.replyTo,
    name: `Armoze — ${subject}`.slice(0, 150),
    subject,
    previewText,
    html: renderNewsletterHtml({
      previewText,
      headline,
      body,
      ctaLabel,
      ctaUrl,
      imageUrl,
      siteUrl: config.siteUrl,
    }),
    text,
    send: false,
  });

  if (result.error) {
    throw new Error(resendErrorMessage(result.error, 'Resend could not create the newsletter draft.'));
  }

  return {
    id: result.data?.id || null,
    status: 'draft',
  };
}
