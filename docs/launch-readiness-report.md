# Armoze Launch Readiness Report

Generated: 2026-06-21T04:36:18.347Z

## Executive Summary

- Published products: 36
- Launch target: 20 products
- Products passing hard launch checks: 36
- Products with blockers: 0
- Products with warnings: 1
- Merchant feed items: 180
- Sitemap product URLs: 36

## Launch Gate

- Product count is launchable: 36 published products.
- Content gate is launchable: at least 20 products pass hard checks.
- Merchant feed has the core required item fields and production URLs.

## 20-Product Sprint Shortlist

| Product | Slug | Images | Status | Needs |
| --- | --- | ---: | --- | --- |
| Invest In Yourself | invest-in-yourself | 11 | Ready | Ready |
| Money Band Aid | money-band-aid | 11 | Ready | Ready |
| Orange Rubberband Racks | orange-rubberband-racks | 11 | Ready | Ready |
| 100 Dollars White Marble | 100-dollars-white-marble | 10 | Ready | Ready |
| Money Over Everything | money-over-everything | 10 | Ready | Ready |
| No Risk No Reward Lambo | no-risk-no-reward-lambo | 10 | Ready | Ready |
| Play Again Cassette | play-again-cassette | 10 | Ready | Ready |
| Reportcard | reportcard | 10 | Ready | Ready |
| When Words Fail Music Speaks | when-words-fail-music-speaks | 10 | Ready | Ready |
| Bookshelf Mindset | bookshelf | 9 | Ready | Ready |
| Count Your Money | count-your-money | 9 | Ready | Ready |
| Go All In | go-all-in | 9 | Ready | Ready |
| Life Has No Rewind | life-has-no-rewind | 9 | Ready | Ready |
| Mindset Is Everything | mindset-is-everything | 9 | Ready | Ready |
| Paycheck Energy | paycheck | 9 | Ready | Ready |
| Remember Your Why | remember-your-why | 9 | Ready | Ready |
| Rubber Band Stacks | rubber-band-stacks | 9 | Ready | Ready |
| Start Over Again | start-over-again | 9 | Ready | Ready |
| Success Envelope | success-envelope | 9 | Ready | Ready |
| Books of Motivation | books-of-motivation | 8 | Ready | Ready |

## Product Blockers

No hard product blockers found.

## Collection Coverage

| Collection | Products |
| --- | ---: |
| Best Sellers | 16 |
| Money & Ambition | 12 |
| Discipline & Focus | 22 |
| Study & Creative | 2 |
| New Arrivals | 20 |

## Google And SEO Outputs

- Sitemap status: OK
- Sitemap collections: 5
- Sitemap products: 36
- Merchant feed status: OK
- Merchant feed expected item count: 180
- Merchant feed actual item count: 180
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
| Owner email alerts | set | needed for order notifications |
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
