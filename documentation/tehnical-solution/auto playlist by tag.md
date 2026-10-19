# Technical Solution Proposal — Auto Playlist by Tag

Status: **Implemented right after writing** (you asked for the proposal and the implementation in one go, so there is no review stop). Choices made without asking are in §5 so you can overrule them.

## 1. Goal

When the user taps **one** audio on Home, the app automatically queues the other saved audio that share a tag (genre) with it, so playback continues through them without the user building a playlist.

This gives the existing queue (auto-advance, previous/next, repeat, shuffle, the playlist panel on the Player) its entry point again, since the Home Play/Shuffle buttons were removed.

## 2. Behaviour

On tapping a card **X**:

1. **Related items** = every other saved item that shares **at least one genre** with X (case-insensitive, same matching as the genre filter).
2. If there are no related items (X has no genres, or no other item shares one): **play X alone**, exactly as today. No queue, no playlist panel.
3. Otherwise: the queue is **X first, then the related items in library order** (the order they have on Home, newest saved first). X plays immediately; when it ends the next one starts, and so on. With repeat off the queue ends after the last item.
4. The Player shows the playlist panel, the previous/next buttons, and the shuffle and repeat toggles (all already built). The user can turn shuffle on from the Player, which keeps the current track playing.

What the queue is built from: the **whole library**, not the currently filtered or searched list. Tapping a card should not depend on which chips or search text happen to be active.

Tapping the card that is **already playing** rebuilds the queue around it (it keeps playing, nothing restarts) and opens the Player.

## 3. Design (three layers)

| Layer | File | Change |
|---|---|---|
| Business logic | `src/business/playback/queue.ts` | new pure `buildRelatedQueue(items, track)`: returns `[track, ...related]`, or `[track]` when nothing is related; no React, no store |
| Business hook | `src/business/library/useHomeScreen.ts` | `playTrack(item)` calls `playQueue(buildRelatedQueue(library, item), { shuffle: false })` when the result has more than one item, otherwise `loadTrack(item)` |
| Player store | unchanged | `playQueue` already sets the queue and starts the first track; auto-advance, prefetch of the next track, repeat and shuffle all already work on it |
| Presentation | unchanged | the Player already shows the queue controls and panel whenever a queue exists |

No data-layer change, no new dependency, nothing stored.

## 4. Tests

`queue.test.ts` (pure logic): track with no genres returns only itself; related items with a shared genre follow the track in library order; the tapped track is first even when it is not first in the library; genre matching ignores case; an item sharing any one of several genres is included; items with no overlapping genre are excluded; the tapped track is not duplicated; the input is not modified.

The store behaviour behind it (`playQueue`, auto-advance) is already covered by the existing store tests. The hook has no automated tests (no component/hook test setup); checked on the emulator.

## 5. Decisions I made without asking

| # | Decision | Alternative |
|---|---|---|
| 1 | "Related" = shares **any** genre | Shares **all** of the tapped item's genres (stricter, shorter queues) |
| 2 | Queue order = tapped item first, then library order, not shuffled | Shuffled by default; or start at the tapped item's position in the list and wrap around |
| 3 | Completed items are included | Skip completed items (avoids replaying finished episodes, but surprises when a queue is shorter than the genre count) |
| 4 | Built from the whole library | Built from the list currently shown (respects search and chips) |
| 5 | Always on, no setting | A setting to switch auto-queueing off |
| 6 | Items without a genre play alone | Queue every item |

## 6. Risks

- A genre with many items makes the queue long; the playlist panel scrolls, and only the next track is resolved ahead of time, so length costs nothing at start.
- Playing a completed item in the middle of a queue starts it from 0:00 (the existing rule for completed items).
- Tapping a card in a genre now always opens a queue; someone who wants a single track must give it a unique genre or no genre. Decision 5 is the fix if this is unwanted.

## 7. Implementation notes

Built as proposed: `buildRelatedQueue` in `src/business/playback/queue.ts` (5 new tests, 177 in total) and `playTrack` in `useHomeScreen`. The store and the Player UI needed no change.

Checked on the emulator (both saved items share the tag "podcast"): tapping the second card opens the Player with the playlist panel "1 / 2", the tapped track first and the other queued after it; Next moves to the other track ("2 / 2"). Not checked on the device: a track whose tag nobody else shares (plays alone, no panel) and auto-advance at the natural end of a track in this flow (both covered by the existing store tests, and the end-of-track advance was verified on the emulator earlier).
