# Technical Solution Proposal — Retry & Error Clearing

Status: **Proposal, open questions decided (§9), nothing implemented.** Closes PRD §8 items 5 ("Retry button on player error") and 6 ("Errors that auto-clear").

## 1. Problem

1. **No way to retry a failed track from the Player.** On `phase: 'error'` the Player shows red text only; the user must go back and tap the item again (PRD §6.2).
2. **Errors never clear.** `errorMessage` is only reset by `loadTrack` (via `IDLE_DATA`) or `stop()`. A failed seek, effect toggle or progress save leaves red text on the Player until the next track is loaded. The Home banner (`useSavedUrls.errorMessage`) never clears at all.
3. **One field, four meanings.** `createPlayerStore` uses a single `errorMessage` for resolve failure, playback failure, seek failure, effect failure and progress load/save failure. They have different severity but are rendered the same way, so none of them can be cleared on its own terms.
4. **Transient failures are treated as final.** A dropped connection during `resolveAudio` puts the track in `error` straight away. Decision: this is handled by the manual Retry button only, no automatic retry (§9).

## 2. What already exists (reuse, don't rebuild)

- `loadTrack(track)` already **re-runs the whole load when the same track is in `error`** (`phase !== 'error'` guard, PRD F8). A manual retry is therefore `loadTrack(track)` — no new store action is needed for that.
- Re-resolving is the right retry for playback errors too: stream URLs from NewPipe expire, so `player.replace(oldUrl)` can fail again where a fresh `resolveAudio` succeeds.
- Saved progress is already used on load (`getResumePosition`), so a retry resumes where the user stopped.
- The stale-load guard (`get().track?.url !== track.url`) already stops a late result from overwriting a newer track. Any retry loop must keep using it.

## 3. Constraint: errors cannot be classified today

`NewPipeResolverModule` wraps every failure in one `ResolveAudioException` (single `RESOLVE_FAILED_CODE`), so JS cannot tell "no network" from "no playable audio stream" or a reCAPTCHA block. Decision: keep one generic message (§9); no native change.

## 4. Proposed solution

### 4.1 Manual retry (user-driven)

- Add a **Retry** button under the error text in `app/player.tsx` (shown when `phase === 'error'`). It calls `loadTrack(track)`.
- The button belongs to the presentation layer; no logic moves into the component. `StatusMessage.tsx` gets an optional `onRetry` prop on `ErrorMessage`, or a small `RetryButton` next to it.
- Also surface the retry on the `MiniPlayer` error state? **Out of scope** for the first phase — tapping the mini player already opens the Player.

### 4.2 Automatic retry — dropped

Not built. Retrying stays manual so the user decides, and no retry loop or backoff helper is added.

### 4.3 Error model: separate fatal from transient

Split the single field in `PlayerData`:

| Field | Meaning | Set by | Cleared by |
|---|---|---|---|
| `phase: 'error'` + `errorMessage` | Track cannot play (fatal) | resolve failure, status `error` | `loadTrack` (retry or new track), `stop()` |
| `notice: string \| null` | Non-fatal, informational (seek, effect, progress load/save) | those handlers | **auto-clear timer**, or next successful action of the same kind |

Why a new field rather than reusing `errorMessage`: the Player must not show a fatal "cannot play" state and a "seek failed" toast as the same thing, and only the second should expire.

### 4.4 Clearing rules

1. **Fatal errors never auto-clear** — the user must act (Retry / back). Clearing them would hide the reason playback stopped.
2. **Notices auto-clear after 5 s** (`NOTICE_DURATION_MS`). The timer lives in the store: `setNotice(message)` sets the message and replaces any pending timer, so two failures in a row do not clear the second one early.
3. **Success clears its own notice immediately:** a successful seek clears the seek notice; a successful `toggleEffect` clears the effect notice; a successful progress save clears the save notice.
4. **Timers are cleared** in `stop()` and when the track changes, so a stale notice cannot appear on the next track.
5. **Dismiss by tap** on the notice text (one `clearNotice()` action) — cheap, and avoids waiting 5 s for a message the user has already read.
6. **Home banner** (`useSavedUrls.errorMessage`): same rule — clears after the same duration and on the next successful `commit`. Implemented in the hook with the same helper, not copied.

The timer helper is shared (`lib/` or a tiny hook) because the store and `useSavedUrls` both need it (R14: second consumer).

## 5. Affected files

| File | Change |
|---|---|
| `stores/createPlayerStore.ts` | Add `notice`, `setNotice`/`clearNotice` with timer; route seek/effect/progress errors to `notice` |
| `stores/createPlayerStore.test.ts` | New tests (see §7) |
| `app/player.tsx`, `components/StatusMessage.tsx` | Retry button |
| `components/AudioPlayer.tsx` | Render `notice` instead of `errorMessage` for non-fatal errors |
| `hooks/useSavedUrls.ts` | Auto-clear banner |
| `PRD.md` | Update §6.2, §6.4 text and §8 items 5–6 |

No native, schema or dependency changes.

## 6. Alternatives considered

- **Exponential retry forever / until online** — rejected: needs a connectivity library (`@react-native-community/netinfo`) and risks silent battery/network use. Bounded retry is enough.
- **Automatic bounded retry with backoff** — dropped by decision; manual retry is enough.
- **Retry button in the `MiniPlayer`** — deferred, see §4.1.
- **Global toast/snackbar system** — rejected as over-engineering for two surfaces; inline text with a timer does the job. It would also be the natural home for the open "undo delete" item (PRD §8 #1), so reconsider when that is picked up.
- **Keep one `errorMessage` and add a timer** — rejected: it would auto-clear fatal errors too (see §4.3).

## 7. Test plan (R25)

Using the existing injected fakes in `createPlayerStore.test.ts`:

- Retry from `error` via `loadTrack(sameTrack)` → back to `resolving`, resumes saved position.
- Notices: seek failure sets `notice` and not `phase`; clears after `NOTICE_DURATION_MS`; second failure restarts the timer; success clears the matching notice; `stop()` clears the timer.
- Fatal `errorMessage` is **not** cleared by time.

Manual: airplane mode on the emulator → tap an item → error → turn network on → Retry → plays.

## 8. Phasing

1. **Phase 1 — Manual retry button** (smallest, user-visible win; no store change).
2. **Phase 2 — Notice model + auto-clear** (store split, timer, `AudioPlayer` rendering, tests).
3. **Phase 3 — Home banner auto-clear** (`useSavedUrls`).

Each phase is independently shippable; stop for review after each.

## 9. Decisions

1. **Retry:** manual only. No automatic retry, no backoff.
2. **Notice duration:** 5 s.
3. **Permanent failures:** one generic message ("Could not load audio for this URL"); no native error codes.
4. **Retry button:** centred below the error text, primary (amber) style.
