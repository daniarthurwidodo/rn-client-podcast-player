# Podcast Player — Product Requirements Document

> Status: describes the app **as implemented today** (v1.0.0), plus a prioritized list of UI/UX improvements (§8).
> Items marked **[Proposed]** are not built.

## 1. Overview

A mobile audio player for podcasts that live behind web links (currently YouTube). The user pastes a URL, the app resolves it to an audio-only stream on-device, and plays it with background and lock-screen support. Two optional audio effects (compressor, vocal boost) make speech easier to hear.

| | |
|---|---|
| Platform | **Android only** (both native modules are Android/Kotlin; iOS/web would fail on `requireNativeModule`) |
| Stack | Expo SDK 58, React Native 0.88, Expo Router, Zustand, `expo-audio`, AsyncStorage |
| Native modules | `newpipe-resolver` (URL → audio stream + title + thumbnail), `audio-effects` (compressor, vocal-boost EQ) |
| Backend | None — all resolving happens on-device. |
| Tests | Unit: `lib/*.test.ts`, `stores/*.test.ts`. E2E (`e2e/`, Cucumber + Appium): scaffolded, no feature files yet. |

## 2. Problem & Goals

**Problem:** Long spoken-word content on video sites forces the user to keep the screen on, burns data on video, and has weak background playback.

**Goals**
1. Turn a pasted link into audio-only playback in as few steps as possible.
2. Keep playing with the screen off, with lock-screen controls.
3. Keep a personal library of saved links that survives restarts.
4. Make speech clearer on phone speakers/earbuds (effects).

**Non-goals (today):** accounts/sync, downloads/offline, playlists/queue, search/discovery, RSS podcasts, iOS, social features.

## 3. Target User

Someone who listens to talks, interviews and podcasts published as YouTube videos, mostly on an Android phone, often with the screen locked (commute, chores, sleep).

## 4. Functional Requirements

| ID | Requirement | Status |
|---|---|---|
| F1 | Add a URL; only `http(s)` accepted, input trimmed | Done (`lib/parseHttpUrl.ts`) |
| F2 | On add, resolve title + thumbnail; reject the add if resolve fails | Done (`useSavedUrls.addUrl`) |
| F3 | Adding an already-saved URL is a silent no-op (modal closes) | Done |
| F4 | Persist the library locally (AsyncStorage `saved-urls`), newest first | Done |
| F5 | Migrate legacy entries stored as plain strings; backfill their titles on launch | Done |
| F6 | Delete an item; if it is the playing track, stop playback | Done |
| F7 | Tap an item → load + autoplay, open Player screen | Done |
| F8 | Re-opening the same track does not restart it (unless it is in error) | Done |
| F9 | Play/pause, tap-to-seek on progress bar, elapsed/total time | Done |
| F10 | Buffering and error states | Done |
| F11 | Background playback + lock-screen controls with title/artwork | Done |
| F12 | Ask `POST_NOTIFICATIONS` (Android 13+) once per session, after first playback starts; denial never blocks audio | Done |
| F13 | Play even when the phone is on vibrate/silent | Done (`playsInSilentMode`) — not yet verified on device |
| F14 | Compressor and Vocal-boost toggles; persist across tracks within a session | Done (not persisted across launches) |
| F15 | Mini player on all screens except Player | Done |

### Non-functional
- **Performance:** list uses `FlatList`; player store updates only while phase is `ready`.
- **Reliability:** stale resolve results are discarded if the user switched tracks (`loadTrack` URL check).
- **Privacy:** no accounts, no analytics; library is on-device only.
- **Legal/risk:** resolving YouTube streams with NewPipe/yt-dlp may violate YouTube ToS and breaks whenever YouTube changes; this blocks Play Store distribution as-is. Decide before any public release.

## 5. Information Architecture

```
Root Stack (app/_layout.tsx)
├── /           Home — "Podcasts"   (app/index.tsx)
├── /player     Player              (app/player.tsx)
└── MiniPlayer  (global overlay under the stack, hidden on /player)
```

State: `usePlayerStore` (Zustand; phases `idle → resolving → ready | error`), plus `useSavedUrls` (library) and `useAddUrlModal` (modal form).

## 6. Screen Documentation

### 6.1 Home — "Podcasts" (`app/index.tsx`)

**Purpose:** the library; entry point for adding and playing.

| Element | Component | Behavior |
|---|---|---|
| Header | Stack header, title "Podcasts" | Static |
| Load/save error banner | red `Text` at top | Shown for `Could not load your saved URLs` / `Could not save your URL`; never auto-clears |
| List | `FlatList` of `SavedUrlItem` | Row = 96×54 thumbnail (grey placeholder if none), title (2 lines), URL (1 line, only if title ≠ URL), red ✕ |
| Row tap | `SavedUrlItem.onPress` | `loadTrack(item)` then `router.push('/player')` |
| ✕ tap | `SavedUrlItem.onDelete` | Deletes immediately (no confirm/undo); stops playback if it is the current track |
| Empty state | `Text` | "Tap + to add a URL" |
| FAB | `FloatingAddButton` (56px, blue, bottom-right) | Opens Add URL modal |
| Add URL modal | `AddUrlModal` | See below |

**Add URL modal** — title "Paste URL"; autofocused URL input (`keyboardType="url"`, no autocorrect/capitalize); Cancel / Add.
States: *idle* → *submitting* ("Checking URL…" spinner, input + buttons disabled) → success closes and clears; *invalid* → "Enter a valid http(s) URL"; *resolve failed* → "Could not load this URL. Check the link and your connection."; typing clears the error. Keyboard "done" submits. Hardware back closes it.

### 6.2 Player (`app/player.tsx`)

**Purpose:** full playback controls for the current track.

| State (`phase`) | What the user sees |
|---|---|
| No track | "Nothing is playing" |
| `resolving` | 16:9 thumbnail, title, large spinner + "Fetching audio info…" |
| `error` | thumbnail, title, red error text (`Could not load audio for this URL`, or playback error). No retry button; going back and tapping the item again retries |
| `ready`, not yet loaded | spinner + "Loading audio…" |
| `ready` | Full `AudioPlayer` (below) |

**`AudioPlayer`:** progress bar (24px, tap to seek via `seekToFraction`, no drag) → elapsed / total → buffering line ("Buffering…" with spinner, else green "Ready") → 64px circular Play/Pause → two text toggles "Compressor: On/Off" and "Vocal boost: On/Off". A failed seek/effect shows an inline error ("Could not seek in this audio" / "That audio effect is not available on this device"); it stays until the next track load.

### 6.3 Mini Player (`components/MiniPlayer.tsx`)

**Purpose:** persistent now-playing bar; hidden on `/player` and when no track.
Layout: 2px progress line on top; 64×36 thumbnail; title (1 line); subtitle = "Fetching audio info…" / error text / "Buffering…" / "m:ss / m:ss"; Play/Pause button only when ready and loaded. Tapping the bar opens Player. Respects bottom safe-area inset.

### 6.4 Lock screen / notification
Title and artwork are published via `setActiveForLockScreen`; cleared on `stop()`. Needs notification permission on Android 13+ to display.

## 7. Key Flows

1. **Add & play:** Home → FAB → paste URL → Add → (resolve) → item appears at top → tap → Player autoplays.
2. **Background:** start playback → press Home/lock → controls on lock screen → resume from notification.
3. **Browse while listening:** Player → back → Home with Mini Player → tap bar to return.
4. **Delete playing item:** ✕ → playback stops, Mini Player disappears.

## 8. UI/UX Recommendations

Ordered by value ÷ effort. Each cites what the code does today.

### P0 — Fix gaps that affect everyday use
| # | Issue today | Recommendation |
|---|---|---|
| 1 | **Delete is one tap on a small red ✕** with no confirm/undo; adjacent to the row's play tap | Swipe-to-delete (or long-press menu) + a snackbar with **Undo** (remove from storage only after it expires) |
| 2 | **No resume position.** Reopening a track starts at 0:00; long episodes are the core use case | Persist `currentTime` per URL (throttled, e.g. every 5–10 s and on pause); show a thin progress bar on the row; resume on load |
| 3 | **Progress bar is tap-only**, no dragging, no time preview | Draggable thumb with live time label; keep tap-to-seek |
| 4 | **No skip controls.** Spoken content needs ±15/30 s | Add ⟲15 / 30⟳ buttons flanking Play (lock-screen too) |
| 5 | **Player error has no action** | Add a **Retry** button on `error` phase (calls `loadTrack` again) and a human cause (offline vs. unavailable) |
| 6 | **Errors never clear** (library banner, seek/effect errors persist) | Auto-dismiss toasts / clear on next successful action |
| 7 | **Duplicate add silently closes the modal** | Say "Already in your library" and scroll/highlight the existing row |

### P1 — Polish & clarity
| # | Issue today | Recommendation |
|---|---|---|
| 8 | Screen title "Podcasts" but items are links; empty state is only a line of grey text | Friendly empty state: icon, "Add your first episode", primary button, hint "Paste a YouTube link" |
| 9 | Add modal makes the user switch to a browser and back | **Paste** button reading the clipboard; auto-prefill if clipboard holds a URL; and register as an Android **Share target** so "Share → Podcast Player" adds directly |
| 10 | "Ready" (green) is always shown under the bar — noise | Show status only when something is wrong/buffering; use the space for playback speed |
| 11 | No **playback speed** | 0.75×–2× chip next to the time row; remember per track |
| 12 | Effects are unexplained text toggles ("Compressor: Off") | Use real switches in an "Audio enhancements" card with one-line help: *Compressor — evens out loud and quiet parts*, *Vocal boost — emphasizes speech*. Remember the choice across launches |
| 13 | Player screen is vertically centered and bare | Large artwork top, title (2 lines) + channel/duration, controls anchored to the lower third, thumb-reachable |
| 14 | Play button and Mini Player icon are the only filled affordances; FAB and primary actions share one blue with no system | Define tokens (colors, spacing, radius, type scale) in one `theme` file; today hex values are repeated per component |
| 15 | Mini Player appears with no transition, could cover the FAB's reach | Slide-in animation; offset FAB above the Mini Player when visible |

### P2 — Accessibility & platform
| # | Issue today | Recommendation |
|---|---|---|
| 16 | `userInterfaceStyle: "light"` — no dark mode; listening is often at night | Support dark theme via `useColorScheme` + tokens |
| 17 | Progress bar has no semantics; effect toggles have no role/state | `accessibilityRole="adjustable"` + value text on the bar with increment/decrement actions; `accessibilityRole="switch"` + `checked` on toggles |
| 18 | Secondary text `#777` on white ≈ 4.5:1 (borderline AA); placeholder `#9ca3af` weaker | Darken to ≥ `#595959`; verify with a contrast checker |
| 19 | Touch targets: ✕ is ~40×32, toggles ~36 high | Min 48×48 dp (use `hitSlop` or padding) |
| 20 | Row `Pressable` and nested delete `Pressable` both announce separately | Group row as one accessible element with a custom "Delete" action |
| 21 | Native header with default styling | Large title, tabular numerals for time, consistent app-bar color |

### P3 — Features to consider (product decisions, not UX fixes)
Queue / autoplay next · sleep timer · per-item "played" state · search/sort/folders · pull-to-refresh to re-backfill titles · RSS support · offline downloads.

## 9. Open Questions

1. Is distribution public? (YouTube ToS risk for NewPipe/yt-dlp — see §4.)
2. iOS in scope? If yes, both native modules need Swift equivalents and `requireNativeModule` needs a guard.
3. Should audio-effect state persist across launches?
4. Should the library hold only YouTube links, or any audio URL?

## 10. Success Metrics (suggested)

- Time from opening the app to audio playing for a new link < 15 s (p50).
- Resolve failure rate < 5 %.
- Share of sessions that continue playback with screen off > 40 %.
- Crash-free sessions > 99.5 %.

## 11. Suggested Phasing for the UX work

1. **Phase 1 (P0):** Undo-delete, resume position, retry, skip ±, draggable seek, error auto-clear, duplicate feedback.
2. **Phase 2 (P1):** Empty state, paste/share-target, speed, effects card, player layout, theme tokens.
3. **Phase 3 (P2):** Dark mode, accessibility pass.
