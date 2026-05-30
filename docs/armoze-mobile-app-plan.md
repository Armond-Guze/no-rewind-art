# Armoze Mobile App Plan

This is the working plan for turning Armoze into a mobile motivation app while keeping the existing website, Sanity content, and brand system connected.

## Current State

The repo already has the right shape for this:

```txt
/Users/mondi/code-projects/armoze
  app/                 Next.js storefront routes and API routes
  src/                 storefront React, catalog helpers, SEO, styling
  server/              server-side catalog, Stripe, admin, Sanity readers
  armoze/              Sanity Studio for products and catalog settings
  docs/                project documentation
  apps/mobile/         existing Expo mobile starter
```

`apps/mobile` already exists. It is currently an Expo app with one `App.tsx` prototype, hardcoded daily motivation entries, mood selection, save buttons, and an Armoze-style visual direction. It is not connected to Sanity, Supabase, real notifications, or the storefront yet.

## Direct Answer: Does The Data Carry Over?

Yes, the important data can carry over.

The artwork, product titles, slugs, descriptions, collections, image URLs, aspect ratios, and size presets already live in Sanity as `artworkProduct` documents. The website reads those through the server-side Sanity catalog flow. The mobile app can reuse that same source of truth.

The mobile app should not re-upload artwork or keep its own duplicate product catalog. It should read from the existing Armoze data pipeline.

The best path is:

```txt
Sanity
  artworkProduct
  catalogSettings
  future motivationEntry documents
        ↓
Existing Next/Vercel API
  /api/products
  future /api/mobile/today
  future /api/mobile/artwork
        ↓
Expo mobile app
  Today
  Artwork
  Favorites
  Notifications
  Settings
```

This means one product update in Sanity can affect:

- the website product page
- the sitemap
- the Google feed
- the future app artwork feed
- future notification artwork references

## Worktree vs Folder

When I said we should build it in this project, I meant a folder inside the same repo, not a separate random project.

The folder approach is:

```txt
apps/mobile/
```

That is already present.

A Git worktree is different. A Git worktree is a second checkout of the same repo, usually used when you want to work on another branch in a separate folder. We do not need that for the app unless we want to isolate a big branch later.

For this project, the recommended setup is:

```txt
Same repo, same VS Code project, same Codex workflow
Website:      root app/, src/, server/
Sanity:       armoze/
Mobile app:   apps/mobile/
```

You can keep doing this through VS Code and Codex exactly like the website.

## Product Vision

Armoze should not just be a shop copied into an app. The app should give people a reason to come back every day.

The app's core job:

> Give users daily motivation, visual reminders, and timely nudges that keep Armoze in their routine.

The store remains important, but it should not be the first thing the app feels like. The app should feel like a daily mindset tool that naturally leads people back to the artwork.

## Main Goals

1. Daily return behavior
   - User opens the app for one quote, one reflection, one visual cue, and one simple action.

2. Motivational notifications
   - User chooses what they want reminders for: focus, money, discipline, confidence, calm, creativity.
   - App sends reminders at the user's selected time.

3. Artwork as the visual identity
   - Existing Armoze artwork appears in the daily screen, artwork feed, wallpapers, saved library, and notification campaigns.

4. Save and personalize
   - User can save quotes, artworks, moods, and notification preferences.

5. Soft commerce
   - The app links to the website for buying canvas prints first.
   - In-app checkout can come later only if it becomes worth the extra App Store/payment complexity.

## Recommended Tech Stack

### Mobile App

Use Expo / React Native inside `apps/mobile`.

Why:

- it already exists in the repo
- it works well with VS Code and Codex
- it can preview on your phone with Expo Go
- it supports iOS and Android from one codebase
- it supports notifications, app icons, splash screens, and app-store builds

### Content

Use Sanity.

Existing:

- `artworkProduct`
- `catalogSettings`

Add later:

- `motivationEntry`
- `notificationCampaign`
- `appCollection`
- maybe `wallpaperAsset`

### Users And Saved Data

Use Supabase.

The website already has Supabase auth wiring. The mobile app can use the same Supabase project later so a user account can eventually work across website and app.

Use Supabase for:

- user profiles
- saved quotes
- saved artworks
- notification preferences
- Expo push tokens
- check-in streaks

### Mobile API Layer

Use the existing Next.js app as the mobile API layer.

Instead of putting secret Sanity tokens inside the mobile app, add public server endpoints:

```txt
/api/mobile/today
/api/mobile/artwork
/api/mobile/feed
/api/mobile/notification-content
```

Those API routes can safely read Sanity server-side and return only the mobile data the app needs.

## Why Not Let The App Read Sanity Directly?

The app can technically read public Sanity content directly, but I do not recommend making that the main architecture.

Better:

- keep Sanity tokens on the server
- shape app data from one API
- avoid exposing private dataset access
- keep app versions stable even if Sanity schema changes
- reuse website product normalization rules
- add caching and fallback behavior later

## App Screens

### 1. Today

The first screen.

Content:

- daily quote
- daily artwork or visual card
- short reflection
- one small action
- save button
- share button later
- link to matching artwork if relevant

Goal:

Make the app useful in 10 seconds.

### 2. Moods

User picks what they need today.

Moods:

- Focus
- Ambition
- Discipline
- Confidence
- Calm
- Creativity

Each mood can show:

- quote
- artwork
- short action
- notification option

### 3. Artwork

Mobile version of your artwork catalog.

Content comes from existing Sanity `artworkProduct` documents.

Features:

- featured artworks
- new arrivals
- best sellers
- mood/category filters
- tap artwork for detail
- button to open product on `armoze.com`

### 4. Saved

User's personal library.

Saved items:

- quotes
- reflections
- artworks
- wallpapers

Phase 1 can use local storage. Later we sync to Supabase when accounts are enabled.

### 5. Notifications

User controls reminders.

Settings:

- reminder on/off
- time of day
- selected moods
- frequency
- quiet days
- notification preview

Phase 1 can use scheduled local notifications. Later, server push notifications can announce new drops, campaigns, and smarter personalized reminders.

### 6. Settings

Basic account and brand settings.

Includes:

- sign in
- notification permissions
- privacy links
- support
- app version
- manage saved data

## Notification Strategy

There are two types of notifications.

### Local Scheduled Notifications

Best for MVP.

The app schedules reminders on the phone itself.

Good for:

- daily motivation
- "remind me every morning"
- user-selected reminder time

Pros:

- simpler
- no backend scheduler needed at first
- better for user-controlled habits

Limitations:

- less dynamic
- cannot easily send new drop alerts from the server

### Server Push Notifications

Best for phase 2.

The app stores an Expo push token in Supabase, then a server job sends notifications.

Good for:

- new artwork drops
- special campaigns
- personalized reminders
- win-back messages
- "new print just dropped"

Requirements:

- Expo notifications
- Supabase table for push tokens
- scheduled function or cron job
- notification event logging

## Data Model

### Existing Sanity Product Data

Already useful for mobile:

```txt
artworkProduct
  productId
  slug
  title
  description
  longDescription
  mainImage
  galleryImages
  imageAlt
  tone
  collectionSlugs
  sizePreset
  aspectRatio
  seoTitle
  seoDescription
```

Mobile app usage:

- `title` for artwork cards
- `description` for detail cards
- `mainImage` for visual feed
- `tone` for mood matching
- `collectionSlugs` for filters
- `slug` to open the product page on the website

### New Sanity Type: motivationEntry

Suggested fields:

```txt
motivationEntry
  title
  slug
  quote
  reflection
  action
  mood
  intensity
  linkedArtwork
  notificationText
  shareText
  published
  startsAt
  expiresAt
```

This lets you create app content in Sanity without shipping an app update every time you want new motivation.

### New Sanity Type: notificationCampaign

Suggested fields:

```txt
notificationCampaign
  title
  body
  mood
  linkedArtwork
  sendType
  scheduledAt
  active
```

This is for later when server push notifications are ready.

### Supabase Tables

Future tables:

```txt
profiles
  id
  email
  created_at

saved_items
  id
  user_id
  type
  external_id
  created_at

notification_preferences
  user_id
  enabled
  local_time
  timezone
  moods
  frequency

push_tokens
  id
  user_id
  expo_push_token
  platform
  device_id
  updated_at

daily_checkins
  id
  user_id
  entry_id
  completed_at
```

## Implementation Phases

### Phase 0: Clean Up The Existing Mobile Starter

Goal:

Make `apps/mobile` a clean foundation.

Tasks:

1. Confirm Expo app runs.
2. Add root scripts so we can run it from the main repo:

```json
"mobile:dev": "npm --prefix apps/mobile run start",
"mobile:ios": "npm --prefix apps/mobile run ios",
"mobile:android": "npm --prefix apps/mobile run android"
```

3. Decide whether to keep one `App.tsx` temporarily or move to screen folders.
4. Add an app README.
5. Align app colors with the website brand.

Done when:

- `npm --prefix apps/mobile run start` launches Expo
- the app renders the current prototype
- the repo has clear mobile commands

### Phase 1: Real App Shell

Goal:

Create the real app structure.

Tasks:

1. Add navigation.
2. Create screens:
   - Today
   - Moods
   - Artwork
   - Saved
   - Settings
3. Move hardcoded entries into a data module.
4. Create reusable components:
   - AppHeader
   - DailyCard
   - ArtworkCard
   - MoodPill
   - SaveButton
   - ScreenShell

Done when:

- app navigation works
- screens feel like a real app, not a single demo page

### Phase 2: Connect Existing Artwork

Goal:

Carry over Armoze artwork from Sanity into the app.

Tasks:

1. Add server API route:

```txt
/api/mobile/artwork
```

2. Return mobile-safe product data:

```ts
type MobileArtwork = {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  tone: string;
  collectionSlugs: string[];
  aspectRatio: string;
  productUrl: string;
};
```

3. Fetch that endpoint from the Expo app.
4. Render artwork cards in the Artwork screen.
5. Link product cards to `https://armoze.com/products/[slug]`.

Done when:

- mobile app displays real Sanity artwork
- no artwork is duplicated in the app
- tapping an artwork can open the website product page

### Phase 3: Motivation Content In Sanity

Goal:

Move app motivation from hardcoded TypeScript into Sanity.

Tasks:

1. Add `motivationEntry` schema to Sanity Studio.
2. Add API route:

```txt
/api/mobile/today
```

3. Return today's motivation entry.
4. Support mood-based entries.
5. Optionally link motivation entries to artwork.

Done when:

- new motivation entries can be added in Sanity
- app updates content without app-store release

### Phase 4: Local Saved Items

Goal:

Let users save content on device before account sync exists.

Tasks:

1. Add local storage.
2. Save quotes/artworks.
3. Build Saved screen.
4. Add empty states.

Done when:

- saved items survive app restart

### Phase 5: Local Notifications

Goal:

Users can schedule daily motivational notifications.

Tasks:

1. Add Expo notifications.
2. Request notification permission.
3. Add reminder time setting.
4. Schedule local daily notifications.
5. Let users choose moods.
6. Show a notification preview.

Done when:

- user can turn daily reminders on/off
- selected reminder time persists
- local notifications fire on device builds

### Phase 6: Supabase Accounts And Sync

Goal:

Make saved items and preferences portable across devices.

Tasks:

1. Add Supabase auth to mobile.
2. Reuse or align with existing website auth.
3. Create saved items table.
4. Sync local saves after login.
5. Sync notification preferences.

Done when:

- signed-in users keep saved content across devices

### Phase 7: Server Push Notifications

Goal:

Send dynamic Armoze reminders and drop alerts.

Tasks:

1. Register Expo push tokens.
2. Store push tokens in Supabase.
3. Add server endpoint for sending notifications.
4. Add notification campaign content in Sanity.
5. Add scheduled job for sends.
6. Add unsubscribe/preferences handling.

Done when:

- new artwork/drop alerts can be sent from the server
- user preferences are respected

### Phase 8: Storefront Integration

Goal:

Turn motivation into purchase intent without making the app feel like a hard sell.

Tasks:

1. Add "View Print" buttons.
2. Open product URLs in browser.
3. Add app-specific UTM tracking.
4. Add "Featured print of the day."
5. Add deep links later:

```txt
armoze://artwork/rubber-band-stacks
```

Done when:

- app can send qualified traffic to the website
- analytics can identify mobile app referrals

### Phase 9: App Store Prep

Goal:

Prepare real release builds.

Tasks:

1. Final app icon.
2. Splash screen.
3. App privacy content.
4. Notification permission wording.
5. EAS build config.
6. TestFlight build.
7. Google Play internal testing.
8. App Store screenshots.
9. Store descriptions.

Done when:

- app can be installed outside Expo Go
- app is ready for TestFlight/internal testers

## Suggested Build Order

Do not build everything at once. Build in this order:

1. Clean app shell
2. Real navigation
3. Sanity artwork feed
4. Sanity motivation entries
5. Local saving
6. Local notifications
7. Supabase sync
8. Server pushes
9. App store release

This gets us a useful app quickly while keeping the big technical pieces in a sane order.

## First MVP

The first MVP should include:

- Today screen
- mood selection
- real artwork from Sanity
- local saved items
- daily local notification setting
- links to the website for prints

The first MVP should not include:

- in-app checkout
- complex social features
- AI-generated content in the app
- paid subscription
- full account system unless needed

## Main Risks

### Risk 1: Duplicating Data

Avoid this by making Sanity the source of truth and the Next API the app's content layer.

### Risk 2: Notifications Becoming Annoying

Avoid this by making notifications user-controlled and easy to turn off.

### Risk 3: App Feels Like Just A Store

Avoid this by making Today/Moods/Saved the center of the app, with shopping as a natural next step.

### Risk 4: Building Too Much Before Testing

Avoid this by shipping a small TestFlight/internal version quickly.

## Developer Workflow

Normal website:

```sh
npm run dev
```

Sanity Studio:

```sh
cd armoze
npm run dev
```

Mobile app:

```sh
cd apps/mobile
npm run start
```

Recommended root scripts to add later:

```json
{
  "mobile:dev": "npm --prefix apps/mobile run start",
  "mobile:ios": "npm --prefix apps/mobile run ios",
  "mobile:android": "npm --prefix apps/mobile run android"
}
```

## What Codex Can Do

Codex can help with the whole app:

- scaffold folders
- refactor the existing mobile prototype
- add navigation
- connect Sanity
- write API routes
- add Supabase tables and client code
- add notification permissions and scheduling
- build screens
- run Expo checks
- prepare app store metadata
- create a release checklist

## Decision Summary

Build Armoze Mobile inside the existing repo at `apps/mobile`.

Use Sanity for content and artwork.

Use the existing Next app as the mobile API layer.

Use Supabase later for users, saves, and notification preferences.

Use Expo local notifications for MVP reminders.

Use server push notifications later for campaigns and drops.

Keep commerce on the website first, then consider deeper checkout later only if the app proves people are using it.

