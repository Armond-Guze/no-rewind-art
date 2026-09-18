# MULTI20 activation

Private offer: 20% off the full catalog (including frames), intended for two or
more units in one order, one shipping address. Two copies of the same product qualify. The code
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
   Also start a new checkout without a cart discount and verify the Stripe
   promotion-code entry accepts FIRST15 and MULTI20 (one at a time).
5. Share MULTI20 privately with customers. Tell them to add both items to their
   bag, open Discount (or the discount field on the cart page), enter the code,
   and then continue to checkout. Customers can alternatively enter the code
   directly on Stripe Checkout when no discount was already applied in the cart.

## Enforcement

Stripe's promotion-code settings do not enforce our item-count rule. The server
checks quantity for codes submitted through the cart and checkout API. At the
owner's request, direct code entry is enabled on Stripe Checkout and recovery
sessions. Codes entered there use Stripe's restrictions: MULTI20 can therefore
apply to one item. This is an accepted tradeoff for privately sharing the code.
Checkout collects one shipping address. If a cart discount is already applied,
the session uses that discount instead of offering Stripe's code-entry box;
return to the cart to remove or replace it.

Previously created Checkout sessions retain their older promotion-entry
settings. After deployment, return to the cart and begin a new checkout to see
the code-entry option.

Local implementation alone does not activate the offer: the deployed code and
the matching live Stripe promotion are both required.
