# Armoze Launch Readiness Report

Generated: 2026-06-07T17:58:26.028Z

## Executive Summary

- Published products: 26
- Launch target: 20 products
- Products passing hard launch checks: 15
- Products with blockers: 11
- Products with warnings: 12
- Merchant feed items: 130
- Sitemap product URLs: 26

## Launch Gate

- Product count is launchable: 26 published products.
- Content work remains: 15 products pass hard checks, so choose/fix 5 more before calling the 20-product launch complete.
- Merchant feed has the core required item fields and production URLs.

## 20-Product Sprint Shortlist

| Product | Slug | Images | Status | Needs |
| --- | --- | ---: | --- | --- |
| Bookshelf Mindset | bookshelf | 7 | Ready | Ready |
| Invest In Yourself | invest-in-yourself | 7 | Ready | Ready |
| Life Has No Rewind | life-has-no-rewind | 7 | Ready | Ready |
| Money Band Aid | money-band-aid | 7 | Ready | Ready |
| Orange Rubberband Racks | orange-rubberband-racks | 7 | Ready | Ready |
| Paycheck Energy | paycheck | 7 | Ready | Ready |
| Reminder: Life Has No Rewind | reminder-life-has-no-rewind | 7 | Ready | Ready |
| Books of Motivation | books-of-motivation | 6 | Ready | Ready |
| Play Again Casette | play-again-casette | 6 | Ready | Ready |
| Reportcard | reportcard | 6 | Ready | Ready |
| When Words Fail Music Speaks | when-words-fail-music-speaks | 6 | Ready | Ready |
| Never Lose Sight Of Your Dreams | never-lose-sight-of-your-dreams | 5 | Ready | aim for 6 total images |
| Rubber Band Stacks | rubber-band-stacks | 5 | Ready | aim for 6 total images |
| Success Envelope | success-envelope | 5 | Ready | aim for 6 total images |
| Money Vault | money-vault | 4 | Ready | aim for 6 total images |
| Money Over Everything | money-over-everything | 3 | Fix | only 3 product image(s) |
| Keep Going | keep-going | 1 | Fix | only 1 product image(s) |
| No Risk No Reward Lambo | no-risk-no-reward-lambo | 1 | Fix | only 1 product image(s) |
| Hello I Am | hello-i-am | 3 | Fix | only 3 product image(s); main image is 1437x1095 |
| 100 Dollars White Marble | 100-dollars-white-marble | 1 | Fix | only 1 product image(s); main image is 1774x887 |

## Product Blockers

| Product | Main Issues |
| --- | --- |
| Keep Going | only 1 product image(s) |
| Hello I Am | only 3 product image(s) |
| Remember Who You Are | only 1 product image(s) |
| 100 Dollars White Marble | only 1 product image(s) |
| Daily Reminder | only 1 product image(s) |
| Money Band Clip | only 1 product image(s) |
| Money Over Everything | only 3 product image(s) |
| No Risk No Reward Lambo | only 1 product image(s) |
| Rent Due | only 1 product image(s) |
| Success Is Earned | only 1 product image(s) |
| You Cant Turn Back The Clock | only 1 product image(s) |

## Collection Coverage

| Collection | Products |
| --- | ---: |
| Best Sellers | 12 |
| Money & Ambition | 10 |
| Discipline & Focus | 13 |
| Study & Creative | 2 |
| New Arrivals | 14 |

## Google And SEO Outputs

- Sitemap status: OK
- Sitemap collections: 5
- Sitemap products: 26
- Merchant feed status: OK
- Merchant feed expected item count: 130
- Merchant feed actual item count: 130
- Checkout link template present: yes
- Free shipping field present: yes

## Automation And Account Setup

| Area | Status | Why It Matters |
| --- | --- | --- |
| Sanity catalog | set | enabled |
| Sanity read token | set | needed for private dataset reads |
| Stripe secret | set | needed for real checkout |
| Stripe webhook secret | set | needed to mark paid orders |
| Persistent orders DB | set | needed on Vercel so orders persist |
| Owner email alerts | missing | needed for order notifications |
| Public client URL | set | should be https://armoze.com in production |

Code currently supports Stripe checkout, Stripe webhook order capture, persistent order storage when a production database is configured, an admin order dashboard, and owner order emails when Resend is configured. It does not yet show an automatic print supplier order submission integration, so production/fulfillment still needs an operator step or a supplier API phase.

## Seven-Day Launch Path

1. Day 1: Pick the 20-product launch set, fix every Product Blocker above, and remove all placeholder/testing copy.
2. Day 2: Finish product images. Each launch product should have a clean main image, 4 to 6 supporting mockups, and accurate alt text.
3. Day 3: Run checkout end to end in Stripe test mode, verify webhook order capture, owner email alerts, and admin order status changes.
4. Day 4: Switch production secrets on Vercel, submit the sitemap in Search Console, and submit the Merchant feed in Google Merchant Center.
5. Day 5: Place one real small live order, verify payment, order storage, email notification, fulfillment workflow, and customer confirmation path.
6. Day 6: Publish launch offer messaging, post the best 5 products to social, and send direct warm outreach with product links.
7. Day 7: Review Search Console/Merchant warnings, fix anything rejected, and push traffic to the 3 strongest products.
