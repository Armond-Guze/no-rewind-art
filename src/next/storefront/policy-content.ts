import { supportEmail } from './product-utils';

export type PolicyPageKey = 'shipping' | 'returns' | 'privacy' | 'terms';

export type PolicyLink = {
  href: string;
  label: string;
};

export type PolicyParagraph =
  | string
  | {
      text: string;
      links?: PolicyLink[];
    };

export type PolicyPageContent = {
  title: string;
  description: string;
  updated: string;
  sections: Array<{
    title: string;
    body: PolicyParagraph[];
  }>;
};

export const policyPages: Record<PolicyPageKey, PolicyPageContent> = {
  shipping: {
    title: 'Shipping Policy',
    description:
      'Learn how Armoze ships made-to-order canvas prints, including processing, delivery estimates, tracking, delays, and address changes.',
    updated: 'August 27, 2026',
    sections: [
      {
        title: 'Made-to-order processing',
        body: [
          'Armoze prints are made to order. Production usually begins shortly after checkout is completed and payment is confirmed.',
          'The delivery estimate shown at checkout includes expected production and carrier transit time. The current standard estimate for most U.S. orders is 5-8 business days after checkout, but the estimate shown for your order controls.',
        ],
      },
      {
        title: 'Shipping cost and estimates',
        body: [
          'Free standard shipping is currently offered for eligible U.S. orders through secure checkout.',
          'Delivery dates are estimates based on information reasonably available when you order. Weather, holidays, incorrect addresses, carrier interruptions, unusually busy periods, or production issues may affect timing.',
        ],
      },
      {
        title: 'If an order is delayed',
        body: [
          'If we learn that we cannot ship within the time stated for your order, we will provide a revised shipping date and explain your option to accept the delay or cancel the affected order for a full refund, as required by applicable law.',
          `If you have a deadline or believe an order is late, contact ${supportEmail} with your order reference.`,
        ],
      },
      {
        title: 'Tracking and address changes',
        body: [
          'Tracking details are provided when your order ships and are also available through the order-status page.',
          `If you entered the wrong shipping address, contact ${supportEmail} as soon as possible. Address changes cannot be guaranteed after an order enters production or ships.`,
        ],
      },
      {
        title: 'Lost or delivered packages',
        body: [
          'If tracking shows a package was delivered but you cannot locate it, check nearby delivery areas and contact the carrier first.',
          `If the issue continues, email ${supportEmail} with your order details so we can review the shipment and available remedies.`,
        ],
      },
    ],
  },
  returns: {
    title: 'Returns & Refunds',
    description:
      'Review the Armoze returns and refunds policy for canvas prints, including the 30-day return window, return shipping, damaged orders, cancellations, and refunds.',
    updated: 'August 27, 2026',
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
          "Returns are accepted by mail only. For non-defective returns such as buyer's remorse, size preference, or style preference, the customer is responsible for creating the return label and paying return shipping.",
          'Armoze does not charge a restocking fee for approved returns.',
        ],
      },
      {
        title: 'Damaged, defective, wrong, or missing items',
        body: [
          `If your item arrives damaged, defective, or different from what you ordered, email ${supportEmail} within 30 days of delivery. Contacting us within 7 days is recommended so the issue can be reviewed quickly.`,
          'Include your order number, photos of the product and packaging, and a short description. If the item is confirmed damaged, defective, or incorrect, Armoze may provide a prepaid return option, replacement, or refund. Nothing in this policy limits rights that cannot legally be waived.',
        ],
      },
      {
        title: 'Refund timing',
        body: [
          'Approved refunds are issued to the original payment method within 5 business days after the returned item is received and inspected, unless we confirm that a return is not required.',
          'After a refund is issued, your bank or card provider may take additional time to post the funds to your account.',
        ],
      },
      {
        title: 'Cancellations',
        body: [
          'If you need to change or cancel an order, contact us quickly. Cancellation requests are easiest to handle within 24 hours of purchase and before production starts.',
          'Orders that have already entered production or shipped may need to follow the standard return process. Your rights for an unshipped or materially delayed order are not reduced by this provision.',
        ],
      },
      {
        title: 'Returned packages',
        body: [
          'If an order is returned because of an incorrect address, failed delivery, or refusal of delivery, reasonable additional shipping or replacement costs may apply when permitted by law.',
          'Armoze reviews returned-package situations individually based on the order status and carrier information.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    description:
      'Learn how ARMOZE LLC collects, uses, discloses, and protects information when you shop at Armoze or interact with its services.',
    updated: 'August 27, 2026',
    sections: [
      {
        title: 'Who is responsible for your information',
        body: [
          `ARMOZE LLC, doing business as Armoze, operates armoze.com and is responsible for the personal information described in this policy. For privacy questions or requests, email ${supportEmail}.`,
          'This policy applies to the Armoze website, customer accounts, checkout, order support, and related measurement and communications. A service provider may also publish its own privacy notice for information it processes independently.',
        ],
      },
      {
        title: 'Information we collect',
        body: [
          'We may collect identifiers and contact information such as your name, email address, phone number, billing and shipping address, account details, and support communications.',
          'We collect commercial and transaction information such as products viewed or purchased, product options, cart contents, order value, discounts, tax, shipping, payment status, refunds, tracking details, and transaction references. Stripe processes full payment credentials; Armoze does not store full payment card numbers on this website.',
          'We may collect internet and device information such as IP address, approximate location, browser or device details, pages viewed, interactions, referring page, and timestamps. Advertising links may include UTM parameters or identifiers such as gclid, fbclid, srsltid, or OpenAI oppref.',
          'If you create an account, join the newsletter, submit a support form, or opt into a customer review survey, we collect the information you choose to provide for that feature.',
        ],
      },
      {
        title: 'How we use information',
        body: [
          'We use information to provide checkout, process and fulfill orders, communicate order updates, manage customer accounts, provide support, handle returns and disputes, prevent fraud, secure and maintain the site, and comply with legal, tax, accounting, and recordkeeping obligations.',
          'We also use aggregated or event-level information to understand storefront performance, improve products and site features, measure advertising and product-listing results, and attribute purchases to campaigns.',
        ],
      },
      {
        title: 'How information is disclosed',
        body: [
          'We disclose information as needed to payment and fraud providers such as Stripe; hosting, database, account, email, and support providers; analytics and advertising providers; fulfillment and shipping partners; professional advisers; and government or legal authorities when required.',
          'Fulfillment partners may receive your name, shipping address, phone number, order contents, and delivery instructions so they can print and ship your order. Email providers may receive your contact and transaction details to deliver requested, transactional, or opted-in marketing messages.',
          'We do not sell personal information for money. Some laws may define certain advertising or measurement disclosures as a sale, sharing, or targeted advertising even when no money is exchanged. Our use of those tools depends on what is enabled on the site and the choices available through your browser or the relevant provider.',
        ],
      },
      {
        title: 'Payments and Stripe',
        body: [
          'Stripe provides checkout, processes payments, helps prevent fraud, and supports receipts and related payment services. Stripe may receive transaction and device information and may share it with banks, payment networks, or payment-method providers to authenticate and process a transaction, prevent fraud, and handle disputes.',
          {
            text: 'Review Stripe privacy information:',
            links: [{ href: 'https://stripe.com/privacy', label: 'Stripe Privacy Policy' }],
          },
        ],
      },
      {
        title: 'Analytics, advertising, and reviews',
        body: [
          'When enabled, Armoze uses Google Analytics, Google Ads, Merchant Center, Google Customer Reviews, the OpenAI Ads Measurement Pixel, and Meta Pixel to measure site activity, product-listing performance, advertising, and conversions. These services may receive device or browser information, page and purchase events, campaign identifiers, and limited order information.',
          'Google Customer Reviews may receive the Merchant Center ID, order ID, order email, delivery country, and estimated delivery date so Google can offer an optional post-purchase survey. The OpenAI pixel may receive the website origin, event timestamp, product identifiers, quantities, purchase value, currency, and an oppref attribution identifier. We do not send full payment card details through advertising pixels.',
          {
            text: 'Provider privacy information:',
            links: [
              { href: 'https://policies.google.com/privacy', label: 'Google Privacy Policy' },
              { href: 'https://openai.com/policies/privacy-policy', label: 'OpenAI Privacy Policy' },
              { href: 'https://www.facebook.com/privacy/policy/', label: 'Meta Privacy Policy' },
            ],
          },
        ],
      },
      {
        title: 'Cookies and browser storage',
        body: [
          'The site may use cookies, URL parameters, local storage, and session storage for cart behavior, account or session state, analytics, fraud prevention, advertising measurement, and attribution. Limiting these technologies may affect site features or measurement.',
          'Armoze may store first- and last-touch attribution details, including campaign source, external referrer, landing page, timestamps, and applicable click identifiers, in local storage for up to 90 days. At checkout, those details may be attached to Stripe metadata.',
          'This site does not currently respond automatically to browser Do Not Track or Global Privacy Control signals. You can limit cookies or storage through your browser and may contact us about an applicable privacy right. We will update this statement if our technical response changes.',
        ],
      },
      {
        title: 'Retention and security',
        body: [
          'We retain information only as long as reasonably needed for the purposes described here, including fulfillment, support, fraud prevention, accounting, tax, dispute, and legal obligations. Retention periods vary by record type and applicable law. Attribution stored in your browser is designed to expire after up to 90 days.',
          'We use reasonable administrative, technical, and organizational safeguards appropriate to the information we handle. No online system or transmission is guaranteed to be completely secure.',
        ],
      },
      {
        title: 'Your choices and privacy requests',
        body: [
          `You may unsubscribe from marketing email using the link in the message. Depending on where you live and applicable law, you may also request access, correction, deletion, or a portable copy of personal information, or ask to opt out of certain targeted advertising, sale, or sharing. Email ${supportEmail} with the subject "Privacy Request."`,
          'We may need to verify your identity and authority before completing a request. If we deny a request covered by an applicable appeal right, you may appeal by replying to our decision and writing "Privacy Appeal" in the subject line. We will respond within the period required by applicable law.',
        ],
      },
      {
        title: "Children's privacy",
        body: [
          'Armoze is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided information, contact us so we can review and delete it as appropriate.',
        ],
      },
      {
        title: 'Policy changes and contact',
        body: [
          'We may update this policy to reflect changes to the store, providers, technology, or law. We will post the revised policy with a new last-updated date and provide additional notice when required.',
          `For privacy questions or requests, email ${supportEmail}. ARMOZE LLC operates Armoze from New Jersey, United States.`,
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    description:
      'Read the terms that apply when you browse Armoze or purchase made-to-order canvas wall art from ARMOZE LLC.',
    updated: 'August 27, 2026',
    sections: [
      {
        title: 'About these terms',
        body: [
          `Armoze is operated by ARMOZE LLC, a New Jersey limited liability company. These Terms of Service form an agreement between you and ARMOZE LLC when you use armoze.com or place an order. Questions may be sent to ${supportEmail}.`,
          'By using this website or placing an order, you agree to these terms and the policies linked on this site. If you do not agree, do not use the site or submit an order.',
        ],
      },
      {
        title: 'Store eligibility and accounts',
        body: [
          'You must be able to enter a binding contract to place an order. You are responsible for accurate account and checkout information and for keeping account credentials secure.',
          'You may not misuse the site, attempt unauthorized access, interfere with its operation, scrape it in violation of law, or use it for fraudulent or unlawful activity.',
        ],
      },
      {
        title: 'Products and presentation',
        body: [
          'Armoze sells made-to-order canvas wall art, framed canvas prints, and related home decor. Product images, room mockups, frame previews, and colors are illustrative. Actual color, scale, crop, texture, and framing may vary because of screen settings, selected size, production tolerances, and available materials.',
          'Prices, sizes, availability, and product details may change before an order is placed. Changes do not affect an accepted order unless you agree or applicable law permits the change.',
        ],
      },
      {
        title: 'Orders, payment, and taxes',
        body: [
          'Submitting checkout is an offer to purchase. An order is accepted when payment is confirmed and we issue an order confirmation, subject to fraud review and product availability. Stripe and its payment partners process payment information.',
          'You authorize the displayed total, including product charges, shipping, discounts, and applicable tax. Tax is calculated and separately stated when required. Prices are shown in U.S. dollars unless checkout states otherwise.',
          'We may reject, cancel, or refund an order for suspected fraud, incorrect pricing, product unavailability, payment failure, fulfillment problems, or a violation of these terms. If we cancel after payment, we will refund the affected amount.',
        ],
      },
      {
        title: 'Shipping, address accuracy, and delays',
        body: [
          'You are responsible for providing an accurate deliverable address. Contact us promptly if information is wrong; changes cannot be guaranteed after production or shipment begins.',
          'The delivery estimate shown at checkout is based on expected production and carrier transit. If we cannot ship within the stated time, we will provide a revised date and your cancellation and refund options as required by applicable law.',
          {
            text: 'Shipping details are part of these terms:',
            links: [{ href: '/shipping', label: 'Shipping Policy' }],
          },
        ],
      },
      {
        title: 'Cancellations, returns, and order problems',
        body: [
          'Because items are made to order, contact us as soon as possible to request a cancellation. A request is not guaranteed after production begins, but this does not reduce rights that apply to unshipped, materially delayed, damaged, defective, missing, or incorrect goods.',
          {
            text: 'The return window, condition requirements, costs, damaged-item process, and refund timing are described here:',
            links: [{ href: '/returns', label: 'Returns & Refunds Policy' }],
          },
        ],
      },
      {
        title: 'Intellectual property',
        body: [
          'Artwork, branding, product copy, images, video, layout, software, and other site content belong to ARMOZE LLC or their respective licensors and are protected by applicable intellectual-property laws.',
          'You may use the site only for personal shopping and other lawful, noncommercial purposes. You may not copy, reproduce, distribute, resell, create derivative works from, or commercially exploit Armoze artwork or content without written permission.',
        ],
      },
      {
        title: 'Disclaimers and limits',
        body: [
          'To the fullest extent permitted by law, the website is provided on an "as available" basis. We do not promise that the site will always be uninterrupted or error-free. Any legally required product warranty or consumer remedy remains unaffected.',
          'To the fullest extent permitted by law, ARMOZE LLC is not liable for indirect, incidental, special, or consequential losses arising from site use or an affected order. For a direct claim related to an order, aggregate liability will not exceed the amount paid for that order, except where a different remedy is required by law.',
          'Nothing in these terms excludes or limits liability, warranties, refund rights, or other consumer protections that cannot legally be excluded or limited.',
        ],
      },
      {
        title: 'Governing law and disputes',
        body: [
          `Before filing a claim, please contact ${supportEmail} and give us a reasonable opportunity to resolve the issue.`,
          'These terms are governed by the laws of New Jersey and applicable federal law, without regard to conflict-of-law rules. Any court proceeding must be brought in a court with lawful jurisdiction. Nothing here prevents you from using a government complaint process or another forum that applicable law makes available.',
        ],
      },
      {
        title: 'Changes and severability',
        body: [
          'We may update these terms prospectively by posting a revised version with a new last-updated date. The terms in effect when an order is placed will govern that order unless you agree otherwise or a change is required by law.',
          'If a provision is found unenforceable, the remaining provisions remain in effect to the fullest extent permitted by law. A failure to enforce a provision is not a waiver.',
        ],
      },
      {
        title: 'Contact',
        body: [
          `ARMOZE LLC operates Armoze. For order questions, legal notices, or support, email ${supportEmail} or use the support page.`,
          {
            text: 'Related policies:',
            links: [
              { href: '/privacy', label: 'Privacy Policy' },
              { href: '/shipping', label: 'Shipping Policy' },
              { href: '/returns', label: 'Returns & Refunds' },
              { href: '/support', label: 'Customer Support' },
            ],
          },
        ],
      },
    ],
  },
};
