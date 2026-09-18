# MULTI20 activation

Private offer: 20% off the full catalog (including frames), minimum two units in
one order, one shipping address. Two copies of the same product qualify. The code
replaces any welcome code; discounts do not stack. No expiration or per-customer
limit is imposed.

## Activate in this order

1. Deploy the storefront changes to the production website through its normal
   deployment workflow. The root `npm run deploy` deploys Sanity Studio, not the
   storefront, so do not use it to publish this change.
2. In Stripe live mode, create a coupon named `Multi-item 20%` with **20% off**,
   duration **Once**, applying to **all products**. Create its customer-facing
   promotion code **MULTI20**. Do not add a first-order-only restriction, minimum
   dollar amount, or product restriction. Repeat in test mode for test checkouts.
3. Verify a one-item cart rejects MULTI20, two items accept it, and removing an
   item invalidates it. Try framed and unframed items. With two $84.99 items,
   the discount should be $34.00 and the subtotal after discount $135.98.
4. Continue to Stripe Checkout and confirm the discount and single shipping
   address. A payment is not needed to inspect the checkout. Check FIRST15 still
   works when entered in the cart and is replaced when MULTI20 is applied.
5. Share MULTI20 privately with customers. Tell them to add both items to their
   bag, open Discount (or the discount field on the cart page), enter the code,
   and then continue to checkout.

## Enforcement

Stripe's promotion-code settings do not enforce our item-count rule. The server
checks quantity both for cart previews and new checkout sessions. Direct code
entry is disabled on Stripe Checkout and recovery sessions so customers cannot
bypass that check. Checkout fixes the validated quantities and collects one
shipping address. Keep this code exclusive to the storefront; other Stripe
payment links or integrations would need the same quantity validation.

Previously created Checkout sessions can retain their older promotion-entry
settings until they expire. Wait for those sessions/recovery links to expire
or expire them before activating the code if strict enforcement is required
immediately. New sessions use the updated rules.

Local implementation alone does not activate the offer: the deployed code and
the matching live Stripe promotion are both required.
