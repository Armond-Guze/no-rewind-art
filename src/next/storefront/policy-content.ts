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
          'Production takes about 5–8 business days before shipment. During busy periods or supplier delays, production may take longer.',
        ],
      },
      {
        title: 'Shipping estimates',
        body: [
          'Standard shipping is currently offered for U.S. orders through Stripe Checkout. Carrier transit begins after production is complete and the order ships.',
          'Delivery dates are estimates, not guarantees. Carrier delays, weather, holidays, incorrect addresses, or production issues may affect timing.',
        ],
      },
      {
        title: 'Tracking and address changes',
        body: [
          'Tracking details are provided when your order ships.',
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
      'Review the Armoze returns and refunds policy for canvas prints, including the 30-day return window, return shipping, damaged orders, cancellations, and refunds.',
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
      'Learn what information Armoze collects and how order, payment, measurement, advertising, Merchant Center, and customer review services support the store.',
    updated: 'July 2026',
    sections: [
      {
        title: 'Information we collect',
        body: [
          'When you place or begin an order, Armoze may receive information such as your name, email address, billing or shipping address, order details, payment status, and support communications. Payment card details are processed by Stripe; Armoze does not store full card numbers on this website.',
          'When you use the site, Google Analytics 4 may collect information such as page and ecommerce events, user and session statistics, approximate location, and browser or device information. Google Analytics may use a first-party cookie, including _ga, to distinguish users and sessions.',
          'Links from advertising, email, social media, or Google product listings may include campaign or measurement identifiers such as UTM parameters, gclid, fbclid, or srsltid. Armoze may preserve these identifiers with external referrer, landing-page, and visit-timing information so advertising, campaigns, and free-listing activity can be measured.',
        ],
      },
      {
        title: 'How we use information',
        body: [
          'Armoze uses order information to process payments, prepare and ship products, provide customer support, prevent fraud, maintain the website, send requested or transactional messages, and meet business or legal requirements.',
          'Armoze uses site activity, ecommerce events, and attribution information to understand storefront performance, measure advertising and Google product-listing results, report purchases and other key events, and improve the shopping experience.',
        ],
      },
      {
        title: 'Payments and Stripe',
        body: [
          'Armoze uses Stripe to provide checkout, process payments, help prevent fraud, and support related payment services. Stripe may receive transaction information such as your name, email address, billing or shipping address, payment method information, purchase amount and date, and, in some cases, details about what you purchased.',
          'Depending on the payment method you select, Stripe may share transaction information with the relevant bank, payment network, or payment-method provider to authenticate and process the transaction, prevent fraud, and handle disputes. Learn more in Stripe’s privacy policy at stripe.com/privacy.',
        ],
      },
      {
        title: 'Google measurement and Merchant Center',
        body: [
          'Armoze uses Google Analytics 4 and Google Ads to measure site use, ecommerce activity, advertising performance, and conversions. Google may process site events, device or browser information, approximate location, first-party cookie identifiers, and Google click identifiers for measurement, attribution, and reporting.',
          'Merchant Center auto-tagging may add an srsltid parameter to links from Google product listings, and Google Ads auto-tagging may add a gclid parameter to ad links. Purchase and other key-event data may be shared with Google for Merchant Center and Google Ads performance reporting and for the uses described in Google’s policies. Learn more at policies.google.com/privacy.',
        ],
      },
      {
        title: 'Google Customer Reviews',
        body: [
          'After a completed purchase, the order-confirmation page may display the Google Customer Reviews survey opt-in. When the module loads, it provides Google with Armoze’s Merchant Center ID, a unique order ID, your order email address, delivery country, and estimated delivery date so Google can offer the survey.',
          'Choosing to take the survey is optional. If you opt in, Google may email you after the estimated delivery date and use your response to help calculate Armoze’s store rating. Google processes this information under its privacy policy at policies.google.com/privacy.',
        ],
      },
      {
        title: 'Cookies, links, and local storage',
        body: [
          'The site may use cookies, URL parameters, and browser storage for features such as cart behavior, session state, analytics, advertising measurement, and attribution. Limiting these technologies through your browser may affect some features or measurement.',
          'Armoze stores first- and last-touch attribution details, which may include campaign source, external referrer, landing page, timestamps, and applicable click identifiers, in local storage for up to 90 days. Session storage is also used to recognize the current shopping session. At checkout, first- and last-touch attribution details may be attached to Stripe checkout metadata.',
          'Service providers, including Google and Stripe, may use cookies or similar technologies when providing their services. Their handling of information is governed by their own policies.',
        ],
      },
      {
        title: 'Other service providers',
        body: [
          'Armoze also uses service providers for website hosting, database and account features, email, shipping or fulfillment, customer support, and other store operations.',
          'These providers may receive information needed to perform their services, and their handling of information is governed by their own terms and privacy policies.',
        ],
      },
      {
        title: 'Contact and updates',
        body: [
          `For privacy questions, email ${supportEmail}.`,
          'This policy may be updated as the store, service providers, or measurement features change.',
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
