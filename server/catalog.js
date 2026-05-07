export const products = [
  {
    id: 'life-has-no-rewind-canvas',
    name: 'Life Has No Rewind',
    description: 'Canvas print from No Rewind Art.',
    unitAmount: 5500,
    imagePath: '/artwork/life.png',
  },
  {
    id: 'money-is-energy-canvas',
    name: 'Money Is Energy',
    description: 'Canvas print from No Rewind Art.',
    unitAmount: 5500,
    imagePath: '/artwork/money canvas.png',
  },
  {
    id: 'keep-going-canvas',
    name: 'Keep Going',
    description: 'Canvas print from No Rewind Art.',
    unitAmount: 5500,
    imagePath: null,
  },
  {
    id: 'bookshelf-canvas',
    name: 'Bookshelf Mindset',
    description: 'Canvas print from No Rewind Art.',
    unitAmount: 5500,
    imagePath: '/artwork/bookshelf.png',
  },
  {
    id: 'paycheck-canvas',
    name: 'Paycheck Energy',
    description: 'Canvas print from No Rewind Art.',
    unitAmount: 5500,
    imagePath: '/artwork/paycheck.png',
  },
  {
    id: 'stairs-canvas',
    name: 'One Step Higher',
    description: 'Canvas print from No Rewind Art.',
    unitAmount: 5500,
    imagePath: '/artwork/stairs.png',
  },
  {
    id: 'books-of-motivation-canvas',
    name: 'Books of Motivation',
    description: 'Canvas print from No Rewind Art.',
    unitAmount: 5500,
    imagePath: '/artwork/books of motivation.png',
  },
  {
    id: 'hello-i-am-canvas',
    name: 'Hello I Am',
    description: 'Canvas print from No Rewind Art.',
    unitAmount: 5500,
    imagePath: '/artwork/hello i am.png',
  },
];

export function findProduct(productId) {
  return products.find((product) => product.id === productId);
}
