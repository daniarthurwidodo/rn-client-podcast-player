# Walkthrough — How to Use Podcast Player

This guide describes the app as it is built today (see `PRD.md`, requirements F1 to F32). It was written from the requirements and the code, not by trying every step on a device, so check a step against the app if one looks off. Android only.

## 1. What the app does

You paste a link to a talk, interview or podcast (currently YouTube). The app finds the audio on your phone, plays it with the screen off, and remembers where you stopped. There is no account and no server: your library and progress stay on the device.

## 2. First launch

You land on **Home** ("Podcasts"). The list is empty and says "Tap Paste URL to add a link". The first time you start playback, Android 13 and later asks for notification permission; it is only used for the lock-screen controls. If you say no, audio still plays.

## 3. Add a link

1. Copy a link in your browser or the YouTube app.
2. Back in the app, tap **Paste URL** (the floating button). The app reads the clipboard and opens the **Paste URL** window with the link filled in.
3. Tap **Add**. The app checks the link ("Checking URL...") and saves it with its title and thumbnail.

Notes:
- Only `http` and `https` links are accepted. If the clipboard has no valid link, the window opens empty with a message, and you can type or paste one yourself.
- If the title cannot be loaded, the link is **not** added and you see an error; check the link and your connection.
- Adding a link you already saved does nothing (the window just closes).
- Tap **Cancel** to close the window without adding.

## 4. Play something

- Tap a card. The Player screen opens and the audio starts. Tapping the same item again does not restart it.
- On the Player screen: play/pause, the progress bar (tap or drag to jump), elapsed and total time, **back 15 s** and **forward 30 s**, and the **speed** chip (1×, 1.25×, 1.5×, 2×, 0.75×).
- If loading fails, an error with a **Retry** button appears. Retry fetches a fresh stream, so use it if a link that worked before now fails.
- Leave the Player screen and a **mini player** stays at the bottom of the app. Tap it to return.
- The audio keeps playing with the screen off, and the lock screen shows the title, the artwork and the controls. It also plays when the phone is on silent or vibrate.

## 5. Pick up where you stopped

The app saves your position about every 5 seconds, and when you pause, switch track or stop.

- Open an item you left partway through and it jumps to where you stopped.
- An item you barely started (under 5 seconds), or finished (within 10 seconds of the end), starts from the beginning.
- Each card shows its state: **Unplayed**, a time with a percentage while in progress, or **Completed**.

## 6. Find things

Under the title on Home:

- **Search:** type in the field to filter by title, genre or link. Case and accents are ignored, and every word you type must match somewhere in the item.
- **Progress chips:** **All**, **Unplayed**, **In Progress**, **Completed**, each with a count.
- **Genre chips:** the first three genres, then **Show more** / **Show less**. They combine with the progress chips.

The counts on the chips ignore the search text.

## 7. Genres and playlists

Genres are tags you make up. They also build playlists for you.

1. Long-press a card, or tap its genre badges or **+ Genre**, to open the **Genres** sheet.
2. Type a name under **New genre** to add it, or pick one under **Your genres**. Tap one to remove it. Names are not case-sensitive. Tap **Done** to close.
3. Tap a card that shares a genre with other items: the app queues those items after it (library order), and moves on by itself when a track ends. With no match, it plays alone.

On the Player screen with a queue you also get **previous**, **next**, **shuffle** (works mid-playback), and **repeat** (off, then all, then one), plus a **Playlist** list. Tap a track in the list to jump to it.

## 8. Delete an item

Tap the ✕ on a card. There is no confirmation and no undo. If it was the playing item, playback stops. Its saved position is kept.

## 9. Things that do not exist (yet)

- The Explore, Library and Downloads screens are placeholders and cannot be reached; there is no tab bar.
- No downloads or offline listening, no accounts or sync, no manual playlists, no iOS.
- The compressor and vocal-boost effects exist in the code but have no switch in the app.
- Playback speed is not remembered after you close the app.
- Only YouTube links are handled today; see the streaming-services proposal for the plan.

## 10. If something goes wrong

| What you see | What to do |
|---|---|
| "Could not load audio for this URL" | Tap **Retry**. If it keeps failing the site may have changed; it can break at any time. |
| "Could not load this URL. Check the link and your connection." when adding | Check the link opens in a browser and that you have a connection. |
| "Could not load/save your saved URLs / progress" | A short notice that clears itself after 5 seconds. Try the action again. |
| No lock-screen controls | Allow notifications for the app in Android settings. |
| Nothing on the clipboard | Copy the link first, then tap **Paste URL**; or type it. |

## 11. Screenshots

Two screenshots exist in `docs/` (Home, Player). The rest of the steps above have none yet.
