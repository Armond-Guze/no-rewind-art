import 'dotenv/config';
import { sendOwnerOrderNotification } from '../server/notifications.js';

const result = await sendOwnerOrderNotification({
  id: `test_${Date.now().toString(36)}`,
  customerName: 'Test Customer',
  customerEmail: 'test@example.com',
  currency: 'usd',
  amountTotal: 7500,
  items: [
    {
      quantity: 1,
      title: 'Life Has No Rewind',
      sizeLabel: '20 x 10',
      lineTotal: 7500,
    },
  ],
});

if (!result.sent) {
  console.error(result.reason || 'Notification was not sent.');
  process.exit(1);
}

console.log(`Sent test order notification${result.id ? ` (${result.id})` : ''}.`);
