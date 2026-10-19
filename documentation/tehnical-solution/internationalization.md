# Technical Solution Proposal — Internationalization (i18n)

Status: **Proposed, not implemented.** Nothing here has been built or tested on a device.

## 1. Goal

Show the app in the user's device language (with English as the fallback) instead of hard-coded English, and let the user pick the language per app in Android settings.

## 2. What exists today (verified in the code)

- No i18n or locale package is installed (`expo-localization` is not in `package.json`).
- About 45 user-visible strings are English literals, in three shapes:
  - **Constants in the business layer**, shown as-is by the UI: `stores/playerMessages.ts` (5), `library/useAddUrlModal.ts` (3), `library/useSavedUrls.ts` (2).
  - **Constants in presentation files**, such as `HomeScreen`, `PlayerScreen`, `MiniPlayer`, `SavedUrlItem`, `GenreChips`, `GenreSheet`, `SearchBar`, `StatusMessage`, `FilterChips`.
  - **Inline literals**: button and title text in `AddUrlModal`, `GenreSheet`, `PlaylistPanel`, `ComingSoonScreen` usage in `app/(tabs)/*`, tab titles in `app/(tabs)/_layout.tsx`, and accessibility labels (`SearchBar`, `AudioPlayer`, `FloatingPasteButton`, `SavedUrlItem`).
- **Strings with parameters**: `Edit genres of ${title}`, `${label} (${count})`, `${duration} played • ${percent}%`.
- **Duration units** (`1h 5m`, `30s`) are built in `src/shared/utils/formatDuration.ts`.
- Not user-visible text and not translated: genres (user data), titles and URLs from the sources, native exception messages (logged, not shown), the lock-screen metadata (title and artwork only).

## 3. Approach

- **Device language** from `expo-localization` (`getLocales()`); the Expo docs for SDK 58 recommend pairing it with a translation library.
- **Translation library:** `i18n-js` (one dependency, interpolation and plurals, no React binding). The alternative is `i18next` + `react-i18next` (two dependencies, a hook that re-renders on language change). The locale only changes when the user returns from system settings, so a re-render on `AppState` "active" is enough; `i18n-js` is the smaller choice. Confirm the version with `npx expo install` / the docs before installing.
- **The business layer emits message keys, not text.** Today `notice` and `errorMessage` hold English sentences. They become keys (for example `error.resolve`), and presentation turns a key into text when it renders. Reasons: business stays free of the i18n library and the locale (it may not import `expo-*`), and a notice already on screen follows a language change. `clearNoticeIfShowing(message)` keeps working because it compares keys.
- **Translations are typed TypeScript objects**, not JSON: `en.ts` defines the keys, other languages are `Record<MessageKey, string>`, so a missing key is a compile error. Plain `.ts` also lets a Node test import them.

## 4. Where each piece goes (three layers)

| Layer | File | Change |
|---|---|---|
| Business | `src/business/messages.ts` (new) | `MessageKey` type and the key constants for notices and errors, replacing the English strings in `playerMessages.ts`, `useAddUrlModal.ts`, `useSavedUrls.ts`. State fields that hold them (`notice`, `errorMessage`) hold keys. |
| Presentation | `src/presentation/i18n/index.ts` (new) | Creates the `i18n-js` instance, sets the locale from `getLocales()`, English fallback, exports `useT()`. Re-reads the locale when the app returns to the foreground. |
| Presentation | `src/presentation/i18n/locales/en.ts`, `<lang>.ts` (new) | The strings, including interpolated ones (`{{title}}`) and plurals. |
| Presentation | components and screens listed in §2 | Literals and constants replaced by `t('key')`; keys from business translated at render. |
| Presentation | `src/app/(tabs)/_layout.tsx` | Tab titles through `t()`. |
| Shared | `src/shared/utils/formatDuration.ts` | See decision 3 in §7. |
| Config | `package.json`, `app.json` | `npx expo install expo-localization` (+ `i18n-js`); plugin entry `["expo-localization", { "supportedLocales": [...] }]` for the Android per-app language setting. |

`expo-localization` is imported in presentation only. The lint rules allow it (they forbid `expo-*` in business, and only a short list of storage/audio/clipboard/notification packages in presentation); no lint change.

## 5. Phases (one reviewable chunk each, stop after each)

1. **Infrastructure, no visible change.** Install the packages, add the plugin entry, create `presentation/i18n/` with `en.ts` holding a handful of keys, and a **key-parity test** that fails if any locale file lacks a key present in `en.ts`. Done when: lint, `tsc` and `npm test` pass. Needs a new development build for the native module.
2. **Business emits keys.** Add `business/messages.ts`; change `playerMessages`, `useAddUrlModal`, `useSavedUrls` and the `notice` / `errorMessage` state to keys; update the existing tests that compare messages. Presentation translates keys where it renders them. Done when: lint, `tsc` and `npm test` pass and the app still shows the same English text.
3. **Presentation strings.** Move every literal, constant and accessibility label to `en.ts` and `t()`, including the parameterized ones and the tab titles. Done when: no user-visible English literal is left in `src/presentation` and `src/app` (a grep for quoted text in JSX and `*_LABEL` / `*_MESSAGE` constants), lint, `tsc` and `npm test` pass.
4. **Second language and docs.** Add the first non-English file, set `supportedLocales`, try it on a device (change the device language and the per-app language), then update `PRD.md`, `README.md` (features list, remove the TODO) and this file's status.

## 6. Risks and unknowns (none checked on a device)

- **Native rebuild:** adding `expo-localization` and its plugin options needs a new development build, not a JS reload.
- **Plurals and word order** differ by language; the parameterized strings must be whole sentences with placeholders, never concatenated pieces.
- **Text length:** longer translations may overflow the chips, tabs and buttons; this needs a visual check per language.
- **RTL languages** (Arabic, Hebrew): `supportsRTL` defaults to true, so the layout mirrors, but the styles have not been checked for left/right assumptions. Not needed unless an RTL language is added.
- **`Intl` on Hermes (Android)** for number and duration formatting has not been checked, so this plan does not rely on it.
- **App name under the launcher icon** is not covered; per-language app names need an extra `locales` entry in `app.json` and are left out.
- **Interaction with the video plan:** if video playback is built first, its new strings (Watch video, its errors) must be added as keys from the start. Doing i18n first is cheaper.

## 7. Decisions

You left the open questions to me, so these are the defaults taken. Overrule any of them before Phase 1.

1. **Languages:** English only for Phases 1 to 3 (the pipeline and all strings). Phase 4 adds the first other language **once you name one and provide or approve the translation**; I did not guess one.
2. **Library:** `i18n-js` (smallest; the locale only changes when the user returns from system settings).
3. **Duration units:** left untranslated in this version (`h`, `m`, `s` stay in `formatDuration`); revisit when a language needs it.
4. **Per-app language in Android settings:** included (`supportedLocales`), since the native rebuild is needed anyway.

The original questions, for reference:

1. **Which languages?** The plan builds the pipeline with English plus one more language to prove it. Tell me which languages, and who provides the translations.
2. **Library:** `i18n-js` (recommended) or `i18next` + `react-i18next`.
3. **Duration units** (`h`, `m`, `s` in `formatDuration`): leave them as they are in this version (simplest, but not translated), or move the unit text into the locale files by having `formatDuration` take the unit labels (a small change to the shared helper and its tests).
4. **Per-app language in Android settings:** include `supportedLocales` (recommended, adds the native rebuild you need anyway) or follow only the device language.

Docs checked: `expo-localization` for SDK 58 (`getLocales`, config plugin options, per-app language on Android). `i18n-js` itself has not been looked up yet.
