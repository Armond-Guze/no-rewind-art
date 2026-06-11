import { supportEmail } from './product-utils';

export type PolicyPageKey = 'shipping' | 'returns' | 'privacy' | 'terms';

export type PolicyPageContent = {
  title: string;
  description: string;
  updated: string;
  sections: Array<{
    title: string;
    body: string[];
  }>;
};

export const policyPages: Record<PolicyPageKey, PolicyPageContent> = {
  shipping: {
    title: 'Shipping Policy',
    description:
      'Learn how Armoze ships made-to-order canvas prints, including processing times, delivery estimates, tracking, and address changes.',
    updated: 'May 2026',
    sections: [
      {
        title: 'Made-to-order processing',
        body: [
          'Armoze prints are made to order. Production usually begins shortly after checkout is completed and payment is confirmed.',
          'Most orders are prepared for shipment within 2 to 3 business days. During busy periods or supplier delays, production may take longer.',
        ],
      },
      {
        title: 'Shipping estimates',
        body: [
          'Standard shipping is currently offered for U.S. orders through Stripe Checkout. Estimated delivery is typically 2 to 5 business days after production is complete.',
          'Delivery dates are estimates, not guarantees. Carrier delays, weather, holidays, incorrect addresses, or production issues may affect timing.',
        ],
      },
      {
        title: 'Tracking and address changes',
        body: [
          'When tracking is available, it will be sent to the email address used at checkout.',
          `If you entered the wrong shipping address, contact ${supportEmail} as soon as possible. Address changes cannot be guaranteed after an order enters production or ships.`,
        ],
      },
      {
        title: 'Lost or delayed packages',
        body: [
          'If tracking shows a package was delivered but you cannot locate it, check nearby delivery areas and contact the carrier first.',
          `If the issue continues, email ${supportEmail} with your order details so the order can be reviewed.`,
        ],
      },
    ],
  },
  returns: {
    title: 'Returns & Refunds',
    description:
      'Review the Armoze returns and refunds policy for canvas prints, including the 30-day return window, return shipping cost, damaged orders, cancellations, and refund timing.',
    updated: 'June 2026',
    sections: [
      {
        title: '30-day return window',
        body: [
          'Armoze accepts returns for defective and non-defective products within 30 days of delivery for U.S. orders.',
          'Returned canvas prints must be new, unused, unhung, and packed securely in the original packaging or equivalent protective packaging.',
          `To start a return, email ${supportEmail} with your order number and the email address used at checkout before mailing anything back.`,
        ],
      },
      {
        title: 'Return method and cost',
        body: [
          'Returns are accepted by mail only. For non-defective returns such as buyer’s remorse, size preference, or style preference, the customer is responsible for creating the return label and paying return shipping.',
          'Armoze does not charge a restocking fee for approved returns.',
        ],
      },
      {
        title: 'Damaged, defective, or wrong items',
        body: [
          `If your item arrives damaged, defective, or different from what you ordered, email ${supportEmail} within 30 days of delivery. Contacting us within 7 days is recommended so the issue can be reviewed quickly.`,
          'Include your order number, photos of the product, photos of the packaging, and a short description of the issue. If the item is confirmed damaged, defective, or incorrect, Armoze may provide a prepaid return option when a return is needed, or may provide a replacement or refund without requiring a return.',
        ],
      },
      {
        title: 'Refund timing',
        body: [
          'Approved refunds are issued to the original payment method within 5 business days after the returned item is received and inspected, unless Armoze confirms that a return is not required for a damaged, defective, or incorrect item.',
          'After a refund is issued, your bank or card provider may take additional time to post the funds to your account.',
        ],
      },
      {
        title: 'Cancellations',
        body: [
          'If you need to change or cancel an order, contact us quickly. Cancellation requests are easiest to handle within 24 hours of purchase and before production starts.',
          'Orders that have already entered production or shipped may need to follow the standard return process above.',
        ],
      },
      {
        title: 'Returned packages',
        body: [
          'If an order is returned because of an incorrect address, failed delivery, or refusal of delivery, additional shipping or replacement costs may apply.',
          'Armoze reviews returned-package situations individually based on the order status and carrier information.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    description:
      'Learn what information Armoze collects, how order and payment data is handled, and how service providers like Stripe support checkout.',
    updated: 'May 2026',
    sections: [
      {
        title: 'Information we collect',
        body: [
          'When you place an order, Armoze may receive information such as your name, email address, shipping address, order details, and payment confirmation status.',
          'Payment card details are processed by Stripe. Armoze does not store full card numbers on this website.',
        ],
      },
      {
        title: 'How we use information',
        body: [
          'Order information is used to process payments, prepare and ship products, provide customer support, prevent fraud, maintain the website, and meet business or legal requirements.',
          'If email notifications are enabled, order information may be used to send customer or owner order updates.',
        ],
      },
      {
        title: 'Service providers',
        body: [
          'Armoze uses service providers to operate the store, including hosting, database, payment, shipping, and email tools.',
          'Stripe processes payments and may collect information according to its own privacy policy. You can review Stripe’s privacy policy at stripe.com/privacy.',
        ],
      },
      {
        title: 'Cookies and local storage',
        body: [
          'The site may use browser storage for basic storefront features such as cart behavior and session state.',
          'If analytics, advertising, or additional tracking tools are added later, this policy should be updated to describe those tools.',
        ],
      },
      {
        title: 'Contact and updates',
        body: [
          `For privacy questions, email ${supportEmail}.`,
          'This policy may be updated as the store changes, especially if new analytics, email, advertising, or fulfillment tools are added.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    description:
      'Read the Armoze terms covering storefront use, orders, payments, product presentation, intellectual property, and checkout.',
    updated: 'May 2026',
    sections: [
      {
        title: 'About Armoze',
        body: [
          'Armoze is an online storefront for motivational canvas prints and wall art. Armoze is operated by Guze LLC.',
          'By using this website or placing an order, you agree to these terms and the policies linked on this site.',
        ],
      },
      {
        title: 'Products and presentation',
        body: [
          'Product images, room mockups, frame previews, and colors are shown for presentation. Actual print colors, scale, texture, and framing may vary based on screen settings, production materials, and selected size.',
          'Prices, sizes, availability, and product details may change without notice before an order is placed.',
        ],
      },
      {
        title: 'Orders and payments',
        body: [
          'Checkout is processed through Stripe. Orders are not accepted until payment is completed and confirmed.',
          'Armoze may cancel or refund orders when necessary, including suspected fraud, incorrect pricing, unavailable products, or fulfillment issues.',
        ],
      },
      {
        title: 'Intellectual property',
        body: [
          'Artwork, branding, product copy, images, and site content belong to Armoze or its respective owners.',
          'You may not copy, reproduce, resell, or use Armoze artwork or content for commercial purposes without written permission.',
        ],
      },
      {
        title: 'Limitation of liability',
        body: [
          'The website is provided as available. Armoze is not responsible for delays, interruptions, carrier issues, payment provider outages, or indirect losses beyond the amount paid for the affected order.',
          `For order questions or support, contact ${supportEmail}.`,
        ],
      },
    ],
  },
};
