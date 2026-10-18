# Technical Solution Proposal — Resolved Audio Cache

Status: **Proposal, open questions decided (§8), nothing implemented.**

## 1. Problem

Tapping a saved item shows "Fetching audio info…" before anything plays, every time, even for a track the user played minutes ago.

Cause (verified in code):

- `SavedUrl` stores only `url`, `title`, `thumbnailUrl` (`lib/savedUrl.ts`). There is no playable stream address.
- `loadTrack` (`stores/createPlayerStore.ts`) calls `resolveAudio(track.url)` on every load. That runs the native NewPipe extractor (`AudioResolver.resolve` → `StreamInfo.getInfo`), which makes network requests to YouTube and picks the best m4a stream.
- Only after that does the player start loading audio ("Loading audio…"), then seek to the saved position.

What a cache can and cannot fix: it removes the **resolve** step only. Buffering the stream afterwards ("Loading audio…") is unchanged.

**Not measured yet.** I have not timed the resolve step; "a few seconds on the emulator" was an impression. Phase 1 below measures it before anything is built.

## 2. Why not just store the stream URL in `SavedUrl`

Stream URLs are short-lived and signed. A permanently stored one would eventually fail. So the cached value needs an expiry and a safe fallback, and it should live apart from the saved list so the library schema stays stable and the ephemeral data is easy to drop.

## 3. Proposed solution

### 3.1 Cache entry

Stored per source URL, in its own AsyncStorage key (same pattern as `lib/progressStorage.ts`):

```
resolved-audio: { [sourceUrl]: { audio: ResolvedAudio, expiresAt: number } }
```

`ResolvedAudio` is the existing type from `modules/newpipe-resolver` (url, title, mimeType, contentLength, thumbnailUrl).

### 3.2 One wrapper, two consumers

A cached `resolveAudio` replaces the direct native call in **both** places that use it today:

- `stores/playerStore.ts` (composition root → injected into `createPlayerStore`).
- `hooks/useSavedUrls.ts` (`addUrl` and title backfill).

Consequences:

- **Adding a URL fills the cache for free**, because `addUrl` already resolves once; the first play of a newly added item is then instant.
- `createPlayerStore` needs almost no change: it already receives `resolveAudio` by injection (R13a).

Behaviour of the wrapper `resolveAudio(url, { refresh })`, which returns the resolved audio plus `isFromCache: boolean` (additive, so existing consumers are unaffected; the store needs it for §3.4):

1. If `refresh` is false and a **fresh** entry exists → return it, no network.
2. Otherwise call the native resolver, store the result with a new `expiresAt`, return it.
3. On every write, drop already-expired entries, so the stored map stays small without a separate cleanup job.

### 3.3 Staleness: when is an entry "fresh"?

`now < expiresAt − SAFETY_MARGIN` (10 minutes, named constant). `now` comes from an injected clock so tests need no real time.

`expiresAt` options:

| Option | How | Verdict |
|---|---|---|
| A. Fixed TTL | `now + TTL` at resolve time (e.g. 1 hour) | Simple, no assumptions about URL format; conservative TTL wastes some hits |
| B. Read it from the URL | googlevideo URLs normally carry an `expire=<epoch seconds>` query parameter | Exact, but I am relying on memory of the URL format — must be checked on a real resolved URL first |

**Decision: A**, a fixed **5-hour** TTL (`RESOLVED_AUDIO_TTL_MS`), chosen after Phase 1 measured a 6-hour URL lifetime. Option B is not built; revisit only if Phase 1 shows the 1-hour TTL is too short to be useful.

### 3.4 When a cached URL turns out to be dead

The failure arrives asynchronously from the player (status `error`), not from `resolveAudio`. Handling:

- **Retry button** always bypasses the cache: `loadTrack` passes `refresh: true` when the previous phase was `error`, and the fresh result overwrites the stale entry.
- **One automatic retry, cached starts only** (decision, §8 Q3). The store remembers whether the current load used a cached entry (`startedFromCache`). If the player reports an error and that flag is set, the store clears it and reloads the same track once with `refresh: true`, staying in the `resolving` phase instead of showing the error. If that second attempt fails, or the first start was already fresh, the normal error + Retry button applies.
- This is deliberately narrow: it never loops, never retries a fresh start, and never retries mid-listen after playback was working (only an error that arrives before the audio has loaded counts, i.e. `isLoaded` was never true for this load; the store reaches `phase: 'ready'` as soon as `play()` is called, so `phase` alone cannot tell the two cases apart). That keeps it consistent with the earlier decision that retry is otherwise manual.

Implementation note: `loadTrack` is split so an internal `startTrack(track, { refresh })` does the work; the public `loadTrack` and the automatic retry both call it. The existing stale-load guard (`get().track?.url !== track.url`) is kept in both paths so switching tracks cancels a pending retry. The resume-position state (`resumeSeconds`, `isResumeSeekIssued`) is reset by `startTrack`, so the retried start resumes correctly.

### 3.5 Layering (R21)

- **Data:** `lib/resolvedAudioStorage.ts` (AsyncStorage read/write of the map, with parsing/validation like `parseProgressByUrl`).
- **Logic:** `lib/resolvedAudioCache.ts` — pure functions plus a `createCachedResolveAudio({ resolve, storage, now })` factory. No React, no AsyncStorage import.
- **Composition:** one small module wires native resolver + storage + `Date.now` and exports the `resolveAudio` both consumers import.
- Presentation is untouched.

### 3.6 Known limits (to verify, not assumed)

- Stream URLs may be tied to the requester's IP. After switching Wi-Fi ↔ mobile data a cached URL could fail. The failure path (§3.4) covers it; worth one manual test.
- Cached URLs are capability links stored unencrypted in AsyncStorage. They expire within hours, so I consider the exposure low; flagging it for the review.
- AsyncStorage holds one key for the whole map, so writes are read-modify-write. The wrapper keeps the map in memory after first load and writes through, so concurrent resolves (e.g. title backfill running while a track loads) cannot overwrite each other with stale copies.

### 3.7 Pre-resolve the last played track at app start (decision: now)

Goal: the most likely tap is already cached when the user opens the app.

- **Gap found:** nothing records which track was played last (`progressByUrl` has positions but no recency). Add one small persisted value, `lastPlayedUrl`, written when a track starts loading. Stored in its own AsyncStorage key through the same storage module as the cache, so no change to the saved-list or progress formats.
- **Trigger:** once at startup after the saved list has loaded, if `lastPlayedUrl` is still in the saved list, call the cached `resolveAudio(lastPlayedUrl)` (no `refresh`). If a fresh entry exists this costs nothing; otherwise it makes one background request.
- **Failure is silent on purpose:** pre-resolve is best-effort; offline at launch must not show any error. The catch is intentional and commented as such (R8 exception: nothing depends on the result).
- **Cost:** at most one extra resolve per app start, and none while a fresh entry exists (a re-launch within the hour is free).
- It must not touch player state or the UI; it only warms the cache.

## 4. Alternatives considered

- **Memory-only cache.** Rejected by decision (§8 Q1): the main case, open app → tap yesterday's track, would still wait.
- **Resolve on touch-down (`onPressIn`).** Saves only a few hundred milliseconds; not worth the extra code.
- **Store the stream URL inside `SavedUrl`.** Rejected, see §2.
- **Read the expiry from the URL (option B, §3.3).** Not built; the fixed TTL is enough to start.

## 5. Affected files

| File | Change |
|---|---|
| `lib/resolvedAudioCache.ts` (+ test) | New: freshness check, entry parsing, `createCachedResolveAudio` |
| `lib/resolvedAudioStorage.ts` | New: AsyncStorage load/save of the cache and of `lastPlayedUrl` |
| `lib/resolveAudio.ts` (name open) | New: composition of native resolver + storage + clock |
| `stores/createPlayerStore.ts` (+ test) | `resolveAudio` takes `{ refresh }`; `startTrack` split out; `startedFromCache` flag and the one automatic retry; `refresh: true` when retrying from `error`; records `lastPlayedUrl` |
| `stores/playerStore.ts`, `hooks/useSavedUrls.ts` | Import the cached `resolveAudio`; the startup pre-resolve runs from one of them or the root layout (to settle in Phase 3) |
| `PRD.md` | Document the cache and the Retry-bypasses-cache rule |

No native changes, no new dependencies, no change to the saved-list format.

## 6. Test plan (R25)

Cache logic, with a fake resolver, fake storage and fake clock:

- Miss → calls the resolver once and stores the entry.
- Fresh hit → returns the stored audio, resolver not called.
- Entry inside the safety margin → treated as stale, resolver called.
- `refresh: true` → resolver called even when fresh, entry overwritten.
- Expired entries are dropped on write.
- Resolver failure → error propagates, nothing stored, an older entry is kept untouched.
- Corrupt or wrongly shaped stored data → treated as empty, no crash (boundary validation, R1).
- Two overlapping resolves for different URLs both end up stored.

Store:

- `loadTrack` normally calls `resolveAudio(url, { refresh: false })`.
- `loadTrack` from the `error` phase calls it with `refresh: true`.
- Cached start + player error before playing → exactly one automatic reload with `refresh: true`, phase stays `resolving`, no error shown; it then reaches `ready`.
- Cached start, error again on the reload → ends in `error` (no second automatic retry).
- Fresh (non-cached) start + player error → `error` immediately, no automatic retry.
- Switching to another track while the automatic retry is pending → no state written for the old track.
- Error after playback was already working → not retried automatically.
- `lastPlayedUrl` is saved when a track starts loading.

Pre-resolve (with fakes): runs once at startup for a saved `lastPlayedUrl`; does nothing when there is none or the URL is no longer in the saved list; does not call the resolver when a fresh entry exists; a resolver failure produces no error and no unhandled rejection.

Manual (emulator): play a track, go back, tap it again and compare the wait before/after; add a new URL and play it at once; switch Wi-Fi off and on between plays to check the IP-binding concern in §3.6 (a dead cached URL should end in the error state, and Retry should then play).

## 7. Phasing

1. **Phase 1 — Measure.** Temporary timing around `resolveAudio` on the emulator, and one look at a real resolved URL (is there an `expire=` parameter, what lifetime?). Output: numbers that confirm the cache is worth it and sanity-check the 1-hour TTL. No code kept.
2. **Phase 2 — Cache logic + storage** with tests, not yet wired in.
3. **Phase 3 — Wire it in:** composition module, `useSavedUrls`, store `refresh` flag. (The `startTrack` split moved to Phase 4, the only phase that needs it.)
4. **Phase 4 — Automatic retry once** (`startedFromCache`), with tests.
5. **Phase 5 — Pre-resolve at start** (`lastPlayedUrl`, startup trigger), tests, PRD update, emulator check.

Stop for review after each phase.

## 8. Decisions

1. **Persist** the cache to AsyncStorage.
2. **TTL:** fixed **5 hours** (was 1 hour before Phase 1 measured the URL lifetime at 6 hours).
3. **Stale cached start:** one automatic refresh-and-retry (cached starts only), then the normal error + Retry button.
4. **Pre-resolve the last played track at app start:** yes, now.

## 9. Phase 1 findings (measured on the emulator, 2 resolves, Wi-Fi)

| Measure | Result |
|---|---|
| `resolveAudio` duration | **2.5 s** and **1.6 s** |
| URL expiry (`expire` query parameter) | present; **now + 21 600 s (exactly 6 hours)** in both samples |
| IP in URL (`ip` query parameter) | present, so the URL is bound to the requester's IP (confirms the §3.6 concern) |
| URL parameters seen | `expire, ei, ip, id, itag, source, requiressl, …, sig, lsig, cpn` |

What this means:

- The cache would save roughly **1.5–2.5 s per tap** on this network. Two samples only; real-world numbers will vary with connection and YouTube's response time. The "Loading audio…" buffering step that follows is not measured and not affected.
- The original 1-hour TTL was very conservative against a 6-hour lifetime, so it was raised to **5 hours** (decided after this phase).
- IP binding means that after switching network (Wi-Fi ↔ mobile data) a cached URL can fail. The automatic retry-once from §3.4 covers that case.
- The URL carries `expire` explicitly, so option B (read it from the URL) is feasible later if a fixed TTL ever proves wrong.

No code from this phase was kept.

## 10. Phase 2 status — done

Built and tested, **not wired in yet**:

- `lib/resolvedAudioCache.ts`: TTL and margin constants, entry validation (`parseCacheEntries`), `isFresh`, `pruneStale`, and `createCachedResolveAudio({ resolve, storage, now })`.
- `lib/resolvedAudioStorage.ts`: AsyncStorage load/save under the key `resolved-audio` (no test, same as `progressStorage`).
- `lib/resolvedAudioCache.test.ts`: 14 tests.

Implementation details worth knowing for review:

- Saves are queued one after another, so an older snapshot can never overwrite a newer one when two resolves overlap.
- Cache problems never fail playback: an unreadable cache is treated as empty, and a failed save only means a miss next time. Both are intentional, commented catches.
- A resolver failure rejects and leaves the stored entries untouched.

## 11. Phase 3 status — done

- `lib/resolveAudio.ts`: composition of native resolver + storage + `Date.now`; the only place the cache is assembled.
- `stores/playerStore.ts` and `hooks/useSavedUrls.ts` import it instead of the native module. Adding a URL therefore fills the cache.
- `createPlayerStore`: `resolveAudio(url, { refresh })`. `refresh` is true only when the same track is reloaded from the `error` phase (Retry); a different track after a failure still uses the cache.
- 3 new store tests (90 tests total).

Checked on the emulator: after playing two tracks, `resolved-audio` exists in the app's storage with both entries and about 4.99 h left (read without printing any URLs). A tap on a cached track reached playback in about 2 s including the screen transition and resume seek.

Not done: a clean before/after timing. The screenshots are too coarse to claim a precise saving, so the 1.6–2.5 s figure from Phase 1 remains the estimate.
