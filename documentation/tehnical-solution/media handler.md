# Technical Solution Proposal — Media Handler (split audio and video)

Status: **Proposed, not implemented.** Nothing here has been built or tested on a device.

Builds on two other proposals: [video playback.md](video%20playback.md) (the video player) and [streaming services.md](streaming%20services.md) (a stream picker per service). This one decides **which of the two a link gets**. It should be built after video playback Phase 3 and streaming services Phase 2.

## 1. Goal

When a link is opened, one place decides whether it plays as **audio**, as **video**, or as audio with video available, and routes it to the matching player. Today everything is assumed to be audio; the video plan adds video as an extra button, and more services (streaming services plan) will bring links that only have video or only have audio.

I read "handler" as that decision point (the media kind and routing). If you meant something else, say so; see §8.

## 2. What exists today (verified in the code)

- `resolveAudio(url)` returns one audio stream or throws `NoPlayableAudioException`. There is no concept of "this link has no audio".
- `trackLoader.ts` always resolves audio and hands it to `expo-audio` through the player store. A link without an audio stream ends in the generic error state.
- `SavedUrl` holds `url`, `title`, `thumbnailUrl`, `genres`; nothing says audio or video. The resolved-audio cache stores audio resolutions only.

## 3. Concept

Three kinds, decided from what the service offers for that link:

| Kind | What the link has | Plays as |
|---|---|---|
| `audio` | an audio stream, no usable video (SoundCloud, Bandcamp, YouTube Music) | audio player, as today |
| `both` | an audio stream and a muxed video stream (YouTube, PeerTube, media.ccc.de) | audio player by default, **Watch video** button |
| `video` | a video stream, no audio-only stream (possible future Dailymotion/Bilibili) | video panel only; the audio store is not used |

If neither exists, the link fails with the same error as today.

## 4. Approach

- **Resolver returns both, as optional parts.** The native result becomes `{ title, thumbnailUrl, audio?: { url, mimeType, contentLength }, video?: { url, mimeType } }`. The stream picker from the streaming-services plan gets a second method: `pickAudio(info)` and `pickVideo(info)`, each returning nothing instead of throwing; the resolver throws only when both are missing.
- **The handler is one pure function in the business layer**, `getMediaKind(resolved)`, returning `audio`, `both` or `video` from which parts are present. It is the only place that knows the rule, and it is unit-tested on plain Node.
- **Routing in the track loader.** After resolving, `audio` and `both` follow the existing audio path unchanged. `video` skips the audio player and opens the video panel (the `VideoPanel` and `useVideoMode` from the video plan). The Watch video button shows only for `both`.
- **Kind is not saved.** It is worked out each time a link is resolved, so there is no change to stored data or its parsers. The cost is that the library list cannot show a video/audio icon before the link has been opened (decision 2).
- **Caching:** the existing cache keeps storing the audio part. The video part is not cached (as in the video plan), so a `video`-only link is resolved on every open.

## 5. Where each piece goes (three layers)

| Layer | File | Change |
|---|---|---|
| Data (native) | `StreamPicker.kt` and the per-service pickers (from the streaming-services plan) | `pickAudio` / `pickVideo`, both optional. |
| Data (native) | `AudioResolver.kt` → `MediaResolver.kt`, `NewPipeResolverModule.kt`, `index.ts` | Returns the optional `audio` and `video` parts; throws only when both are missing. |
| Business | `src/business/resolve/mediaKind.ts` (+ test) | `getMediaKind(resolved)` — the handler. |
| Business | `src/business/resolve/resolveAudio.ts` and `resolveVideo.ts` (from the video plan) | Merge into one `resolveMedia`, with the cache still applied to the audio part. |
| Business | `src/business/stores/trackLoader.ts` | Route by kind after resolving; a `video` link never reaches the audio player. |
| Business | `src/business/video/useVideoMode.ts` | Starts automatically for a `video` link; exposes the kind so the UI shows or hides the button. |
| Presentation | `PlayerScreen` | Watch video button only for `both`; video panel instead of the thumbnail for `video`; the audio controls are hidden for `video`. |

## 6. Phases (one reviewable chunk each, stop after each)

1. **Result shape and handler.** `getMediaKind` with its tests (audio only, both, video only, neither), and the optional-parts TypeScript type. No native change yet; the current audio result maps to `audio`/`both` as a stand-in. Done when: lint, `tsc` and `npm test` pass.
2. **Native optional parts.** `pickAudio` / `pickVideo`, `MediaResolver`, module result. Done when: YouTube still plays as audio on a device, and a link with a muxed video returns both parts. Needs a dev build.
3. **Routing in the loader and the UI.** `trackLoader` by kind, the button for `both`, the video-only screen. Done when: each of the three kinds is played on a device with a real link, and lint, `tsc` and `npm test` pass.
4. **Docs.** `PRD.md`, `README.md` (and its TODO), and the status of the three proposals.

## 7. Risks and unknowns (none checked on a device)

- **A `video`-only link cannot be in the audio queue.** The queue, auto-advance, progress saving, lock-screen controls and background playback are all built on the audio player. The first version must either skip such items when advancing, or refuse to add them to a queue (decision 3).
- **No `video` links exist yet.** With YouTube, YouTube Music, SoundCloud and Bandcamp every link has audio. The `video` kind only matters once Dailymotion or Bilibili (not planned, see the streaming-services plan) are added, so this proposal may be more than the app needs today. The part that pays off now is `both` versus `audio`, which controls whether the Watch video button appears.
- **Wider native change:** it changes the result type of the native module, so the existing cache entries, the parsers and the tests that use `ResolvedAudio` need an update.
- **Muxed video is often missing or low quality** (see the video plan).
- **Native change** → new development build; Android only.

## 8. Decisions

You left the open questions to me, so these are the defaults taken. Overrule any of them before Phase 1.

1. **Meaning of "handler":** the audio / video / both decision point described above.
2. **Library icon:** no. The kind is not saved, so stored data does not change.
3. **Video-only links in queues:** skipped when the queue advances; they play one at a time from the list.
4. **Build order and merging:** do not merge into the video plan, and **build this last, only when a service with video-only links is actually added.** Until then the minimal video plan covers `audio` versus `both` by itself, and this proposal would be code with no user.

The original questions, for reference:

1. **Is this what "handler" meant?** Here it is the decision point that classifies a link as audio, video or both and routes it. Alternatives: a per-service handler (that is the streaming-services plan), or a user choice at add time ("save as audio / as video").
2. **Show the kind in the library** (an icon on each row)? It needs the kind to be saved on each item, which changes stored data and its parser; otherwise it is only known once the link has been opened.
3. **Video-only links in queues:** skip them when advancing, or play them only one at a time?
4. **Build order:** video plan, then streaming services, then this; or merge the handler into the video plan's Phase 1 to avoid reworking the resolver twice? Merging saves one native change, at the cost of a larger first phase.
