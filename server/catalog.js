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
];

export function findProduct(productId) {
  return products.find((product) => product.id === productId);
}
