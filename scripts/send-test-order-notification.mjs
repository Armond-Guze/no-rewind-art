import 'dotenv/config';
import { sendOwnerOrderNotification, sendOwnerOrderPush } from '../server/notifications.js';

const order = {
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
      frameLabel: 'Black Frame',
      lineTotal: 7500,
    },
  ],
};

const emailResult = await sendOwnerOrderNotification(order);
const pushResult = await sendOwnerOrderPush(order);

let failed = false;

if (emailResult.sent) {
  console.log(`Sent test order email${emailResult.id ? ` (${emailResult.id})` : ''}.`);
} else if (emailResult.skipped) {
  console.log(`Email skipped: ${emailResult.reason}`);
} else {
  console.error(`Email failed: ${emailResult.reason || 'Notification was not sent.'}`);
  failed = true;
}

if (pushResult.sent) {
  console.log(`Sent test order push${pushResult.id ? ` (${pushResult.id})` : ''}.`);
} else if (pushResult.skipped) {
  console.log(`Push skipped: ${pushResult.reason}`);
} else {
  console.error(`Push failed: ${pushResult.reason || 'Push was not sent.'}`);
  failed = true;
}

if (failed) {
  process.exit(1);
}
