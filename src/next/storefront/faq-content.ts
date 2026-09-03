export const faqGroups = [
  {
    id: 'shipping-returns',
    title: 'Shipping & Returns',
    description: 'Delivery, tracking, and getting things sorted if something isn’t right.',
    questions: [
      {
        id: 'shipping-cost',
        question: 'Is shipping free?',
        answer: 'Yes. Standard shipping is free on every order, with no minimum spend.',
      },
      {
        id: 'destinations',
        question: 'Where do you ship?',
        answer: 'We currently ship within the United States. International shipping is not available at checkout.',
      },
      {
        id: 'delivery',
        question: 'When will my order arrive?',
        answer: 'Each canvas is made to order. Most U.S. orders are expected to arrive within 5–8 business days after checkout, including production and delivery. Follow the estimate shown for your order; delivery dates are estimates.',
        link: { href: '/shipping', label: 'Read the shipping policy' },
      },
      {
        id: 'tracking',
        question: 'How do I track my order?',
        answer: 'Tracking becomes available when your order ships. Use your order reference and the email from checkout to check its status—no account needed.',
        link: { href: '/order-status', label: 'Track an order' },
      },
      {
        id: 'returns',
        question: 'Can I return my canvas?',
        answer: 'We accept returns within 30 days of delivery. Prints must be unused, unhung, and securely packaged. Contact us before sending anything back. For non-defective returns, you pay return shipping; there is no restocking fee for approved returns.',
        link: { href: '/returns', label: 'Read the returns & refunds policy' },
      },
      {
        id: 'damaged',
        question: 'What if my item arrives damaged or incorrect?',
        answer: 'Contact us within 30 days of delivery; within 7 days is recommended for a quicker review. Include your order number and photos of the canvas and packaging. Once the issue is confirmed, we may arrange a prepaid return, replacement, or refund.',
        link: { href: '/support#support-request', label: 'Send a request with photos' },
      },
    ],
  },
  {
    id: 'orders',
    title: 'Orders',
    description: 'A little help with checkout, changes, and refunds.',
    questions: [
      {
        id: 'purchase',
        question: 'How do I place an order?',
        answer: 'Choose your artwork and size, add it to your cart, and continue to secure checkout. Review your contact details, delivery address, and order before paying.',
      },
      {
        id: 'confirmation',
        question: 'How can I check that my order went through?',
        answer: 'Use the order reference from checkout and your checkout email on our order-status page. If you can’t find your reference or need help confirming an order, contact us before placing it again.',
        link: { href: '/order-status', label: 'Check order status' },
      },
      {
        id: 'changes',
        question: 'Can I change my address or cancel an order?',
        answer: 'Contact us as soon as possible with your order details. Cancellation requests are easiest within 24 hours and before production starts. Address changes cannot be guaranteed once production begins or the order ships.',
        link: { href: '/support', label: 'Contact us' },
      },
      {
        id: 'refunds',
        question: 'When will I receive my refund?',
        answer: 'Approved refunds are issued to your original payment method within 5 business days after we receive and inspect the return, unless we confirm a return isn’t needed. Your bank may take additional time to post the funds.',
        link: { href: '/returns', label: 'Read the refund details' },
      },
    ],
  },
  {
    id: 'products',
    title: 'Products',
    description: 'Choosing the right canvas for your space.',
    questions: [
      {
        id: 'sizes',
        question: 'What size should I choose?',
        answer: 'Measure the wall space you want to fill, then use the size guide on the artwork’s product page to compare options. Available sizes and prices are listed for each print.',
      },
      {
        id: 'ready-to-hang',
        question: 'Does my canvas arrive ready to hang?',
        answer: 'Yes. Your canvas arrives stretched and ready to hang, with a matte finish. Choose hanging hardware appropriate for your wall type and the weight of your print.',
      },
      {
        id: 'made-to-order',
        question: 'Are your prints made to order?',
        answer: 'Yes. Armoze canvas prints are made to order in the USA. Production usually begins shortly after checkout and payment are confirmed.',
      },
    ],
  },
];
