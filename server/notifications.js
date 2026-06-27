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

export async function sendNewsletterDiscountEmail({ email, discountCode = 'FIRST15', discountLabel = '15%' }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_DISCOUNT_FROM;

  if (!apiKey || !from) {
    return {
      sent: false,
      skipped: true,
      reason: 'Set RESEND_API_KEY and NEWSLETTER_DISCOUNT_FROM to send discount emails.',
    };
  }

  const resend = new Resend(apiKey);
  const siteUrl = process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || 'https://armoze.com';
  const subject = `Your ${discountLabel} Armoze code`;
  const text = [
    `Your ${discountLabel} Armoze code is ${discountCode}.`,
    '',
    'Use it at checkout on your first order.',
    '',
    `Shop Armoze: ${siteUrl}`,
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; color: #151515; line-height: 1.5;">
      <h1 style="font-size: 24px; margin: 0 0 12px;">Your Armoze code is here</h1>
      <p style="margin: 0 0 18px;">Use this at checkout for ${escapeHtml(discountLabel)} off your first order.</p>
      <p style="display: inline-block; margin: 0 0 20px; padding: 14px 18px; background: #111; color: #fff; font-size: 22px; font-weight: 700; letter-spacing: 0.12em;">
        ${escapeHtml(discountCode)}
      </p>
      <p style="margin: 0 0 20px;"><a href="${escapeHtml(siteUrl)}" style="color: #111; font-weight: 700;">Shop Armoze</a></p>
      <p style="margin: 0; color: #666; font-size: 13px;">You received this because you signed up for Armoze updates.</p>
    </div>
  `;

  const result = await resend.emails.send({
    from,
    to: email,
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
