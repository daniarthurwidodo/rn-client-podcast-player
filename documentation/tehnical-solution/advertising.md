# Technical Solution Proposal — Advertising (AdMob banner)

Status: **Proposed, not implemented.** Nothing here has been built or tested on a device. Read §2 first: there is a policy question to settle before any code.

## 1. Goal

Show a small, non-intrusive ad to earn something from the app, without interrupting playback and without breaking the three-layer rules.

## 2. Gate: settle this before building anything

The app plays audio that it extracts from YouTube and similar sites with NewPipe Extractor. That has consequences for ads, none of which I could confirm from Google's own policy text (my search returned only secondary sources):

- NewPipe's project says that putting NewPipe or a fork into the Google Play Store violates the store's terms; a blog says the same of NewPipe's approach (reading YouTube's pages instead of using its API). YouTube is also reported to be acting against third-party apps that break its terms. These are secondary sources, not a Google statement.
- AdMob accounts are subject to Google's own program policies. **Earning ad revenue from an app built on extracting content from YouTube may get the AdMob account suspended, and may expose you legally.** I did not find the AdMob policy sentence that decides this either way; it must be read at the source (AdMob program policies and the YouTube API / Terms of Service) before any money or account is tied to the app.
- The app is currently distributed as a sideloaded APK (`npm run build:apk`, debug signing). Whether AdMob will serve real ads to an app that is not in a store listing is not confirmed.

If that check fails, the alternatives with less exposure are: no monetization, donations, or a paid unlock (Expo has a guide on in-app purchases, `docs.expo.dev/guides/in-app-purchases`), each of which is a different plan.

## 3. What exists today (verified in the code)

- No ad, analytics or consent package is installed (`package.json`).
- Home (`HomeScreen`) shows the search bar, filter chips and the saved list; the player controls live on the Player screen and the MiniPlayer.
- Native code is in `modules/` and `app.json` plugins; the app is Android only, and Expo Go is already not usable.
- Lint: business may not import `react-native*` or `expo-*`; presentation may not import only a short list of storage/audio/clipboard/notification packages, so an ad component is allowed in presentation. Device access belongs in `src/data`.

## 4. Approach

- **Library:** `react-native-google-mobile-ads` (Invertase), which serves AdMob / Ad Manager ads. Its docs give an Expo path: `npx expo install react-native-google-mobile-ads`, a config plugin entry with `androidAppId` (and `iosAppId`, not needed here), and a **development build**; it is not supported in Expo Go. The minimum Expo SDK / React Native versions were not on the pages I read, so Phase 1 checks that it supports SDK 58 / React Native 0.88 before installing.
- **Format: one anchored banner, on Home only.** No interstitial, app-open or rewarded ads: they are full-screen, would cut into listening, and do not fit background playback. No ad on the Player screen.
- **Consent first.** AdMob does not handle consent for you; users in the EEA, UK and Switzerland must consent, using Google's User Messaging Platform (UMP) through the library's `AdsConsent.gatherConsent()`, which returns `canRequestAds`. The order is fixed: gather consent, and only if `canRequestAds` is true call `mobileAds().initialize()`. The consent form text is supplied and localized by Google; the message itself is set up in the AdMob console.
- **Test ads during development** with the library's `TestIds.BANNER`; real ad unit IDs are never used in development (it can get the account disabled).
- **Config, not code:** the ad unit ID and the AdMob App ID come from configuration (environment variable at build time), not hardcoded, and are not committed.

## 5. Where each piece goes (three layers)

| Layer | File | Change |
|---|---|---|
| Data | `src/data/device/ads.ts` (new) | `initializeAds()`: gather consent, and initialize the SDK only when `canRequestAds` is true; returns whether ads can be shown. Failures are caught and reported as "no ads", never thrown into the UI. |
| Data | `src/data/ports.ts` | An `AdsPort` type for it (an I/O boundary, so a fake can be injected in tests). |
| Business | `src/business/ads/useAds.ts` (new) | Runs `initializeAds` once after Home has rendered; exposes `canShowAds`. Pure state; no SDK import. |
| Presentation | `src/presentation/components/AdBanner.tsx` (new) | `BannerAd` with the unit ID (`TestIds.BANNER` in development), rendered only when `canShowAds` is true; renders nothing otherwise, so the list does not jump. |
| Presentation | `HomeScreen.tsx` | Place `AdBanner` below the list, above the tab bar. |
| Config | `package.json`, `app.json` | Install the package; plugin entry with `androidAppId` from configuration. New development build. |

## 6. Phases (one reviewable chunk each, stop after each)

0. **Decision gate (you, not code).** Confirm §2: read the AdMob program policies and the YouTube terms, decide whether to go ahead, create the AdMob account and app, and write the consent message in the AdMob console. Nothing else starts before this.
1. **Data and business, test ads only.** Install the package, plugin with a test App ID, `ads.ts`, `AdsPort`, `useAds`. Done when: lint, `tsc` and `npm test` pass and `useAds` is tested with a fake port (consent denied, consent granted, initialization throws). Needs a new development build.
2. **Banner on Home.** `AdBanner` and the placement. Done when: a "Test Ad" label shows on a device, nothing shows when consent is denied, and playback is not interrupted.
3. **Production setup.** Real unit and App IDs through configuration; test the consent form for a user in the EEA (UMP has a debug setting for this); give the user a way to reopen the consent choices from the app (UMP requires one where consent applies; the exact library call is *unverified*, check in Phase 1). Check Play / AdMob requirements such as a privacy policy.
4. **Docs.** `PRD.md`, `README.md` (and its TODO), this file's status.

## 7. Risks and unknowns (none checked on a device)

- **Policy and legal risk (§2):** the largest one, and a business decision, not a technical one.
- **Privacy:** ads collect device data; the app currently has no backend and says nothing about data collection. The README, the store listing (if any) and a privacy policy would need to say so.
- **Layout and performance:** the banner takes screen height on small phones, and the ad SDK adds app size and startup work (not measured). Initialization is deferred until after Home renders.
- **Fill and revenue:** a niche, ad-light audio app on a sideloaded APK may earn very little; the effort may not pay off.
- **Offline use:** no ad shows offline, which is fine, but the space must not collapse awkwardly.
- **Native change** → new development build; Android only.
- **Interaction with other plans:** the consent button and any ad-related messages need keys in the internationalization plan; the video and media-handler plans put no ads on the Player screen.

## 8. Decisions

You asked for a suggested implementation, so these are the defaults taken. Overrule any of them.

1. **Format and place:** one anchored banner on Home only; no full-screen ads.
2. **Provider:** AdMob through `react-native-google-mobile-ads`.
3. **Consent:** UMP, always before initialization.
4. **Not yet decided, and only you can answer:** whether to proceed after the §2 check, and whether you would rather use donations or a paid unlock.

Docs read: `react-native-google-mobile-ads` pages on Expo installation, consent basics and the first ad (docs.page/invertase/react-native-google-mobile-ads). Expo's own docs have no ads page.
