# Technical Solution Proposal — More Streaming Services

Status: **Proposed, not implemented.** Nothing here has been built or tested on a device. Several claims below are marked *unverified*; Phase 1 exists to settle them.

## 1. Goal

Accept links from more than YouTube, with each service's code kept separate (one file or module per service) so a service can be added or removed without touching the others.

You named: YouTube Music, Spotify, Dailymotion, Bilibili (TV), Crunchyroll, "etc.". They are not equally possible, so §3 sorts them first.

## 2. What exists today (verified in the code)

- One local Expo module, `modules/newpipe-resolver`, built on NewPipe Extractor `v0.26.5` (`android/build.gradle`).
- `AudioResolver.kt` calls `StreamInfo.getInfo(url)` and keeps only a **progressive m4a** audio stream (`MediaFormat.M4A` + `DeliveryMethod.PROGRESSIVE_HTTP`), highest bitrate. Otherwise it throws `NoPlayableAudioException`. That rule is YouTube's; other services deliver other formats.
- The rest of the app does not know about YouTube: `parseHttpUrl` accepts any `http(s)` URL, `getHostLabel` shows the host, the cache is keyed by URL, and the player only sees a stream URL. The only YouTube-specific code is the picker rule above.
- Any resolve failure becomes one generic message ("Could not load audio for this URL"); an unsupported site and a network failure look the same.

## 3. Which services are possible

| Service | Can this architecture play it? | Why |
|---|---|---|
| **YouTube Music** | **Likely yes** (*unverified*) | The NewPipe project lists it together with YouTube. `music.youtube.com` links should go through the same YouTube service. Phase 1 confirms it. |
| **SoundCloud, Bandcamp, PeerTube, media.ccc.de** | **Yes in principle** | These are the other services in NewPipe Extractor's service list (YouTube, SoundCloud, media.ccc.de, PeerTube, Bandcamp). They are already in the library we ship; only the stream-picking rule is YouTube-only. The extractor's README notes the project is in maintenance mode. |
| **Dailymotion, Bilibili** | **Not with the current library** (*not confirmed either way: my searches did not show them in NewPipe Extractor*) | They would need a different extractor: their own Kotlin code against the sites' APIs, or a general tool such as yt-dlp (Python on Android, much heavier). Each needs its own feasibility check and is a separate project. |
| **Spotify** | **No** | Its streams are DRM-protected (*unverified here*), and playing them needs the user's account and Spotify's licence, not a public stream URL. |
| **Crunchyroll** | **No** | Reported to use Widevine/PlayReady DRM, and the unprotected endpoints are reported to be gone (community sources, not official). It is also a paid video service. |

This plan covers the first two rows. The DRM services are left unsupported on purpose, with a clear message instead of a generic error.

## 4. Approach

- **"Submodule" is read here as one provider per service inside the codebase**, not a separate git repository (see decision 1). All five NewPipe services share one library and one global `NewPipe.init(downloader)`, so they stay in **one** native module; splitting that into several Expo modules would only duplicate the setup.
- **Kotlin: a picker per service.** A small `StreamPicker` interface (`pick(info): AudioStream`), one implementation per service (`YouTubePicker` = today's rule moved unchanged, then `SoundCloudPicker`, `BandcampPicker`, …), and a registry keyed by `info.serviceId` (YouTube 0, SoundCloud 1, media.ccc.de 2, PeerTube 3, Bandcamp 4, from the library's service list). `AudioResolver` stays the only entry point and picks the right one.
- **A new, distinct error for unsupported sites.** NewPipe throws when no service handles a URL; map that to its own error code, so the UI can say "This site isn't supported" instead of the generic failure. It needs a message key in the same way as the internationalization plan.
- **No JavaScript provider registry yet.** With one native module there is nothing to register. When a second, non-NewPipe module appears (Dailymotion/Bilibili), add a `resolveAudio` router in `src/data/` that picks a module by host. Building that now would be speculative.
- **Nothing changes for the cache, the stores, the queue or the stored data.** The service is derived from the URL when needed, not saved, so there is no storage migration.

## 5. Where each piece goes (three layers)

| Layer | File | Change |
|---|---|---|
| Data (native) | `modules/newpipe-resolver/android/.../StreamPicker.kt` and one `<Service>Picker.kt` each (new) | The interface, and the per-service rule. `YouTubePicker` is the code now in `AudioResolver`, moved unchanged. |
| Data (native) | `AudioResolver.kt` | Looks up the picker by `info.serviceId`; throws the unsupported-site error for a service without one. |
| Data (native) | `NewPipeResolverModule.kt`, `modules/newpipe-resolver/index.ts` | New error code for "unsupported site"; optional `service` string in the result if the UI needs it. |
| Business | `business/messages.ts` (from the i18n plan) | A new key for the unsupported-site message. Without the i18n plan: one new constant next to `RESOLVE_ERROR_MESSAGE`. |
| Presentation | none required | Host label and list already work for any host. A service badge is optional (decision 3). |

## 6. Phases (one reviewable chunk each, stop after each)

1. **Spike, no code kept.** In a development build, call the current `resolveAudio` on one sample link per NewPipe service (YouTube Music, SoundCloud, Bandcamp, PeerTube, media.ccc.de) and write down, for each: does it resolve, which formats does it offer, does the current picker reject it, does `expo-audio` play it (HLS in particular). Needs sample links from you and a dev build. Output: a table added to this file, which settles the *unverified* rows in §3.
2. **Split by service.** `StreamPicker`, the registry, `YouTubePicker` moved without behaviour change. Done when: the app still plays YouTube exactly as before on a device, lint, `tsc` and `npm test` pass. Kotlin has no tests in this repo, so this phase is checked by hand.
3. **Add the services Phase 1 shows are playable**, one picker per service, each checked on a device. A service the spike shows cannot be played is dropped, not forced.
4. **Unsupported-site error** end to end (Kotlin code, TypeScript, message). Done when: pasting a Spotify or Crunchyroll link shows the new message, not the generic one.
5. **Docs.** `PRD.md` requirement rows, `README.md` ("currently YouTube" and the features list), this file's status, and the README TODO.

Not planned here: Dailymotion and Bilibili. They need their own spike and a decision on the extractor (§3) before any phase can be written.

## 7. Risks and unknowns

- **The extractors break when sites change.** NewPipe Extractor is pinned at `v0.26.5` and described as in maintenance mode; each non-YouTube service can break independently and needs a version bump to fix.
- **Terms of service:** extracting streams from a site may breach that site's terms; this is a project decision, not a technical one. The DRM services are left out partly for this reason.
- **Format coverage** (HLS, webm/opus, mp3 progressive) depends on what `expo-audio` can play; Phase 1 tests it instead of assuming.
- **Video plan:** the minimal video plan picks a muxed stream; it would need the same per-service picker (a second method on `StreamPicker`). Build the interface with audio only now.
- **Some services serve video-only or live content**; they will hit the unsupported/failed path.
- **Native change** → new development build; Android only.

## 8. Decisions

You left the open questions to me, so these are the defaults taken. Overrule any of them before Phase 1.

1. **"Submodule":** per-service code inside this repo (a picker per service), not git submodules.
2. **Scope:** NewPipe's services only. Dailymotion and Bilibili stay a separate investigation, started only if you want them.
3. **Service badge:** no. Not needed to play anything; add it if the library gets confusing.
4. **Sample links:** **still open, and only you can answer it.** Phase 1 cannot start without one link per service you want.

The original questions, for reference:

1. **Meaning of "submodule":** per-service code inside this repo (recommended, as above), or separate git repositories/modules per service (git submodules)? The latter adds repo management for little gain while all services share one native library.
2. **Scope:** NewPipe's services only (this plan), plus an investigation into Dailymotion and Bilibili as a separate follow-up, or drop those two?
3. **Service badge** on library items (small UI change, needs the `service` field in the result)?
4. **Sample links** for Phase 1: one per service you actually want.

Sources for §3: NewPipe Extractor README ("Supported sites": YouTube, SoundCloud, media.ccc.de, PeerTube, Bandcamp); a third-party mirror of its service list (IDs 0 to 4); community reports on Crunchyroll's DRM. I did not find anything about Dailymotion or Bilibili in NewPipe Extractor, and nothing about Spotify's DRM.
