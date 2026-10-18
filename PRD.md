# Podcast Player — Product Requirements Document

> Status: describes the app **as implemented today** (Phases 1–3 of the "Acoustic Ember" redesign, see `DESIGN.md`, plus genres, genre playlists, retry/notices, the resolve cache and the three-layer code structure).
> Items marked **[Proposed]** are not built.

## 1. Overview

A mobile audio player for podcasts that live behind web links (currently YouTube). The user pastes a URL, the app resolves it to an audio-only stream on-device, and plays it with background and lock-screen support. It remembers where you stopped, and two optional audio effects (compressor, vocal boost) make speech easier to hear.

| | |
|---|---|
| Platform | **Android only** (both native modules are Android/Kotlin; iOS/web would fail on `requireNativeModule`) |
| Stack | Expo SDK 58, React Native 0.88, Expo Router, Zustand, `expo-audio`, `expo-clipboard`, AsyncStorage |
| Design | Dark "Acoustic Ember" system (`DESIGN.md`); tokens in `src/presentation/theme.ts`; Plus Jakarta Sans + Manrope fonts |
| Native modules | `newpipe-resolver` (URL → audio stream + title + thumbnail), `audio-effects` (compressor, vocal-boost EQ) |
| Backend | None — all resolving happens on-device. |
| Tests | 172 unit tests (`npm test` runs `src/**/*.test.ts`): business logic, the player store and the stored-data parsers. E2E (`e2e/`, Cucumber + Appium): scaffolded, no feature files yet. No component/UI tests. |

## 2. Problem & Goals

**Problem:** Long spoken-word content on video sites forces the user to keep the screen on, burns data on video, and has weak background playback and no "continue where I left off" outside the site's own app.

**Goals**
1. Turn a pasted link into audio-only playback in as few steps as possible.
2. Keep playing with the screen off, with lock-screen controls.
3. Keep a personal library that survives restarts, with listening progress.
4. Make speech clearer on phone speakers/earbuds (effects, speed).

**Non-goals (today):** accounts/sync, downloads/offline, saved/custom playlists and manual queue editing (genre playlists exist, see F25–F31), search/discovery, RSS podcasts, iOS, social features.

## 3. Target User

Someone who listens to talks, interviews and podcasts published as YouTube videos, mostly on an Android phone, often with the screen locked (commute, chores, sleep), often in dim light.

## 4. Functional Requirements

| ID | Requirement | Status |
|---|---|---|
| F1 | Add a URL; only `http(s)` accepted, input trimmed | Done (`src/business/logic/parseHttpUrl.ts`) |
| F2 | On add, resolve title + thumbnail; reject the add if resolve fails | Done (`useSavedUrls.addUrl`, `src/business/hooks`) |
| F3 | Adding an already-saved URL is a silent no-op (modal closes) | Done |
| F4 | Persist the library locally (AsyncStorage `saved-urls`), newest first | Done |
| F5 | Migrate legacy entries stored as plain strings; backfill their titles on launch | Done |
| F6 | Delete an item (✕); if it is the playing track, stop playback | Done — no confirm/undo; saved progress is not removed |
| F7 | Tap an item → load + autoplay, open Player screen | Done |
| F8 | Re-opening the same track does not restart it (unless it is in error) | Done |
| F9 | Play/pause, elapsed/total time | Done |
| F10 | Buffering and error states | Done |
| F11 | Background playback + lock-screen controls with title/artwork | Done |
| F12 | Ask `POST_NOTIFICATIONS` (Android 13+) once per session, after first playback starts; denial never blocks audio | Done |
| F13 | Play even when the phone is on vibrate/silent | Done (`playsInSilentMode`) |
| F14 | Compressor and Vocal-boost switches | Removed from the UI (native `audio-effects` module and store action remain) |
| F15 | Mini player at the bottom of every tab; hidden on the Player screen | Done |
| F16 | **Progress:** save position + duration per URL (`playback-progress`) about every 5 s of playback, and on pause, track switch and stop | Done |
| F17 | **Resume:** re-opening an in-progress track seeks to the saved position; completed or barely-started tracks start at 0:00 | Done |
| F18 | **Progress states:** *Unplayed* (< 5 s played), *In progress*, *Completed* (within 10 s of the end) | Done (`src/business/logic/playbackProgress.ts`) |
| F19 | **Filter chips** All / Unplayed / In Progress / Completed with counts | Done |
| F20 | **Paste bar:** read the clipboard and open the Add modal prefilled; if no valid link, open empty with a message | Done — user still confirms with Add |
| F21 | **Bottom tabs** Home / Explore / Library / Downloads | Removed — the tab bar is hidden; the three placeholder screens still exist but are unreachable |
| F22 | **Draggable scrubber** (tap or drag to seek, live time while dragging) | Done |
| F23 | **Skip** back 15 s / forward 30 s, clamped to the track | Done (not on lock screen) |
| F25 | **Genres:** free-text tags on a saved item, any number, case-insensitive, stored on the item (`genres`); long-press a card or tap its badges / "+ Genre" to edit | Done |
| F26 | **Genre filter:** chip row on Home (first 3, then Show more / Show less), combined with the progress filter | Done |
| F27 | **Genre playlist:** the player store can play a list as a queue and auto-advances when a track ends; picking another track by hand ends it | Store done; **no Home entry point** since the Play / Shuffle buttons were removed (the `playQueue` action is unused by the UI) |
| F32 | **Search:** a field under the title filters the Home list by title, genre or URL (case- and accent-insensitive, every word must match); applied after the genre and progress filters; chip counts ignore it | Done (`src/business/logic/search.ts`) |
| F28 | **Player queue controls:** previous / next, shuffle toggle (mid-playback), repeat off → all → one (one uses the player's native loop) | Done |
| F29 | **Playlist panel** on the Player: queued tracks, current highlighted, tap to jump, scrolls | Done |
| F30 | **Resolved-audio cache:** stream URLs cached 5 h (measured URL life 6 h); Retry bypasses it; the next queue track is resolved ahead of time | Done |
| F31 | **Retry and notices:** Retry button on a failed track; non-fatal errors clear after 5 s | Done |
| F24 | **Playback speed** chip cycling 1× → 1.25× → 1.5× → 2× → 0.75×; reapplied to the next track | Done — not persisted across launches |

### Non-functional
- **Performance:** list uses `FlatList`; the player store updates its saved progress only when position moves ≥ 5 s.
- **Reliability:** stale resolve results are discarded if the user switched tracks; the position of the old track is flushed before the next one loads so it is never credited to the wrong track; position updates are ignored until the resume seek lands.
- **Privacy:** no accounts, no analytics; library and progress are on-device only.
- **Legal/risk:** resolving YouTube streams with NewPipe may violate YouTube ToS and breaks whenever YouTube changes; this blocks Play Store distribution as-is. Decide before any public release.
- **Release build:** R8 needs the keep rule in `modules/newpipe-resolver/android/consumer-rules.pro` (NewPipe's Rhino references `java.beans`).

## 5. Information Architecture

```
Root Stack (src/app/_layout.tsx)
├── (tabs)  Tabs with the tab bar replaced by the mini player (src/app/(tabs)/_layout.tsx)
│   ├── index      Home — "Podcasts"
│   ├── explore    Coming soon
│   ├── library    Coming soon
│   └── downloads  Coming soon
│   └── the tab bar slot renders only MiniPlayer
└── player  Player (pushed on top of the tabs, no tab bar)
```

State: `usePlayerStore` (Zustand; phases `idle → resolving → ready | error`; also holds `progressByUrl`, `enabledEffects`, `playbackRate`, the playlist `queue`, `repeatMode`, `isShuffled`, and the expiring `notice`), `useSavedUrls` (library), `useAddUrlModal` (modal form + clipboard), `useLibraryView` (genre and progress filters), `useGenreEditor`, and `useHomeScreen`, which combines them for the Home screen.
Storage keys: `saved-urls` (items incl. `genres`), `playback-progress`, `resolved-audio`.

### Code architecture

Everything lives under `src/`, in three layers that depend downwards only: **presentation → business → data**. Lint enforces it (`eslint.config.js`).

| Folder | Layer | Holds | May import |
|---|---|---|---|
| `src/data/` (+ `modules/`) | Data | AsyncStorage repositories, parsing of stored data, the `expo-audio` adapter, clipboard, port interfaces, the native modules | nothing above it |
| `src/business/` | Business (incl. hooks) | `logic/` (genres, queue, progress rules, cache policy), `player/` (the Zustand store, split per concern), `hooks/` | `src/data`, React, Zustand; no UI or device packages |
| `src/presentation/` | Presentation | `screens/`, `components/`, `theme.ts`, `format/` | `src/business`, UI libraries; from `src/data` only types |
| `src/app/` | Presentation (routes) | Expo Router files: one-line re-exports of screens plus `_layout`s | same as presentation |

Design record: `documentation/tehnical-solution/three layer architecture.md`.

## 6. Screen Documentation

### 6.1 Home — "Podcasts" (`src/presentation/screens/HomeScreen.tsx`, routed by `src/app/(tabs)/index.tsx`)

**Purpose:** the library; entry point for adding, filtering and playing.

| Element | Component | Behavior |
|---|---|---|
| Header | title "Podcasts" + "N saved" chip | N counts the whole library |
| Paste button | `FloatingPasteButton` | Floating amber "Paste URL" pill, bottom-right above the mini player; reads the clipboard and opens the Add modal (prefilled if it holds an http(s) link) |
| Filter chips | `FilterChips` (horizontal scroll) | All / Unplayed / In Progress / Completed, each with a count; hidden while the library is empty |
| Load/save error banner | red text | `Could not load your saved URLs` / `Could not save your URL`; clears after 5 s, or when the next save succeeds |
| List | `FlatList` of `SavedUrlItem` | See card below |
| Empty states | text | Empty library: "Tap Paste URL to add a link"; empty filter: "Nothing here yet" |
| Search | `SearchBar` | Text field with a clear button, hidden while the library is empty; "No matches for …" when nothing matches |
| Genre chips | `GenreChips` | Genres with counts, first 3 then Show more; selecting one filters the list |
| Genre sheet | `GenreSheet` | Opened by long-press or the card's genre badges / "+ Genre"; add by typing, remove by tapping, suggestions from existing genres |

**Card (`SavedUrlItem`):** 120×96 thumbnail (placeholder if none) with a duration badge once known and a check overlay when completed; indigo host badge (e.g. `youtube.com`); title (3 lines); status line — *Now playing* (amber, plus amber border) / *Unplayed* (green) / *Xm played • N%* (amber) / *Completed* (muted, card dimmed); 4 px progress bar under in-progress and completed cards; ✕ delete (immediate).

**Add URL modal** (`AddUrlModal`) — "Paste URL"; autofocused input; Cancel / Add. States: submitting ("Checking URL…"), invalid ("Enter a valid http(s) URL"), resolve failed ("Could not load this URL. Check the link and your connection."), no clipboard link ("No link found on the clipboard. Paste one below."). Typing clears the error; Back closes.

### 6.2 Player (`src/presentation/screens/PlayerScreen.tsx`, routed by `src/app/player.tsx`)

**Purpose:** full playback controls. Artwork and title in the upper area; controls in the lower part of the screen (thumb zone).

| State (`phase`) | What the user sees |
|---|---|
| No track | "Nothing is playing" |
| `resolving` | 16:9 artwork, host badge, title, spinner + "Fetching audio info…" |
| `error` | artwork, title, red error text and an amber **Retry** button (reloads the track, resuming the saved position). The error stays until retried |
| `ready`, not loaded | spinner + "Loading audio…" (also shows briefly while a far seek buffers) |
| `ready` | Full `AudioPlayer` (below) |

**`AudioPlayer`:** `Scrubber` (6 px track, amber fill, 16 px thumb growing to 22 px on touch; tap or drag; time label follows the finger) → elapsed / "Buffering…" (only while buffering) / total → transport row: ⟲15, Play/Pause (64 px, amber glow while playing), ⟳30 → speed chip (amber when ≠ 1×). A failed seek or progress save shows an inline notice that clears after 5 s, on tap, when the same action next succeeds, or on the next track load.

### 6.3 Mini Player (`src/presentation/components/MiniPlayer.tsx`)

Floating pill at the bottom of the tab screens: 40 px thumbnail, title, subtitle ("Fetching audio info…" / error / "Buffering…" / "m:ss / m:ss"), amber play/pause when ready, 2 px progress line on the bottom rim. Tapping opens the Player.

### 6.4 Placeholder tabs
Explore, Library and Downloads show their title and "Coming soon" (`ComingSoonScreen`).

### 6.5 Lock screen / notification
Title and artwork are published via `setActiveForLockScreen`; cleared on `stop()`. Needs notification permission on Android 13+. Skip and speed are not exposed there.

## 7. Key Flows

1. **Add & play:** Home → copy link → **Paste** → check prefilled link → Add → item appears on top → tap → Player autoplays.
2. **Resume:** play, leave, relaunch → card shows "Xm played" → tap → continues from the saved position.
3. **Background:** start playback → lock the phone → controls on the lock screen.
4. **Browse while listening:** Player → back → Home with the mini-player above the tabs → tap it to return.
5. **Triage:** filter chips → In Progress to continue, Unplayed to pick something new.
6. **Delete playing item:** ✕ → playback stops, mini-player disappears.

## 8. UI/UX Recommendations — status

| # | Recommendation | Status |
|---|---|---|
| 1 | Undo for delete (swipe + snackbar) | **Open** — chosen to defer; ✕ is still one tap with no undo |
| 2 | Resume position | Done (F16–F18) |
| 3 | Draggable seek | Done (F22) |
| 4 | Skip controls | Done (F23) |
| 5 | Retry button on player error | Done |
| 6 | Errors that auto-clear | Done — non-fatal notices only; the fatal player error stays until retried |
| 7 | Feedback when adding a duplicate | Open |
| 8 | Friendly empty state (icon + CTA) | Partial — text only |
| 9 | Paste button / Android Share target | Paste done (F20); Share target open |
| 10 | Remove permanent "Ready" label | Done |
| 11 | Playback speed | Done (F24) |
| 12 | Effects as switches with help text | Done; persistence across launches open |
| 13 | Player layout / thumb-zone controls | Done |
| 14 | Theme tokens | Done (`src/presentation/theme.ts`) |
| 15 | Mini-player slide-in animation | Open |
| 16 | Dark mode | Done (dark only) |
| 17 | Accessibility roles | Partial — switches and buttons labeled; scrubber has no slider role/actions |
| 18 | Text contrast | Open — `textMuted` `#64748B` on `#0F1115` is roughly 3.9:1 (estimate, not measured), below AA for small text |
| 19 | 48 dp touch targets | Partial — ✕ and filter chips use `hitSlop`; verify |
| 20 | Group row + delete for screen readers | Open |
| 21 | Large header / tabular numerals | Partial — tabular numerals done |

**Not built, from `DESIGN.md`/mockup:** buffered-range bar on the scrubber (the player does not report a buffered position), search / cast / profile bar, ⋮ row menu, download buttons, "New Episode" tag, Skip Silence, light theme.

## 9. Known Limitations
- Saved progress survives deleting an item (orphan entry; re-adding the link resumes it).
- A seek to an unbuffered position briefly replaces the controls with "Loading audio…".
- A pause from the lock screen or notification is not flushed, so up to 5 s of position can be lost.
- A stale position event right after the resume seek could briefly save 0 (guarded, unverified on device).
- A track's duration is only known after ~5 s of playback, so new cards have no duration badge until then.
- Effects and speed reset on every launch.

## 10. Open Questions

1. Is distribution public? (YouTube ToS risk — see §4.)
2. iOS in scope? If yes, both native modules need Swift equivalents and `requireNativeModule` needs a guard.
3. Should effects and speed persist across launches?
4. Should the library hold only YouTube links, or any audio URL? (Paste bar copy says "YouTube or web audio".)
5. What should Explore, Library and Downloads become — or should they be removed?

## 11. Success Metrics (suggested)

- Time from opening the app to audio playing for a new link < 15 s (p50).
- Resolve failure rate < 5 %.
- Share of sessions that continue playback with screen off > 40 %.
- Share of started tracks that are resumed rather than restarted.
- Crash-free sessions > 99.5 %.

## 12. Delivery History

1. **Phase 1:** dark theme, fonts, Home card list, floating Paste URL pill, floating mini-player, effect cards.
2. **Phase 2:** progress and resume, filter chips, paste bar, bottom tabs.
3. **Phase 3:** Player redesign (scrubber, skip, speed), this document.
4. **Candidates:** swipe-to-delete with undo, retry and error clearing, Share target, accessibility pass, persisted effects/speed.
