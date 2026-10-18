# Technical Solution Proposal — Genres, Genre Playlists, Loop & Shuffle

Status: **Proposal, product decisions made (§9), nothing implemented.**

## 1. What is being asked

1. A **tag** called **genre** that the user puts on saved items.
2. A genre acts as a **playlist**: all items with that genre.
3. Playing a genre can **loop** (repeat) and **randomize** (shuffle).

Today none of this exists: the app plays exactly one track at a time. The PRD lists "playlists/queue" as a non-goal, so this feature changes that statement (PRD update is part of the last phase).

## 2. Terms used in this document

- **Genre**: a short text label on a saved item. An item can have several.
- **Queue**: the ordered list of tracks currently being played as a playlist. It exists only while a genre is playing.
- **Repeat mode**: `off`, `all` (loop the whole queue), `one` (loop the current track).
- **Shuffle**: the queue order is random instead of library order.

## 3. What the code looks like today (verified)

- `SavedUrl` is `{ url, title, thumbnailUrl }` (`lib/savedUrl.ts`), stored as JSON in AsyncStorage key `saved-urls`. `parseSavedUrl` tolerates older shapes, so adding a field is backward compatible.
- The player store (`stores/createPlayerStore.ts`, ~290 lines) loads **one** track via `loadTrack`. There is no queue and **nothing happens when a track ends**: the player stays paused at the end and progress shows "Completed".
- The player port (`PlaybackStatus`) does not carry the end-of-track signal, but `expo-audio`'s status does have `didJustFinish`, and the player has a `loop` flag.
- `expo-audio` also ships an `AudioPlaylist` (sources, `next()`/`previous()`, loop modes). **Not suitable here:** it takes all sources up front, but our stream URLs are resolved on demand, expire after about 6 hours and are tied to the requester's IP (measured in the resolved-audio-cache work). Resolving a whole genre up front would be slow and would go stale, so the queue has to live in app code and resolve each track when its turn comes.
- Home has progress filter chips (`FilterChips`, `lib/playbackProgress.ts`).
- The earlier resolved-audio cache makes "resolve the next track" cheap when it was resolved recently.

## 4. Proposed solution

### 4.1 Data model

Add `genres: string[]` to `SavedUrl` (default `[]`).

- `parseSavedUrl` reads it defensively (non-array or non-string entries are dropped), so existing saved libraries load unchanged and no migration is needed.
- There is **no separate genre table**: the set of genres is derived from the items. A genre exists while at least one item has it, so there is nothing to keep in sync and nothing to clean up when an item is deleted.
- **No limits** on how many genres an item has or how many genres exist (decision). Normalisation, in one pure function, is only: trim, collapse inner whitespace, reject empty. Matching is case-insensitive, so "Interview" and "interview" are the same genre; the first-seen spelling is displayed. Very long names are cut with an ellipsis in the UI rather than rejected.

### 4.2 Pure logic (business layer, no React, fully unit-tested)

- `lib/genres.ts`: `normalizeGenre`, `collectGenres(items)` (sorted, with counts), `filterByGenre(items, genre)`, `addGenre` / `removeGenre` on an item's list, and `splitVisibleGenres(genres, isExpanded)` for the show-more rule.
- `lib/queue.ts`: `buildQueue(items, { shuffle, random })`, `getNext(queue, index, repeatMode)`, `getPrevious(...)`, `shuffleItems(items, random)` (Fisher–Yates with an **injected** random function so tests are deterministic).

Shuffle rules:
- The queue order is generated once when playback starts, so "previous" goes back to what was actually played.
- When repeat-all wraps around, the order is reshuffled, and the first track of the new lap is never the track that just played (when the queue has more than one track).
- With a single-track queue, repeat-all behaves like repeat-one.

### 4.3 Library changes (`useSavedUrls`)

New `setGenres(url, genres)`: validates through `normalizeGenre`, updates the item through the existing `commit` (so persistence and the 5 s error banner behave exactly as they do today).

### 4.4 Playback: queue in the player store

Keep **one** store (the queue must react to the same status updates and call the same `loadTrack`), but keep the logic out of it by calling the pure `lib/queue.ts`:

State added: `queue: SavedUrl[]`, `queueIndex: number`, `repeatMode`, `isShuffled`.
Actions added: `playQueue(tracks, { shuffle })`, `playNext`, `playPrevious`, `setRepeatMode`, `toggleShuffle`, and queue clearing on `stop()`.

**Auto-advance:** add `didJustFinish` to `PlaybackStatus` and the port. In the existing status listener, when it is true and a queue is active, call `playNext()`. `playNext` uses `loadTrack`, so everything already built keeps working: the cached resolve, progress flush (the finished track is credited as completed), resume rules, the Retry button and the retry-once.

**Repeat one:** use the player's native `loop` flag (a new `setLoop(boolean)` on the port) instead of reloading the track: no network, no gap, no re-resolve.

**Manual taps:** tapping a card plays that single track and **clears the queue**, so existing behaviour does not change for anyone who ignores genres.

**Queue and errors:** if the next track fails to load, the normal error state with Retry is shown (queue kept). Skipping a broken track automatically is out of scope for v1.

### 4.5 UI

Home:
- A **genre chip row** below the progress chips (same chip look). Selecting a genre filters the list; it combines with the progress filter as AND. To avoid duplicating the chip styling, the shared chip is extracted once from `FilterChips` and used by both rows (second consumer).
- **Show more:** the row shows the first 3 genres (`VISIBLE_GENRE_COUNT`, changed from 5 after the Phase 2 device check), then a **Show more** chip that expands to all genres, which then reads **Show less**. If there are 3 or fewer, no such chip is shown. A currently selected genre is always visible, even if it would fall beyond the first 3.
- When a genre is selected, a small action row appears: **▶ Play** and **🔀 Shuffle** (starts the genre's queue in library order / random order).
- Each card shows its genres as small badges (first two, then "+n"). A card with **no genres shows a "+ Genre" button** instead (decision), which opens the genre sheet.
- **Long-press** a card, or tap that "+ Genre" button, to open a bottom sheet "Genres": the item's genres as removable chips, an input to add one, and suggestions from existing genres.

Player (only while a queue is active):

```
        ⟲15     ⏯     ⟳30
   ⏮   🔀      1×      🔁   ⏭
```

Second row: previous, shuffle toggle, speed chip, repeat button (cycles off → all → one), next. Exact layout is for review; a five-button transport row would be too tight on a narrow phone, so the new controls go on the second row.

Mini player: unchanged.

### 4.6 What is not included (YAGNI)

Renaming or merging genres, reordering a queue by hand, "up next" list screen, saving custom playlists, persisting the queue or the shuffle/repeat choice across app launches, importing genres from YouTube, lock-screen next/previous (see §7).

## 5. Affected files

| File | Change |
|---|---|
| `lib/savedUrl.ts` (+ test) | `genres` field, defensive parse |
| `lib/genres.ts`, `lib/queue.ts` (+ tests) | New pure logic |
| `hooks/useSavedUrls.ts` | `setGenres` |
| `stores/createPlayerStore.ts` (+ tests) | Queue state/actions, `didJustFinish` handling, `setLoop` on the port |
| `stores/playerStore.ts` | Wire `setLoop` and `didJustFinish` to `expo-audio` |
| `components/` | Shared chip extracted from `FilterChips`; `GenreChips`, `GenreSheet`, genre badges on `SavedUrlItem`, queue controls row in `AudioPlayer` |
| `app/(tabs)/index.tsx` | Genre filter state, Play/Shuffle row, long-press wiring |
| `PRD.md` | Move "playlists/queue" out of non-goals; document the feature |

No native code changes and no new dependencies.

## 6. Test plan (R25)

Pure logic: genre normalisation (empty, whitespace-only, inner whitespace, duplicates ignoring case); an item with a large number of genres is accepted; `collectGenres` counts; `splitVisibleGenres` (3 or fewer: no show-more; more than 3: first 3 plus show-more; expanded: all; the selected genre stays visible); `filterByGenre`; shuffle is a permutation and deterministic for a fixed random; wrap-around never repeats the last track first; `getNext`/`getPrevious` for each repeat mode, at both ends and for a one-track queue; parse of old saved libraries without `genres`.

Store (with the existing fakes): finishing a track with a queue plays the next; with repeat off, the last track ends the queue; repeat-all wraps; repeat-one sets native loop and never loads another track; a manual card tap clears the queue; `didJustFinish` without a queue does nothing; progress of the finished track is saved as completed before the next loads; next/previous at the ends.

Manual (emulator and a real device): assign genres, filter, play a genre, let a short track finish, shuffle, each repeat mode, **lock the screen and let it advance** (§7).

## 7. Risks and unverified assumptions

1. **Auto-advance with the screen locked.** It needs the JS thread to keep running in the background to receive the end-of-track update and start the next load. Progress saving already relies on status updates arriving in the background, and background playback works today, so this is likely fine, but it is **unverified** and is the main thing to test on a real device in Phase 3. If Android throttles it, the fallback would be native-side queueing, which is a much bigger change.
2. **`didJustFinish` timing.** I am assuming it arrives once, as a status update, when a non-looping track ends. To be confirmed by logging it before building on it.
3. **A gap between tracks** of about 2 s while the next stream resolves. The resolved-audio cache removes it for recently resolved tracks; pre-resolving the next queue item while the current one plays would remove it for the rest (Phase 5, optional).
4. **Lock-screen next/previous.** `expo-audio` has lock-screen options for next/previous buttons, but I have not verified they work for a single-player queue like ours. Left out of v1.
5. **Store growth.** The player store gains queue state. If it becomes hard to read, the queue could move to its own small store; I would rather decide that when the code shows it, not up front.

## 8. Phasing

1. **Phase 1 — Data and pure logic.** `genres` on `SavedUrl`, `lib/genres.ts`, `lib/queue.ts`, all with tests. No UI, no behaviour change.
2. **Phase 2 — Assign and filter.** `setGenres`, the genre sheet, badges, genre chip row on Home (shared chip extracted).
3. **Phase 3 — Queue playback.** `didJustFinish` through the port, queue in the store, auto-advance, next/previous, Play/Shuffle buttons. Includes the locked-screen device test.
4. **Phase 4 — Repeat modes and shuffle toggle in the Player UI** (native loop for repeat-one).
5. **Phase 5 — Polish.** Optional pre-resolve of the next track, PRD update, final device check.

Stop for review after each phase.

## 9. Decisions

| # | Question | Decision |
|---|---|---|
| 1 | One genre per item or several? | **Several, with no restriction** on count (and no cap on the number of genres overall). |
| 2 | Loop modes | **Off / all / one on a single cycling button.** |
| 3 | Auto-advance onto an in-progress item | **Start from the saved position** (existing rule; completed items start at 0:00). |
| 4 | Assigning a genre | **Long-press a card** opens the sheet; a card with **no genres shows a "+ Genre" button**. |
| 5 | Remember shuffle/repeat across launches | **No.** |
| 6 | Pre-resolve the next track | **Yes** (Phase 5), after the real gap has been seen on a device. |
| 7 | Genre filter with progress filter | **Combine (AND).** |
| 8 | Many genres on Home | **Show the first 3, then a "Show more" button that reveals all** (and "Show less"). Was 5; reduced to 3 after seeing it on the device. |

## 12. Phase 2 status — done

Built: `genres` edited through `useSavedUrls` (`addItemGenre` / `removeItemGenre`), `GenreSheet` (long-press a card, or tap "+ Genre" / the badges; centred card like the Add URL modal rather than a bottom sheet, so the keyboard cannot cover it), genre badges on cards (first two + "+n"), `GenreChips` on Home with show-more (3 shown), shared `Chip` extracted from `FilterChips`, and two small hooks, `useLibraryView` (genre and progress filters combined, progress counts follow the genre filter) and `useGenreEditor`.

Checked on the emulator: add and remove genres, long-press and "+ Genre" entry points, alphabetical chip row, show more / show less, filtering (list and progress counts follow), the selected genre staying visible while collapsed, the selected genre resetting when its last item loses it, and persistence across an app reload.

Not covered by automated tests: the components and the two hooks (the project has no component test setup); their pure parts (`lib/genres.ts`) are tested.

## 13. Phase 3 status — done

Built:
- `didJustFinish` added to `PlaybackStatus` (the port); the store advances when it is true and a queue is active.
- Queue state in the player store (`queue`, `repeatMode`, `isShuffled`) and actions `playQueue`, `playNext`, `playPrevious`. `random` is an injected dependency (wired to `Math.random` in `playerStore.ts`).
- `loadTrack` was split: the public action ends the queue only when a *different* track is picked by hand (reopening or retrying the current track keeps it); an internal `startTrack` does the loading and is what the queue uses. Auto-advance past the last track with repeat off ends the queue. `stop()` clears it.
- Previous on the first track restarts it; Next on the last track does nothing.
- Home: **Play** and **Shuffle** buttons (`GenrePlayActions`) when a genre is selected. They play the list currently shown, so the progress filter is respected ("Unplayed" inside a genre).
- Player: previous and next buttons around the speed chip while a queue is active (`QueueButton`).
- 15 new store tests (143 total).

Device checks (emulator):
- Risk 2 (`didJustFinish`): it arrives when a track ends and the next track starts by itself. Confirmed.
- Risk 1 (screen locked): with the screen turned off, the finished track was followed by the next one. Confirmed **on the emulator only**. A real phone adds battery optimisation and Doze, so this still needs one check on a real device.

Known limitation: if an item is deleted from the library while it sits in the active queue, it stays in the queue and will still play.

### 13.1 Addition requested during Phase 3: playlist on the Player screen

The queue is shown as an always-visible list under the controls on the Player screen (decided from three layouts: button-opened list, always-visible list, swipe-up panel).

- `PlaylistPanel`: header "Playlist" with "n / total", then a list of the queued tracks (3 rows visible, scrolls beyond that). The current track is highlighted with a speaker icon and is kept centred in view when the track changes. Tapping a row jumps to that track.
- New store action `playQueueTrack(index)`: keeps the queue order, ignores the current track, out-of-range positions and a missing queue. 2 tests (145 in total).
- Shown only while a queue is active, in every phase (also while a track is loading or in error), so a manually picked single track looks exactly as before.
- To make room the artwork may shrink on short screens (`flexShrink` on the thumbnail); on the 6.4" emulator it still shows in full.
- Checked on the emulator: panel appears with the queue, highlight and header follow the playing track, tapping row 2 jumps to it. Not checked: a queue longer than 3 tracks (only two items exist in the test library), so the scrolling and centring on the current row is untested on a device.

## 14. Phase 4 status — done

Built:
- **Repeat button** (one button cycling off → all → one) and **shuffle toggle** in the Player's second row, shown only while a queue is active: `[shuffle] [previous] [speed] [next] [repeat]`. `QueueButton` got an `isActive` state (amber when on); repeat one uses the "1" repeat icon.
- **Repeat one uses the player's own loop** (`setLoop` on the port, `audioPlayer.loop`): no re-resolve, no gap. A one-track queue repeating all is treated the same way (`isLoopingTrack` in `lib/queue.ts`). Only changes are sent to the player, and the loop is switched off again when the queue ends (`stop()`, or picking another track by hand).
- **Shuffle mid-playback** (`reorderQueue`): turning it on keeps the current track playing and puts it first, the rest shuffled; turning it off restores library order around the current track. The store remembers the original order (`queueSource`).
- Store actions `cycleRepeat` and `toggleShuffle`; 15 new tests (160 in total).

Checked on the emulator: the five buttons fit on the row; repeat one looped the track (8:44 of 8:49 → 0:10 later, still 1 / 2, no advance); repeat all wrapped from the last track back to the first; the shuffle button lights up without interrupting playback.

Not checked on a device: the order produced by shuffling a queue of more than two tracks (only unit-tested; the test library has two items), and that the native loop survives a track change (the code re-sends the loop only when its state changes, so this relies on the player keeping its loop setting across `replace()`; repeat one followed by Next was not exercised on the device).

### 14.1 Player layout change (requested after Phase 4)

The artwork, title and controls are now pinned to the top of the Player screen and the playlist fills the rest of the screen below them (previously the artwork was centred in the free space and the controls sat at the bottom, so the layout moved between loading and ready). The controls area has a fixed minimum height (`CONTROLS_MIN_HEIGHT`, 196) so the playlist does not jump when loading finishes. The playlist scrolls on its own; checked on the emulator with a temporary 24-row list (rows 1–5 → 6–10 while the top stayed fixed). It still scrolls to keep the current track centred when the track changes (untested with a long list on a device).

## 15. Phase 5 status — done

- **Pre-resolve:** when a queue track reaches `ready`, the store resolves the next queue track (`queue.index + 1`) through the cached `resolveAudio`, without `refresh`, so it only costs a network call if no fresh cache entry exists. Best effort: a failure is ignored (commented, intentional) and the track is resolved normally when its turn comes. 3 new tests (163 in total): next track resolved ahead and not bypassing the cache; nothing resolved on the last track or without a queue; a failed resolve-ahead does not stop the next track from playing.
- **Not covered:** the wrap-around (repeat all after the last track) is not resolved ahead, because with shuffle the next order is only decided at the wrap. Not measured on a device: the library's two tracks were already cached, so the saved ~2 s between tracks was not observed in practice.
- **Player:** the current track's genres are shown beside the host badge.
- **PRD.md** updated: playlists leave the non-goals, F25–F31 added, storage keys and the removed tab bar / effects switches / floating button corrected.
- **Test data:** the "Test" genres were removed from the emulator.
