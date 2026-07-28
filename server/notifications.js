import { Resend } from 'resend';

function formatPrice(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(Number(cents || 0) / 100);
}

function orderLines(order) {
  return order.items
    .map((item) => {
      const size = item.sizeLabel ? ` (${item.sizeLabel})` : '';
      return `${item.quantity} x ${item.title}${size} - ${formatPrice(item.lineTotal, order.currency)}`;
    })
    .join('\n');
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

function orderTotalsLines(order) {
  const lines = [`Subtotal: ${formatPrice(order.amountSubtotal, order.currency)}`];

  if (Number(order.amountShipping || 0) > 0) {
    lines.push(`Shipping: ${formatPrice(order.amountShipping, order.currency)}`);
  } else {
    lines.push('Shipping: Free');
  }

  if (Number(order.amountTax || 0) > 0) {
    lines.push(`Tax: ${formatPrice(order.amountTax, order.currency)}`);
  }

  lines.push(`Total: ${formatPrice(order.amountTotal, order.currency)}`);

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
  const subject = 'Your Armoze order is confirmed';

  const text = [
    `Hi ${firstName},`,
    '',
    'Thank you for your Armoze order. We are getting your print ready.',
    '',
    'Order summary:',
    lines,
    '',
    totals,
    '',
    'Your order usually ships within 2 to 5 business days. We will email you tracking as soon as it is on the way.',
    '',
    `Track your orders: ${siteUrl}/account`,
    'Questions? Reply to this email or write to hello@armoze.com.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #151515; line-height: 1.6; max-width: 560px;">
      <h1 style="font-size: 24px; margin: 0 0 12px;">Order confirmed</h1>
      <p style="margin: 0 0 18px;">Hi ${escapeHtml(firstName)}, thank you for your Armoze order. We are getting your print ready.</p>
      <h2 style="font-size: 15px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.08em;">Order summary</h2>
      <pre style="background: #f6f3ec; padding: 14px; white-space: pre-wrap; margin: 0 0 14px;">${escapeHtml(lines)}</pre>
      <pre style="background: #f6f3ec; padding: 14px; white-space: pre-wrap; margin: 0 0 20px;">${escapeHtml(totals)}</pre>
      <p style="margin: 0 0 18px;">Your order usually ships within 2 to 5 business days. We will email you tracking as soon as it is on the way.</p>
      <p style="margin: 0 0 20px;">
        <a href="${escapeHtml(`${siteUrl}/account`)}" style="display: inline-block; padding: 12px 18px; background: #111; color: #fff; font-weight: 700; text-decoration: none;">View your orders</a>
      </p>
      <p style="margin: 0; color: #666; font-size: 13px;">Questions? Reply to this email or write to hello@armoze.com.</p>
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

  const text = [
    `Hi ${firstName},`,
    '',
    'Good news: your Armoze order has shipped.',
    '',
    ...(trackingParts.length ? [trackingParts.join('\n'), ''] : []),
    'What is in this shipment:',
    lines,
    '',
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
      <p style="margin: 0; color: #666; font-size: 13px;">Questions? Reply to this email or write to hello@armoze.com.</p>
    </div>
  `;

  return sendWithResend({ to: order.customerEmail, subject, text, html });
}

export async function sendAbandonedCartEmail(order, { discountCode = 'FIRST15', discountLabel = '15%' } = {}) {
  const siteUrl = getSiteUrl();
  const firstName = getCustomerFirstName(order);
  const lines = orderLines(order);
  const subject = `Still thinking it over? Take ${discountLabel} off`;

  const text = [
    `Hi ${firstName},`,
    '',
    'You left these Armoze prints in your cart:',
    lines,
    '',
    `Use code ${discountCode} at checkout for ${discountLabel} off.`,
    '',
    `Finish your order: ${siteUrl}/cart`,
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
        <a href="${escapeHtml(`${siteUrl}/cart`)}" style="display: inline-block; padding: 12px 18px; background: #111; color: #fff; font-weight: 700; text-decoration: none;">Finish your order</a>
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
