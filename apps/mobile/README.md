# Armoze Mobile

Expo app for the Armoze motivation experience.

The app lives in this folder on purpose:

```txt
/Users/mondi/code-projects/armoze/apps/mobile
```

The website stays in the root `app/`, `src/`, and `server/` folders. Sanity Studio stays in `armoze/`.

## Start The App

From the repo root:

```sh
npm run mobile:dev
```

Or from this folder:

```sh
npm run start
```

Then use Expo Go or an iOS/Android simulator.

## Local API

The app should read mobile-ready content from the website API, not directly from Sanity.

For local development, copy `.env.example` to `.env`:

```sh
cp apps/mobile/.env.example apps/mobile/.env
```

If testing on a real phone, replace `127.0.0.1` with your computer's local network IP address because a phone cannot reach your Mac's localhost directly.

```txt
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:3000
```

Production can use:

```txt
EXPO_PUBLIC_API_BASE_URL=https://armoze.com
```

## Existing Content Bridge

The first mobile bridge endpoint is:

```txt
/api/mobile/artwork
```

It returns artwork from the same Sanity-backed catalog the storefront uses.

## Next Build Step

The next real implementation phase is to refactor `App.tsx` into:

```txt
src/
  api/
  components/
  data/
  screens/
  theme/
  types/
```

Then connect the Artwork screen to `fetchMobileArtwork()`.

