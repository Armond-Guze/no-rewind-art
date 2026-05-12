const sizePresets = {
  portraitTwoThree: [
    { id: '12x18', label: '12 x 18', priceInCents: 5500 },
    { id: '16x24', label: '16 x 24', priceInCents: 7900 },
    { id: '24x36', label: '24 x 36', priceInCents: 11900 },
    { id: '30x45', label: '30 x 45', priceInCents: 15900 },
  ],
  landscapeWide: [
    { id: '24x12', label: '24 x 12', priceInCents: 5500 },
    { id: '30x15', label: '30 x 15', priceInCents: 7900 },
    { id: '36x18', label: '36 x 18', priceInCents: 11900 },
    { id: '48x24', label: '48 x 24', priceInCents: 15900 },
  ],
};

function withSizes(product, sizePreset, defaultSizeId) {
  return {
    ...product,
    sizeOptions: sizePresets[sizePreset],
    defaultSizeId,
  };
}

export const products = [
  withSizes(
    {
      id: 'life-has-no-rewind-canvas',
      name: 'Life Has No Rewind',
      description: 'Canvas print from Armoze.',
      imagePath: '/artwork/life-has-no-rewind/life-has-no-rewind-main.jpg',
    },
    'landscapeWide',
    '36x18',
  ),
  withSizes(
    {
      id: 'money-is-energy-canvas',
      name: 'Money Is Energy',
      description: 'Canvas print from Armoze.',
      imagePath: '/artwork/money canvas.png',
    },
    'landscapeWide',
    '36x18',
  ),
  withSizes(
    {
      id: 'keep-going-canvas',
      name: 'Keep Going',
      description: 'Canvas print from Armoze.',
      imagePath: null,
    },
    'portraitTwoThree',
    '24x36',
  ),
  withSizes(
    {
      id: 'bookshelf-canvas',
      name: 'Bookshelf Mindset',
      description: 'Canvas print from Armoze.',
      imagePath: '/artwork/bookshelf/bookshelf test1.png',
    },
    'landscapeWide',
    '36x18',
  ),
  withSizes(
    {
      id: 'paycheck-canvas',
      name: 'Paycheck Energy',
      description: 'Canvas print from Armoze.',
      imagePath: '/artwork/paycheck.png',
    },
    'landscapeWide',
    '36x18',
  ),
  withSizes(
    {
      id: 'stairs-canvas',
      name: 'One Step Higher',
      description: 'Canvas print from Armoze.',
      imagePath: '/artwork/stairs.png',
    },
    'portraitTwoThree',
    '24x36',
  ),
  withSizes(
    {
      id: 'books-of-motivation-canvas',
      name: 'Books of Motivation',
      description: 'Canvas print from Armoze.',
      imagePath: '/artwork/New folder (2)/books of motivation file.png',
    },
    'portraitTwoThree',
    '24x36',
  ),
  withSizes(
    {
      id: 'hello-i-am-canvas',
      name: 'Hello I Am',
      description: 'Canvas print from Armoze.',
      imagePath: '/artwork/hello-i-am/hello i am mockup file.png',
    },
    'landscapeWide',
    '36x18',
  ),
  withSizes(
    {
      id: 'ninety-seven-percent-canvas',
      name: '97 Percent',
      description: 'Canvas print from Armoze.',
      imagePath: '/artwork/97-percent/97 percent file.png',
    },
    'portraitTwoThree',
    '24x36',
  ),
  withSizes(
    {
      id: 'calm-under-pressure-canvas',
      name: 'Calm Under Pressure',
      description: 'Canvas print from Armoze.',
      imagePath: '/artwork/calm-under-pressure/02-gallery.png',
    },
    'landscapeWide',
    '36x18',
  ),
  withSizes(
    {
      id: 'calm-under-pres-canvas',
      name: 'Calm Under Pressure II',
      description: 'Canvas print from Armoze.',
      imagePath: '/artwork/calm under pres.png',
    },
    'landscapeWide',
    '36x18',
  ),
  withSizes(
    {
      id: 'remember-who-you-are-canvas',
      name: 'Remember Who You Are',
      description: 'Canvas print from Armoze.',
      imagePath: '/artwork/remember who u are.png',
    },
    'landscapeWide',
    '36x18',
  ),
];

export function findProduct(productId) {
  return products.find((product) => product.id === productId);
}

export function findSizeOption(product, sizeId) {
  return (
    product.sizeOptions.find((option) => option.id === sizeId) ??
    product.sizeOptions.find((option) => option.id === product.defaultSizeId) ??
    product.sizeOptions[0]
  );
}
