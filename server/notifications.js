import { Resend } from 'resend';

const legalBusinessName = 'ARMOZE LLC';
const customerSupportEmail = 'hello@armoze.com';

function formatPrice(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(Number(cents || 0) / 100);
}

function orderLines(order) {
  return order.items
    .map((item) => {
      const details = [item.sizeLabel, item.frameLabel].filter(Boolean).join(' / ');
      const quantity = Number(item.quantity || 1);
      const unitAmount = Number(item.unitAmount || (quantity ? item.lineTotal / quantity : item.lineTotal));

      return [
        item.title,
        details ? `Options: ${details}` : '',
        `Quantity: ${quantity}`,
        `Unit price: ${formatPrice(unitAmount, order.currency)}`,
        `Line total: ${formatPrice(item.lineTotal, order.currency)}`,
      ].filter(Boolean).join('\n');
    })
    .join('\n\n');
}

function orderItemsHtml(order) {
  return order.items
    .map((item) => {
      const details = [item.sizeLabel, item.frameLabel].filter(Boolean).join(' / ');
      const quantity = Number(item.quantity || 1);
      const unitAmount = Number(item.unitAmount || (quantity ? item.lineTotal / quantity : item.lineTotal));

      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #dedbd4; vertical-align: top;">
            <strong>${escapeHtml(item.title)}</strong>
            ${details ? `<br><span style="color:#666;font-size:13px;">${escapeHtml(details)}</span>` : ''}
            <br><span style="color:#666;font-size:13px;">${quantity} x ${escapeHtml(formatPrice(unitAmount, order.currency))}</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #dedbd4; text-align: right; vertical-align: top; white-space: nowrap;">
            ${escapeHtml(formatPrice(item.lineTotal, order.currency))}
          </td>
        </tr>
      `;
    })
    .join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendOwnerOrderNotification(order) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_NOTIFICATION_EMAIL;

  if (!apiKey || !to) {
    return {
      sent: false,
      skipped: true,
      reason: 'Set RESEND_API_KEY and ORDER_NOTIFICATION_EMAIL to enable email alerts.',
    };
  }

  const resend = new Resend(apiKey);
  const from = process.env.ORDER_NOTIFICATION_FROM || 'Armoze Orders <orders@resend.dev>';
  const subject = `New Armoze order: ${formatPrice(order.amountTotal, order.currency)}`;
  const lines = orderLines(order);
  const dashboardUrl = `${process.env.CLIENT_URL || 'http://127.0.0.1:5173'}/admin`;

  const text = [
    'A new paid Armoze order came in.',
    '',
    `Order: ${order.id}`,
    `Customer: ${order.customerName || 'Unknown'} <${order.customerEmail || 'no email'}>`,
    `Total: ${formatPrice(order.amountTotal, order.currency)}`,
    '',
    lines,
    '',
    `Dashboard: ${dashboardUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f1d1a; line-height: 1.5;">
      <h1 style="font-size: 22px;">New Armoze order</h1>
      <p><strong>Total:</strong> ${escapeHtml(formatPrice(order.amountTotal, order.currency))}</p>
      <p><strong>Customer:</strong> ${escapeHtml(order.customerName || 'Unknown')} &lt;${escapeHtml(order.customerEmail || 'no email')}&gt;</p>
      <p><strong>Order:</strong> ${escapeHtml(order.id)}</p>
      <h2 style="font-size: 16px;">Items</h2>
      <pre style="background: #f6f3ec; padding: 14px; white-space: pre-wrap;">${escapeHtml(lines)}</pre>
      <p><a href="${escapeHtml(dashboardUrl)}">Open the Armoze dashboard</a></p>
    </div>
  `;

  const result = await resend.emails.send({
    from,
    to,
    subject,
    text,
    html,
  });

  if (result.error) {
    return {
      sent: false,
      skipped: false,
      reason: result.error.message || 'Resend could not send the notification.',
      error: result.error,
    };
  }

  return {
    sent: true,
    skipped: false,
    id: result.data?.id || null,
  };
}

export async function sendOwnerOrderPush(order) {
  const token = process.env.PUSHOVER_APP_TOKEN;
  const user = process.env.PUSHOVER_USER_KEY;

  if (!token || !user) {
    return {
      sent: false,
      skipped: true,
      reason: 'Set PUSHOVER_APP_TOKEN and PUSHOVER_USER_KEY to enable push alerts.',
    };
  }

  const dashboardUrl = `${process.env.CLIENT_URL || 'http://127.0.0.1:5173'}/admin`;
  const itemLines = (order.items || []).flatMap((item, index) => {
    const frame = item.frameLabel === 'Canvas' ? 'Wrapped Canvas' : item.frameLabel;
    const lines = index > 0 ? [''] : [];
    lines.push(`<b>${item.quantity} × ${escapeHtml(item.title)}</b>`);
    if (item.sizeLabel) {
      lines.push(`Size: ${escapeHtml(item.sizeLabel)}`);
    }
    if (frame) {
      lines.push(`<b>${escapeHtml(frame)}</b>`);
    }
    return lines;
  });

  const response = await fetch('https://api.pushover.net/1/messages.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      user,
      html: 1,
      title: `Cha-ching! ${formatPrice(order.amountTotal, order.currency)}`,
      message: [...itemLines, escapeHtml(order.customerName || 'A customer')].join('\n'),
      sound: process.env.PUSHOVER_SOUND || 'cashregister',
      url: dashboardUrl,
      url_title: 'Open the Armoze dashboard',
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.status !== 1) {
    return {
      sent: false,
      skipped: false,
      reason: result?.errors?.join('; ') || `Pushover responded with status ${response.status}.`,
    };
  }

  return {
    sent: true,
    skipped: false,
    id: result.request || null,
  };
}

function getSiteUrl() {
  return process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || 'https://armoze.com';
}

function getCustomerEmailFrom() {
  return (
    process.env.CUSTOMER_EMAIL_FROM ||
    process.env.NEWSLETTER_DISCOUNT_FROM ||
    process.env.ORDER_NOTIFICATION_FROM ||
    'Armoze <orders@resend.dev>'
  );
}

function getCustomerFirstName(order) {
  const firstName = String(order.customerName || '').trim().split(/\s+/)[0] || '';
  return firstName || 'there';
}

function formatOrderDate(value) {
  const date = new Date(value || Date.now());

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  }).format(Number.isNaN(date.getTime()) ? new Date() : date);
}

function getOrderDiscountAmount(order) {
  const beforeDiscount =
    Number(order.amountSubtotal || 0) +
    Number(order.amountShipping || 0) +
    Number(order.amountTax || 0);

  return Math.max(0, beforeDiscount - Number(order.amountTotal || 0));
}

function orderTotalsLines(order) {
  const lines = [`Subtotal: ${formatPrice(order.amountSubtotal, order.currency)}`];
  const discountAmount = getOrderDiscountAmount(order);

  if (discountAmount > 0) {
    lines.push(`Discounts: -${formatPrice(discountAmount, order.currency)}`);
  }

  if (Number(order.amountShipping || 0) > 0) {
    lines.push(`Shipping: ${formatPrice(order.amountShipping, order.currency)}`);
  } else {
    lines.push('Shipping: Free');
  }

  lines.push(`Tax: ${formatPrice(order.amountTax, order.currency)}`);

  lines.push(`Total (${String(order.currency || 'usd').toUpperCase()}): ${formatPrice(order.amountTotal, order.currency)}`);

  return lines.join('\n');
}

async function sendWithResend({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      sent: false,
      skipped: true,
      reason: 'Set RESEND_API_KEY to enable customer emails.',
    };
  }

  if (!to) {
    return {
      sent: false,
      skipped: true,
      reason: 'Order has no customer email address.',
    };
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: getCustomerEmailFrom(),
    to,
    replyTo: process.env.CUSTOMER_EMAIL_REPLY_TO || process.env.NEWSLETTER_REPLY_TO || customerSupportEmail,
    subject,
    text,
    html,
  });

  if (result.error) {
    return {
      sent: false,
      skipped: false,
      reason: result.error.message || 'Resend could not send the email.',
      error: result.error,
    };
  }

  return {
    sent: true,
    skipped: false,
    id: result.data?.id || null,
  };
}

export async function sendCustomerOrderConfirmationEmail(order) {
  const siteUrl = getSiteUrl();
  const firstName = getCustomerFirstName(order);
  const lines = orderLines(order);
  const totals = orderTotalsLines(order);
  const itemsHtml = orderItemsHtml(order);
  const orderDate = formatOrderDate(order.createdAt);
  const paymentStatus = order.paymentStatus === 'paid' ? 'Paid' : String(order.paymentStatus || 'Confirmed');
  const transactionReference = order.paymentIntentId || '';
  const subject = 'Receipt and order confirmation - Armoze';

  const orderStatusUrl = `${siteUrl}/order-status?order=${encodeURIComponent(order.id)}`;
  const policyLinks = {
    shipping: `${siteUrl}/shipping`,
    returns: `${siteUrl}/returns`,
    support: `${siteUrl}/support`,
  };

  const text = [
    `Hi ${firstName},`,
    '',
    'Payment received. Keep this email as your order receipt.',
    '',
    `Sold by: ${legalBusinessName} (Armoze)`,
    `Order reference: ${order.id}`,
    `Order date: ${orderDate}`,
    `Payment status: ${paymentStatus}`,
    `Customer email: ${order.customerEmail || 'Not provided'}`,
    ...(transactionReference ? [`Payment reference: ${transactionReference}`] : []),
    '',
    'Items:',
    lines,
    '',
    totals,
    '',
    'Your made-to-order print is being prepared. We will email tracking details when it ships.',
    '',
    `Check your order status anytime: ${orderStatusUrl}`,
    `Shipping policy: ${policyLinks.shipping}`,
    `Returns and refunds: ${policyLinks.returns}`,
    `Customer support: ${policyLinks.support}`,
    `Questions? Reply to this email or write to ${customerSupportEmail}.`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #151515; line-height: 1.55; max-width: 620px; margin: 0 auto;">
      <div style="padding: 26px 28px; background: #111; color: #fff;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Armoze</p>
        <h1 style="font-size: 25px; margin: 0;">Receipt &amp; order confirmation</h1>
      </div>
      <div style="padding: 28px; border: 1px solid #dedbd4; border-top: 0;">
      <p style="margin: 0 0 18px;">Hi ${escapeHtml(firstName)}, payment has been received. Keep this email as your order receipt.</p>
      <table role="presentation" style="width:100%;margin:0 0 24px;border-collapse:collapse;background:#f6f3ec;">
        <tr><td style="padding:7px 12px;font-size:13px;color:#666;">Sold by</td><td style="padding:7px 12px;text-align:right;font-weight:700;">${legalBusinessName} (Armoze)</td></tr>
        <tr><td style="padding:7px 12px;font-size:13px;color:#666;">Order reference</td><td style="padding:7px 12px;text-align:right;word-break:break-all;">${escapeHtml(order.id)}</td></tr>
        <tr><td style="padding:7px 12px;font-size:13px;color:#666;">Order date</td><td style="padding:7px 12px;text-align:right;">${escapeHtml(orderDate)}</td></tr>
        <tr><td style="padding:7px 12px;font-size:13px;color:#666;">Payment status</td><td style="padding:7px 12px;text-align:right;">${escapeHtml(paymentStatus)}</td></tr>
        <tr><td style="padding:7px 12px;font-size:13px;color:#666;">Customer email</td><td style="padding:7px 12px;text-align:right;">${escapeHtml(order.customerEmail || 'Not provided')}</td></tr>
        ${transactionReference ? `<tr><td style="padding:7px 12px;font-size:13px;color:#666;">Payment reference</td><td style="padding:7px 12px;text-align:right;word-break:break-all;">${escapeHtml(transactionReference)}</td></tr>` : ''}
      </table>
      <h2 style="font-size: 14px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.08em;">Items</h2>
      <table role="presentation" style="width:100%;margin:0 0 18px;border-collapse:collapse;">${itemsHtml}</table>
      <pre style="background: #f6f3ec; padding: 14px; white-space: pre-wrap; margin: 0 0 20px; font-family: Arial, sans-serif; line-height:1.65;">${escapeHtml(totals)}</pre>
      <p style="margin: 0 0 18px;">Your made-to-order print is being prepared. We will email tracking details when it ships.</p>
      <p style="margin: 0 0 20px;">
        <a href="${escapeHtml(orderStatusUrl)}" style="display: inline-block; padding: 12px 18px; background: #111; color: #fff; font-weight: 700; text-decoration: none;">Track your order</a>
      </p>
      <p style="margin:0 0 8px;color:#666;font-size:13px;">
        <a href="${escapeHtml(policyLinks.shipping)}" style="color:#555;">Shipping</a> &nbsp;|&nbsp;
        <a href="${escapeHtml(policyLinks.returns)}" style="color:#555;">Returns &amp; refunds</a> &nbsp;|&nbsp;
        <a href="${escapeHtml(policyLinks.support)}" style="color:#555;">Support</a>
      </p>
      <p style="margin: 0 0 14px; color: #666; font-size: 13px;">Questions? Reply to this email or write to ${customerSupportEmail}.</p>
      <p style="margin: 0; padding-top:14px; border-top:1px solid #dedbd4; color: #777; font-size: 12px;">Armoze is operated by ${legalBusinessName}.</p>
      </div>
    </div>
  `;

  return sendWithResend({ to: order.customerEmail, subject, text, html });
}

export async function sendCustomerOrderShippedEmail(order) {
  const siteUrl = getSiteUrl();
  const firstName = getCustomerFirstName(order);
  const lines = orderLines(order);
  const subject = 'Your Armoze order is on the way';
  const trackingParts = [
    order.carrier ? `Carrier: ${order.carrier}` : '',
    order.trackingNumber ? `Tracking number: ${order.trackingNumber}` : '',
    order.trackingUrl ? `Track your package: ${order.trackingUrl}` : '',
  ].filter(Boolean);

  const orderStatusUrl = `${siteUrl}/order-status?order=${encodeURIComponent(order.id)}`;

  const text = [
    `Hi ${firstName},`,
    '',
    'Good news: your Armoze order has shipped.',
    '',
    ...(trackingParts.length ? [trackingParts.join('\n'), ''] : []),
    'What is in this shipment:',
    lines,
    '',
    `Check your order status anytime: ${orderStatusUrl}`,
    `Track your orders: ${siteUrl}/account`,
    'Questions? Reply to this email or write to hello@armoze.com.',
  ].join('\n');

  const trackingHtml = trackingParts.length
    ? `<pre style="background: #f6f3ec; padding: 14px; white-space: pre-wrap; margin: 0 0 18px;">${escapeHtml(trackingParts.join('\n'))}</pre>`
    : '';
  const trackingButton = order.trackingUrl
    ? `<p style="margin: 0 0 20px;"><a href="${escapeHtml(order.trackingUrl)}" style="display: inline-block; padding: 12px 18px; background: #111; color: #fff; font-weight: 700; text-decoration: none;">Track your package</a></p>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; color: #151515; line-height: 1.6; max-width: 560px;">
      <h1 style="font-size: 24px; margin: 0 0 12px;">Your order is on the way</h1>
      <p style="margin: 0 0 18px;">Hi ${escapeHtml(firstName)}, good news: your Armoze order has shipped.</p>
      ${trackingHtml}
      ${trackingButton}
      <h2 style="font-size: 15px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.08em;">In this shipment</h2>
      <pre style="background: #f6f3ec; padding: 14px; white-space: pre-wrap; margin: 0 0 20px;">${escapeHtml(lines)}</pre>
      <p style="margin: 0 0 8px; color: #666; font-size: 13px;"><a href="${escapeHtml(orderStatusUrl)}" style="color: #666;">Check your order status</a></p>
      <p style="margin: 0; color: #666; font-size: 13px;">Questions? Reply to this email or write to hello@armoze.com.</p>
    </div>
  `;

  return sendWithResend({ to: order.customerEmail, subject, text, html });
}

export async function sendCustomerOrderDeliveredEmail(
  order,
  { discountCode = 'FIRST15', discountLabel = '15%' } = {},
) {
  const siteUrl = getSiteUrl();
  const firstName = getCustomerFirstName(order);
  const lines = orderLines(order);
  const subject = 'How does it look on your wall?';

  const text = [
    `Hi ${firstName},`,
    '',
    'Your Armoze order should be on your wall by now — we hope it looks incredible.',
    '',
    'Your order:',
    lines,
    '',
    'Two small favors that mean a lot to a small studio:',
    '- Reply to this email with a quick photo of the print in your space. We love seeing where the work ends up.',
    '- If you have a minute, tell us what you think — a sentence or two is plenty.',
    '',
    `And when you are ready for the next wall: code ${discountCode} takes ${discountLabel} off your next order.`,
    '',
    `Shop the collection: ${siteUrl}`,
    'Questions or anything not right with your order? Reply to this email and we will make it right.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #151515; line-height: 1.6; max-width: 560px;">
      <h1 style="font-size: 24px; margin: 0 0 12px;">How does it look on your wall?</h1>
      <p style="margin: 0 0 18px;">Hi ${escapeHtml(firstName)}, your Armoze order should be on your wall by now — we hope it looks incredible.</p>
      <pre style="background: #f6f3ec; padding: 14px; white-space: pre-wrap; margin: 0 0 20px;">${escapeHtml(lines)}</pre>
      <p style="margin: 0 0 8px;">Two small favors that mean a lot to a small studio:</p>
      <ul style="margin: 0 0 20px; padding-left: 20px;">
        <li style="margin: 0 0 6px;">Reply with a quick photo of the print in your space — we love seeing where the work ends up.</li>
        <li style="margin: 0;">Tell us what you think. A sentence or two is plenty.</li>
      </ul>
      <p style="margin: 0 0 10px;">When you are ready for the next wall, this takes ${escapeHtml(discountLabel)} off:</p>
      <p style="display: inline-block; margin: 0 0 20px; padding: 14px 18px; background: #111; color: #fff; font-size: 22px; font-weight: 700; letter-spacing: 0.12em;">${escapeHtml(discountCode)}</p>
      <p style="margin: 0 0 20px;">
        <a href="${escapeHtml(siteUrl)}" style="display: inline-block; padding: 12px 18px; background: #111; color: #fff; font-weight: 700; text-decoration: none;">Shop the collection</a>
      </p>
      <p style="margin: 0; color: #666; font-size: 13px;">Anything not right with your order? Reply to this email and we will make it right.</p>
    </div>
  `;

  return sendWithResend({ to: order.customerEmail, subject, text, html });
}

export async function sendAbandonedCartEmail(
  order,
  { discountCode = 'FIRST15', discountLabel = '15%', recoveryUrl = '' } = {},
) {
  const siteUrl = getSiteUrl();
  const firstName = getCustomerFirstName(order);
  const lines = orderLines(order);
  const subject = `Still thinking it over? Take ${discountLabel} off`;
  const resumeUrl = recoveryUrl || `${siteUrl}/cart`;
  const resumeLabel = recoveryUrl ? 'Resume your checkout' : 'Finish your order';

  const text = [
    `Hi ${firstName},`,
    '',
    'You left these Armoze prints in your cart:',
    lines,
    '',
    `Use code ${discountCode} at checkout for ${discountLabel} off.`,
    '',
    `${resumeLabel}: ${resumeUrl}`,
    '',
    'You are receiving this because you started checkout at Armoze.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #151515; line-height: 1.6; max-width: 560px;">
      <h1 style="font-size: 24px; margin: 0 0 12px;">Your cart is waiting</h1>
      <p style="margin: 0 0 18px;">Hi ${escapeHtml(firstName)}, you left these Armoze prints in your cart:</p>
      <pre style="background: #f6f3ec; padding: 14px; white-space: pre-wrap; margin: 0 0 20px;">${escapeHtml(lines)}</pre>
      <p style="margin: 0 0 10px;">Use this code at checkout for ${escapeHtml(discountLabel)} off:</p>
      <p style="display: inline-block; margin: 0 0 20px; padding: 14px 18px; background: #111; color: #fff; font-size: 22px; font-weight: 700; letter-spacing: 0.12em;">${escapeHtml(discountCode)}</p>
      <p style="margin: 0 0 20px;">
        <a href="${escapeHtml(resumeUrl)}" style="display: inline-block; padding: 12px 18px; background: #111; color: #fff; font-weight: 700; text-decoration: none;">${escapeHtml(resumeLabel)}</a>
      </p>
      <p style="margin: 0; color: #666; font-size: 13px;">You are receiving this because you started checkout at Armoze.</p>
    </div>
  `;

  return sendWithResend({ to: order.customerEmail, subject, text, html });
}

export async function sendNewsletterDiscountEmail({ email, discountCode = 'FIRST15', discountLabel = '15%' }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.NEWSLETTER_DISCOUNT_FROM ||
    process.env.CUSTOMER_EMAIL_FROM ||
    'Armoze <hello@armoze.com>';

  if (!apiKey) {
    return {
      sent: false,
      skipped: true,
      reason: 'Set RESEND_API_KEY to send discount emails.',
    };
  }

  const resend = new Resend(apiKey);
  const siteUrl = process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || 'https://armoze.com';
  const replyTo = process.env.NEWSLETTER_REPLY_TO || 'hello@armoze.com';
  const wordmarkUrl = `${siteUrl.replace(/\/$/, '')}/armoze-wordmark.png`;
  const subject = `Welcome to Armoze — your ${discountLabel} code`;
  const text = [
    'Welcome to Armoze.',
    '',
    'Art for the life you are building.',
    '',
    `Use code ${discountCode} at checkout for ${discountLabel} off your first order.`,
    '',
    `Shop Armoze: ${siteUrl}`,
    '',
    'You received this because you signed up for Armoze studio updates, new drops, and restocks.',
  ].join('\n');
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#ece8df;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Your ${escapeHtml(discountLabel)} welcome code is inside.</div>
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
            <tr>
              <td style="padding:44px 40px 38px;font-family:Arial,sans-serif;">
                <p style="margin:0 0 12px;color:#9a6b08;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Welcome to Armoze</p>
                <h1 style="margin:0 0 18px;color:#111111;font-size:36px;line-height:1.05;">Your walls should say something.</h1>
                <p style="margin:0 0 26px;color:#3e3e3e;font-size:16px;line-height:1.7;">Thanks for joining the studio list. You’ll get first looks at new canvas drops, restocks, and the stories behind the work.</p>
                <div style="margin:0 0 28px;padding:24px;background:#f2eee5;border-left:3px solid #d7a536;">
                  <p style="margin:0 0 9px;color:#6f6555;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(discountLabel)} off your first order</p>
                  <p style="margin:0;color:#111111;font-size:30px;font-weight:800;letter-spacing:5px;">${escapeHtml(discountCode)}</p>
                </div>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="background:#111111;">
                      <a href="${escapeHtml(siteUrl)}" style="display:inline-block;padding:15px 24px;color:#ffffff;font-size:14px;font-weight:700;letter-spacing:.5px;text-decoration:none;">Shop the collection</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px;background:#111111;color:#bdb9b0;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;">
                <p style="margin:0 0 8px;color:#ffffff;">Armoze — art for the life you are building.</p>
                <p style="margin:0;">You received this because you signed up for Armoze studio updates. Questions? Reply to this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const result = await resend.emails.send({
    from,
    to: email,
    replyTo,
    subject,
    text,
    html,
  });

  if (result.error) {
    return {
      sent: false,
      skipped: false,
      reason: result.error.message || 'Resend could not send the discount email.',
      error: result.error,
    };
  }

  return {
    sent: true,
    skipped: false,
    id: result.data?.id || null,
  };
}

export async function sendSupportRequestEmail({
  name,
  email,
  orderNumber,
  topic,
  message,
  photos = [],
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SUPPORT_NOTIFICATION_EMAIL || process.env.ORDER_NOTIFICATION_EMAIL;

  if (!apiKey || !to) {
    return {
      sent: false,
      skipped: true,
      reason: 'Support email is not configured. Please email hello@armoze.com.',
    };
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.SUPPORT_NOTIFICATION_FROM ||
    process.env.ORDER_NOTIFICATION_FROM ||
    'Armoze Support <orders@resend.dev>';
  const orderLine = orderNumber || 'Not provided';
  const subject = `Armoze support - ${topic}${orderNumber ? ` - ${orderNumber}` : ''}`;
  const text = [
    'A new storefront support request came in.',
    '',
    `From: ${name} <${email}>`,
    `Topic: ${topic}`,
    `Order: ${orderLine}`,
    `Photos: ${photos.length}`,
    '',
    message,
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; color: #151515; line-height: 1.6; max-width: 620px;">
      <h1 style="font-size: 24px; margin: 0 0 16px;">New support request</h1>
      <table style="width: 100%; margin: 0 0 20px; border-collapse: collapse;">
        <tr><td style="padding: 7px 10px; background: #f6f3ec; font-weight: 700;">Customer</td><td style="padding: 7px 10px; background: #f6f3ec;">${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</td></tr>
        <tr><td style="padding: 7px 10px; font-weight: 700;">Topic</td><td style="padding: 7px 10px;">${escapeHtml(topic)}</td></tr>
        <tr><td style="padding: 7px 10px; background: #f6f3ec; font-weight: 700;">Order</td><td style="padding: 7px 10px; background: #f6f3ec;">${escapeHtml(orderLine)}</td></tr>
        <tr><td style="padding: 7px 10px; font-weight: 700;">Photos</td><td style="padding: 7px 10px;">${photos.length}</td></tr>
      </table>
      <h2 style="font-size: 15px; margin: 0 0 8px; text-transform: uppercase;">Message</h2>
      <div style="padding: 16px; background: #f6f3ec; white-space: pre-wrap;">${escapeHtml(message)}</div>
      <p style="margin: 18px 0 0; color: #666; font-size: 13px;">Reply to this email to answer the customer.</p>
    </div>
  `;
  const result = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject,
    text,
    html,
    attachments: photos,
  });

  if (result.error) {
    return {
      sent: false,
      skipped: false,
      reason: result.error.message || 'Resend could not send the support request.',
      error: result.error,
    };
  }

  return {
    sent: true,
    skipped: false,
    id: result.data?.id || null,
  };
}
