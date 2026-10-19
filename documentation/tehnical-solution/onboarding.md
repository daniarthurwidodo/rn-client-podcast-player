# Technical Solution Proposal — Onboarding Screen

Status: **Proposed, not implemented.** Nothing here has been built or tested on a device.

## 1. Goal

On the first launch, show a short swipeable introduction (what the app does and how to start) before Home, once. After that the app opens straight on Home as today. The content comes from [../walkthrough.md](../walkthrough.md).

## 2. What exists today (verified in the code)

- `src/app/_layout.tsx` keeps the splash screen up until the fonts are loaded, then renders a `Stack` with `(tabs)` and `player`. Route files only re-export a screen from `src/presentation/screens/`.
- Settings live in AsyncStorage through one repository per key in `src/data/storage/` (`saved-urls`, `playback-progress`, `resolved-audio`), each with a parser for the stored value.
- First launch looks like an update: an empty Home saying "Tap Paste URL to add a link". Nothing remembers that the app was opened before.
- Available without a new dependency: `FlatList` (paging), `lucide-react-native` icons, the theme tokens, `react-native-safe-area-context`, `expo-router`.

## 3. The screens

Three slides, a Skip button on all of them and a Next button; the last slide's button reads Get started. Page dots show where you are. Icons come from `lucide-react-native`, so there are no image assets to produce.

| # | Title (draft copy) | Says |
|---|---|---|
| 1 | Paste a link, get audio | Copy a link to a talk or podcast, tap **Paste URL**, and the app finds the audio. Currently YouTube. |
| 2 | Listen your way | Keeps playing with the screen off, lock-screen controls, remembers where you stopped, speed control. |
| 3 | Organise with genres | Tag items with genres; tapping an item queues the others that share one. Search and filter the library. |

The copy is a draft and goes through the internationalization keys when that plan is built. The notification permission is **not** asked here: it stays where it is, after the first playback starts.

## 4. Approach

- **Remember it with one stored flag**, `onboarding-done`, in AsyncStorage, through a new repository like the existing ones (with a parser that accepts only a boolean, anything else counts as "not done").
- **Existing users skip it.** An update must not show an introduction to someone who already has a library. The rule is a small pure function: show the onboarding only if the flag is not set **and** there are no saved URLs. It is unit-tested.
- **Never block the app on storage.** If reading the flag fails, treat it as done and go to Home. If saving it fails, continue anyway (the screen may show again next launch); the failure is logged once at the boundary, not shown.
- **Routing with Expo Router's protected routes.** The root layout wraps `(tabs)` and `player` in `Stack.Protected guard={status === 'done'}` and declares `onboarding` in a guard of `status === 'needed'`. When `complete()` flips the status, the router moves to the first unprotected screen by itself. The Expo docs for SDK 58 describe this; they do not say how to handle a guard value that is not known yet, so the layout keeps the splash screen up until the status is known (the same way it already waits for fonts), which avoids a flash of Home before the onboarding.
- **Paging with a horizontal `FlatList` (`pagingEnabled`).** The current page is local UI state in the screen; nothing else needs it.
- **No replay in this version** (decision 2). Clearing the app's data shows it again, which is also how to test it.

## 5. Where each piece goes (three layers)

| Layer | File | Change |
|---|---|---|
| Data | `src/data/storage/onboardingRepository.ts` (new) | `loadOnboardingDone()` / `saveOnboardingDone()`, key `onboarding-done`. |
| Data | `src/data/storage/parsers.ts` | `parseOnboardingDone(raw)`: boolean or false. (+ test in `parsers.test.ts`) |
| Business | `src/business/onboarding/shouldShowOnboarding.ts` (new, + test) | The pure rule: not done and no saved URLs. |
| Business | `src/business/onboarding/useOnboarding.ts` (new) | Loads the flag and the saved URLs once, exposes `status` (`loading` / `needed` / `done`) and `complete()` (saves the flag, then sets `done`). Applies the "never block" rules. |
| Presentation | `src/presentation/screens/OnboardingScreen.tsx` (new) | The pager, Skip, Next / Get started, the dots; calls `complete()`. |
| Presentation | `src/presentation/components/OnboardingSlide.tsx`, `PageDots.tsx` (new) | One slide, and the dots. |
| App | `src/app/onboarding.tsx` (new) | One-line re-export of the screen. |
| App | `src/app/_layout.tsx` | `Stack.Protected` guards; keep the splash up until fonts **and** the status are known. |

No new package and no native change, so no new development build: a JS reload is enough.

## 6. Phases (one reviewable chunk each, stop after each)

1. **Data and business, no UI.** Repository, parser, `shouldShowOnboarding`, `useOnboarding`. Done when: lint, `tsc` and `npm test` pass, with new tests for the parser and the rule (flag set, empty library, library with items, flag unreadable).
2. **Routing.** `onboarding` route, the guards, the splash handling, with a placeholder screen. Done when: on a fresh install the placeholder shows, after `complete()` Home shows, and a restart goes straight to Home, with no flash of Home on first launch. Checked by hand on a device or emulator.
3. **The screen.** Pager, slides, dots, Skip / Next / Get started, accessibility labels. Done when: lint, `tsc` and `npm test` pass and each step works on a device with a fresh install, including the Android back button (it should go back one page and leave the app from the first page).
4. **Docs.** A requirement row in `PRD.md`, the `README.md` features list, the first-launch part of `walkthrough.md`, and the README TODO.

## 7. Risks and unknowns (none checked on a device)

- **Guard timing:** protected routes depend on a value that loads asynchronously. If the splash is released too early, Home flashes before the onboarding; Phase 2 exists to catch this.
- **Deep links and the initial route:** a link that opens `player` on first launch is redirected away by the guard. Probably fine, but untested.
- **Swiping vs. system gestures** on Android: a horizontal pager next to the back gesture on gesture-navigation phones needs a check.
- **Text length** in other languages may overflow a slide; part of the i18n visual check.
- **Misdetecting existing users:** someone who deleted their whole library before updating would see the onboarding once. Acceptable.
- **A required screen costs a tap** for every new user; hence Skip on every slide.

## 8. Decisions

You left the open questions to me, so these are the defaults taken. Overrule any of them.

1. **Content and length:** three slides and Skip, as in §3.
2. **Replay:** none in this version (the app has no Settings screen). A "How it works" link on the empty Home could be added later.
3. **Existing users:** skip the onboarding for anyone who already has saved URLs.
4. **Illustrations:** icons only, no images.
5. **Notification permission:** unchanged, asked after the first playback.
