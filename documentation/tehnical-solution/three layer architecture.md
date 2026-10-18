# Technical Solution Proposal — Three-Layer Architecture Refactor

Status: **Approved; decisions made (§10). Phase 1 (data layer) built, Phases 2–5 pending.** Everything lives under `src/` (decision 1 changed from my recommendation).

## 1. Goal

Reorganise the code into three layers with a strict one-way dependency:

```
presentation  →  business (includes hooks)  →  data
```

- **Data layer:** everything that touches the outside world or storage: AsyncStorage, the audio player, the clipboard, notifications permission, the native modules (NewPipe resolver, audio effects), and the shapes of stored data (parse/validate/map).
- **Business layer (including hooks):** rules and state: genres, queue and shuffle, progress states, the resolve cache policy, notice timers, the player store, and the React hooks that combine them (`useSavedUrls`, `useLibraryView`, …). No rendering, no device APIs.
- **Presentation layer:** screens, components, theme, display formatting. No storage, no device APIs, no rules.

A layer may only import from the layer(s) below it. This is enforced by lint, not by convention (§6).

This is a **move-and-tighten refactor, not a rewrite.** Behaviour must not change; the one place it could is called out in §5.1.

## 2. Where the code is today (verified from the imports)

| Folder | What it actually holds | Problem |
|---|---|---|
| `lib/` | Mixed bag of all three layers: pure rules (`genres`, `queue`, `playbackProgress`), storage (`*Storage.ts`), wiring (`resolveAudio.ts`), formatting (`formatTime`…), and `theme.ts` | A folder name that says nothing about layers |
| `stores/` | `createPlayerStore.ts` (398 lines of business logic) next to `playerStore.ts` (device wiring: `expo-audio`, `PermissionsAndroid`, native modules) | Business and data adapters in one folder; the second file is the composition root |
| `hooks/` | Business hooks | Fine in role; they import `lib/` files from every layer |
| `components/`, `app/` | Presentation | See violations below |
| `modules/` | Native modules (Expo local modules) | Data layer, but must stay at the project root (§4) |

Concrete layer violations found today:

1. **Presentation reaches the data layer.** `app/(tabs)/index.tsx` imports `expo-clipboard` and passes `Clipboard.getStringAsync` into a hook.
2. **Business logic inside a screen.** `app/(tabs)/index.tsx` (136 lines) computes genre suggestions, decides what Play/Shuffle plays and what a delete does to the player. That is orchestration, not markup.
3. **Data depends on business.** `lib/progressStorage.ts` imports `parseProgressByUrl` from `lib/playbackProgress.ts`; `lib/savedUrl.ts` imports `parseGenres` from `lib/genres.ts` (which imports the `SavedUrl` type back: a circular dependency between the two files).
4. **Business owns the data adapters' wiring.** `stores/playerStore.ts` imports `expo-audio`, `react-native` and two native modules directly while also creating the store.
5. **Display helpers and the theme sit beside business rules** in `lib/`.

No component imports AsyncStorage or the native modules directly today, so the presentation layer is closer to clean than the rest.

## 3. Target structure

All of the following sit under `src/` (decision 1); `modules/` and `assets/` stay at the project root.

```
src/app/                     routes only (Expo Router): each file is a one-line re-export of a screen, plus the _layout files
src/presentation/
  screens/                   HomeScreen, PlayerScreen, ComingSoonScreen (the screen-level code that lives in app/ today)
  components/                reusable UI pieces used by the screens (Chip, FilterChips, GenreChips, GenreSheet,
                             SavedUrlItem, AudioPlayer, PlaylistPanel, Scrubber, MiniPlayer, …)
  theme.ts                   from lib/theme.ts
  format/                    formatTime, formatDuration, hostLabel
src/business/
  logic/                     genres, queue, playbackProgress, resolvedAudioCache,
                             noticeTimer, parseHttpUrl            (+ their tests)
  player/                    createPlayerStore (+ tests), playerStore (hook + composition)
  hooks/                     useSavedUrls, useLibraryView, useGenreEditor, useAddUrlModal,
                             useHomeScreen (new, see §5.3)
  resolveAudio.ts            cached resolver wiring (from lib/resolveAudio.ts)
src/data/
  models.ts                  SavedUrl, PlaybackProgress, ResolvedAudio re-export, cache entry types
  ports.ts                   AudioPlayerPort, ProgressStoragePort, ResolvedAudioStoragePort
  storage/                   savedUrlsRepository, progressRepository, resolvedAudioRepository
                             (AsyncStorage + parse/validate/map of stored shapes) (+ tests)
  device/                    audioPlayer (expo-audio adapter), clipboard, notificationPermission
modules/                     native modules, unchanged location, counted as the data layer
```

Names are literal on purpose (`data`, `business`, `presentation`) so a path tells you the layer.

### Where each existing file goes

| Now | After | Layer |
|---|---|---|
| `lib/savedUrlsStorage.ts`, `lib/progressStorage.ts`, `lib/resolvedAudioStorage.ts` | `data/storage/*Repository.ts` | data |
| parse functions in `savedUrl.ts`, `playbackProgress.ts`, `resolvedAudioCache.ts` | into the repositories above | data |
| types `SavedUrl`, `PlaybackProgress`, cache entry types | `data/models.ts` | data |
| port types in `createPlayerStore.ts`, `resolvedAudioCache.ts` | `data/ports.ts` | data |
| `expo-audio` / `PermissionsAndroid` code in `stores/playerStore.ts` | `data/device/audioPlayer.ts`, `notificationPermission.ts` | data |
| `Clipboard.getStringAsync` use in the Home screen | `data/device/clipboard.ts` | data |
| `lib/genres`, `queue`, `playbackProgress` (rules), `resolvedAudioCache` (policy), `noticeTimer`, `parseHttpUrl` | `business/logic/` | business |
| `stores/createPlayerStore.ts`, `stores/playerStore.ts` (remaining wiring) | `business/player/` | business |
| `hooks/*` | `business/hooks/` | business |
| `lib/resolveAudio.ts` | `business/resolveAudio.ts` | business |
| `lib/formatTime`, `formatDuration`, `hostLabel`, `lib/theme.ts` | `presentation/format/`, `presentation/theme.ts` | presentation |
| `components/*` (except `ComingSoonScreen`) | `src/presentation/components/*` | presentation |
| screen code in `app/(tabs)/index.tsx`, `app/player.tsx`, and `components/ComingSoonScreen.tsx` | `src/presentation/screens/HomeScreen.tsx`, `PlayerScreen.tsx`, `ComingSoonScreen.tsx` | presentation |
| `app/*.tsx` route files | `src/app/*`, reduced to `export { default } from '…/screens/…'` (the `_layout` files stay as they are: they configure navigation) | presentation |

## 4. Constraints discovered (they shape the plan)

1. **`modules/` cannot move.** `app.json` points at `./modules/newpipe-resolver/app.plugin.js` and Expo autolinks local modules from that folder. It stays at the root and the lint rules treat it as the data layer.
2. **Tests run on plain Node** (`node --test`, TypeScript stripped, Node 24). Every file reachable from a test must use **relative imports with the `.ts` extension** and must not import React Native or Expo packages. This is why the pure logic and the repositories' parsing must stay free of device imports, and why I am **not** introducing path aliases (`@/…`): they would not resolve under `node --test`.
3. **The test script uses two folder globs** (`lib/*.test.ts`, `stores/*.test.ts`). It changes to `data/**` and `business/**` globs (Node 24 supports `**`).
4. **`AGENTS.md` says routes live in `src/app/`** and the project had a root `app/`. Decision 1 puts everything under `src/`, which matches `AGENTS.md`; `app/` moves to `src/app/` in Phase 3 (Expo Router picks it up automatically). `modules/` and `assets/` stay at the root (`app.json` references them).

## 5. Design decisions inside the refactor

### 5.1 Parsing of stored data moves to the data layer (the one behaviour-relevant change)

Parsing a stored JSON value into a typed object is "result mapping", which belongs to the data layer. Three of those parsers currently use business code:

- `parseSavedUrl` calls `parseGenres`, which **normalises** genres (trim, collapse spaces, drop duplicates ignoring case). Normalising is a business rule, so the data layer cannot call it.

**Proposal:** the repository only validates structure (keeps strings, drops non-strings and non-lists). Normalisation stays in the business layer and runs when genres are *written* (it already does: `addGenre`). What is lost: a stored genre list that was hand-edited or corrupted into un-normalised strings would no longer be cleaned on load. Data written by this app is already normalised, so the loss only matters for tampered storage. The two tests that cover this cleanup (`cleans up stored genres…`) change accordingly.

Alternative (decision 2): keep cleaning on load by running `normalizeGenre` in `useSavedUrls` right after loading (business). Same result, a few more lines.

### 5.2 Ports live in the data layer, adapters implement them

`AudioPlayerPort`, `ProgressStoragePort` and `ResolvedAudioStoragePort` describe I/O boundaries, so they sit in `data/ports.ts`. The business layer imports them (downwards, allowed) and receives implementations by injection, exactly as `createPlayerStore` and `createCachedResolveAudio` do today (DI is already in place; this only fixes where the types live). The single wiring file in `business/player/playerStore.ts` is the composition root.

### 5.3 The Home screen gets a hook

A new business hook `useHomeScreen` combines `useSavedUrls`, `useLibraryView`, `useGenreEditor`, `useAddUrlModal` and the player store actions, and owns the orchestration that is in the screen today (genre suggestions, play-genre, delete-and-stop). Navigation (`router.push`) stays in the screen because it is presentation. The screen becomes markup plus wiring. Hook body stays under the 40-line limit by delegating to the existing hooks (they are not merged).

### 5.4 What each layer may import (the rules)

| Layer | May import | May not import |
|---|---|---|
| `data` | `modules/`, AsyncStorage, `expo-*`, React Native platform APIs (e.g. `PermissionsAndroid`) | `business`, `presentation`, `app` |
| `business` | `data` (values and types), `react`, `zustand` | `presentation`, `app`, `react-native`, `expo-*`, `lucide-react-native`, AsyncStorage |
| `presentation` and `app` | `business`, `react`, `react-native`, `expo-router`, UI libraries, **type-only** imports from `data/models` | `data` values, AsyncStorage, `expo-audio`, `expo-clipboard`, `modules/` |

**Type-only imports of data models from upper layers are allowed** (decision 3): a component that renders a `SavedUrl` needs its shape. Re-exporting the types through `business` would work but adds an indirection for no benefit.

## 6. Enforcement

Lint, so a violation fails `npm run lint` instead of depending on review:

- ESLint 9 flat config overrides per folder using `no-restricted-imports` (the `@typescript-eslint` variant supports `allowTypeImports`, needed for the type-only rule; it is already installed through `eslint-config-expo`, **to be confirmed in Phase 1**). No new dependency.
- One small test is not needed; the lint rule is the check. I will prove each rule fails by adding a deliberate violation once, seeing the error, and reverting.

## 7. Phasing

Bottom-up, each phase leaves the app working and ends with typecheck, lint, tests and an emulator smoke test (Home, play, queue, repeat/shuffle, Retry, add URL, genre edit). I use `git mv` so history follows the files. I stage and stop after each phase for your commit message.

1. **Phase 1 — Data layer.** Create `data/` (models, ports, repositories with parsing moved in, device adapters). `lib/*Storage.ts` and the adapters in `stores/playerStore.ts` move here. Business code is updated to import from `data/`. Tests for repositories move with them. Add the lint rule for `data` (and confirm the rule mechanism).
2. **Phase 2 — Business layer.** Move `lib` rules, `stores/`, `hooks/`, `resolveAudio.ts` into `business/`; extract `useHomeScreen`; update the test script globs. Add the lint rule for `business`.
3. **Phase 3 — Presentation layer.** Create `src/presentation/` with **`components/` and `screens/` split** (decision 7): move the components, theme and formatters; move the screen code out of the route files into `screens/`; move `app/` to `src/app/` with route files reduced to re-exports. Expo Router treats every file under `src/app/` as a route, so nothing but routes and layouts may live there, which is the reason screens cannot stay in it. Add the lint rule for `presentation`/`app`, then delete the now-empty `lib/`, `stores/`, `hooks/`, `components/`.
4. **Phase 4 (optional, decision 4) — Split `createPlayerStore.ts`.** It is 398 lines and one factory function far above the 40-line function limit. Behaviour-preserving split into focused modules (queue actions, progress, notices). Done last and only if you want it, because it is a real code change rather than a move, protected by the 163 existing tests.
5. **Final:** update `PRD.md` (architecture section, folder map) and `AGENTS.md` if it should describe the new layout.

## 8. Risks

- **Large diff, small logic change.** Almost every file's imports change. Mitigation: mechanical moves with `git mv`, an import-rewrite script, and a full check after each phase; no logic edits mixed in (except the items in §5).
- **Metro caching and stale bundles** after the moves. Mitigation: restart Metro with a cleared cache for the smoke test.
- **Node test imports.** A moved file that loses its `.ts` extension or gains a React Native import breaks `npm test` immediately, which is the early warning.
- **Circular imports.** The `savedUrl` ↔ `genres` cycle disappears with §5.1; the lint rules prevent new upward imports.
- **Not covered by tests:** hooks and components. Smoke tests on the emulator are the only check for those moves, so a broken import there shows up as a red screen, not a failed test (typecheck and lint should catch it first).

## 9. Out of scope (deliberately)

- Removing the unused audio-effects module, `toggleEffect`, and the placeholder Explore/Library/Downloads screens. They would move with their layer; deleting them is a separate decision.
- Path aliases, a DI container, a state-management change, any new dependency.
- Behaviour changes other than §5.1.

## 10. Decisions (made)

| # | Question | Decision |
|---|---|---|
| 1 | Folder layout | **Everything under `src/`** (`src/app`, `src/data`, `src/business`, `src/presentation`); `modules/` and `assets/` stay at the root. |
| 2 | Genre cleanup on load | **Dropped.** The repository validates structure only. |
| 3 | Type-only imports of `data/models` from presentation | **Allowed**, enforced by lint (the rule option was verified, see §11). |
| 4 | Split `createPlayerStore.ts` | **Yes**, as Phase 4. |
| 5 | Extract `useHomeScreen` | **Yes** (Phase 2). |
| 6 | Folder names `data` / `business` / `presentation` | **Yes.** |
| 7 | Presentation split | **`components/` and `screens/`** (requested after Phase 1). Components stay in one flat folder; grouping them per screen is possible later but not needed now. |

## 11. Phase 1 status — done (data layer)

Built, under `src/data/`:
- `models.ts` (`SavedUrl`, `PlaybackProgress`, `ProgressByUrl`, cache entry types) and `ports.ts` (`AudioPlayerPort`, `PlaybackStatus`, `AudioEffect`, `ProgressStoragePort`, `ResolvedAudioStoragePort`), moved out of the store and cache files.
- `storage/`: three repositories (`savedUrlsRepository`, `progressRepository`, `resolvedAudioRepository`) and `parsers.ts` with the three parse/validate functions.
- `device/`: `audioPlayer.ts` (the `expo-audio` adapter, `PermissionsAndroid` and the effects module, moved out of `stores/playerStore.ts`) and `clipboard.ts`.
- Business code now imports from `src/data/`; `useAddUrlModal` reads the clipboard through the data adapter, so the Home screen no longer imports `expo-clipboard`.
- `lib/savedUrl.ts` is deleted; `parseGenres` was removed (dead after decision 2).

Deviations from the plan above, and why:
- **Parsers are a separate pure file** (`parsers.ts`), not inside the repositories. Tests run on plain Node and a file that imports AsyncStorage cannot load there, so the parsing had to be separable from the storage wrapper.
- **The lint script now covers more folders.** `expo lint` by default only checked `app/` and `components/`, so `hooks/`, `lib/` and `stores/` had never been linted. The script is now `expo lint app components src hooks lib stores` (Phase 3 shrinks it to the final folders). This surfaced one existing warning, `react-hooks/exhaustive-deps` in `hooks/useSavedUrls.ts` line 69 (from the notice-timer work); not fixed here.
- **Layer lint rule for `src/data/**`** (core `no-restricted-imports`): proved by a deliberate violation, which failed with the expected message. The `allowTypeImports` option for the later presentation rule was verified separately (type import allowed, value import flagged).

Checks: typecheck, lint and 161 tests pass (163 before: removed `parseGenres`' test and merged two genre-parse tests into one). Emulator after the move: app boots with no errors, saved list loads through the new parser, the Paste bar opens the Add modal (clipboard adapter), a track plays and the genre badges show on the Player.

Behaviour change (decision 2): a stored genre list that is not normalised is no longer cleaned on load.
