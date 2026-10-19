# Technical Solution Proposal — Minimal Video Playback

Status: **Proposed, not implemented.** Nothing here has been built or tested on a device.

## 1. Goal

Let the user watch the video of a saved item from the Player screen, without changing how audio playback, the queue or progress work.

Out of scope for this version (see §7): video in the queue, background video, picture-in-picture, custom controls, saving video position, quality selection.

## 2. What exists today

- `modules/newpipe-resolver` (Kotlin) reads only `info.audioStreams` and returns one progressive m4a URL (`AudioResolver.kt`).
- Playback is `expo-audio` behind `AudioPlayerPort`; `expo-video` is not installed.
- `PlayerScreen` shows the thumbnail, the title and `AudioPlayer`.

## 3. Approach

Video is a separate, on-demand mode of the Player screen. It does not go through the player store.

1. The user taps **Watch video**. The audio is paused (the store's `togglePlayback`) so the two do not play at once.
2. The app resolves a **muxed progressive** video stream (audio and video in one file) for the current track's URL. Muxed means no merging of separate audio and video streams, which is what keeps this version small. The cost is quality: on YouTube muxed streams are usually capped at 360p/720p.
3. A `VideoView` from `expo-video` replaces the thumbnail and plays the stream with native controls.
4. Closing the video (or loading another track) releases the video player. Audio stays paused where it was; the user resumes it with the normal controls.

No cache: the video URL is resolved on every tap, so the resolved-audio cache is untouched.

## 4. Where each piece goes (three layers)

| Layer | File | Change |
|---|---|---|
| Data (native) | `modules/newpipe-resolver/android/.../AudioResolver.kt` | Add `resolveVideo(videoUrl)`: from `info.videoStreams` (muxed, not `videoOnlyStreams`), keep `PROGRESSIVE_HTTP`, take the highest resolution. New `NoPlayableVideoException`. |
| Data (native) | `NewPipeResolverModule.kt` and `modules/newpipe-resolver/index.ts` | Expose `resolveVideo` and a `ResolvedVideo` type (`url`, `mimeType`). |
| Business | `src/business/resolve/resolveVideo.ts` | Wires the native call, like `resolveAudio.ts` (no cache). |
| Business | `src/business/video/useVideoMode.ts` | One hook: `status` (`idle` / `loading` / `ready` / `error`), `videoUrl`, `start()`, `stop()`. `start` pauses audio through `usePlayerStore`, then resolves. It resets to `idle` when the current track changes. |
| Presentation | `src/presentation/components/VideoPanel.tsx` | `useVideoPlayer(videoUrl)` + `VideoView` (`nativeControls`, `contentFit="contain"`, 16:9 like the thumbnail). |
| Presentation | `src/presentation/screens/PlayerScreen.tsx` | A **Watch video** button; shows `VideoPanel` instead of the thumbnail while `status` is `ready`; `ErrorMessage` on `error`. |
| Config | `package.json`, `app.json` | `npx expo install expo-video`; add `"expo-video"` to `plugins` (no `supportsBackgroundPlayback`, no `supportsPictureInPicture`). |

`expo-video` is imported in presentation only (rendering). The lint rules already allow that: they forbid `expo-*` in business and only a list of storage/audio/clipboard/notification packages in presentation. No lint change.

## 5. Phases (one reviewable chunk each, stop after each)

1. **Resolver.** Kotlin `resolveVideo`, module export, TS wrapper, `business/resolve/resolveVideo.ts`. Done when: lint and `tsc` pass, and a throwaway call from a dev build returns a playable URL for a known video. Needs a dev build.
2. **Business hook.** `useVideoMode` with the audio pause and the reset on track change. Done when: lint and `tsc` pass; the state changes (`idle` to `loading` to `ready` or `error`, and reset on track change) are tested if they can be pulled into a pure function, otherwise checked by hand.
3. **UI.** Install `expo-video`, plugin entry, `VideoPanel`, the button and the `PlayerScreen` change. Done when: lint, `tsc` and `npm test` pass and a new dev build plays a video on a device.
4. **Docs.** `PRD.md` requirement row, `README.md` features list, move this file's status to Implemented, remove the README TODO.

## 6. Risks and unknowns (none checked on a device)

- **Muxed streams may be missing or low quality.** If a video has no progressive muxed stream, `resolveVideo` throws and the user sees the error message. The fallback (merge video-only + audio) is §7.
- **Stream URLs expire.** Not cached, so fine for one viewing; a long pause may need a re-tap.
- **Native change needs a new development build**, not just a JS reload. Expo Go cannot run this app anyway.
- **Android only**, like the rest of the native code.
- **Kotlin has no tests in this repo**, so the stream selection is verified by hand.
- **Mobile data use**: video is much larger than audio; there is no warning in this version.

## 7. Decisions for you / later

- Quality: this plan takes the highest muxed resolution. Say if you want a cap (for data use).
- Position: video starts at 0, and closing it does not move the audio position. Syncing the start from the audio position (and back) is a small follow-up.
- Later, not in this plan: video in the queue and the store, background video, picture-in-picture (`supportsPictureInPicture`), merging video-only + audio for higher quality, saving video progress.

Docs checked: `expo-video` for SDK 58 (`useVideoPlayer`, `VideoView`, config plugin options).
