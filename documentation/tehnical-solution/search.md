# Technical Solution Proposal — Search on the Home Screen

Status: **Implemented** (you asked for the proposal and the implementation in one go, so there was no review stop). Choices made without asking are in §6 so you can overrule them. Implementation notes in §8.

## 1. Goal

Find a saved item quickly by typing. Today the Home list can only be narrowed with the progress chips and the genre chips; with a library of dozens of items there is no way to jump to one by name.

## 2. What it searches

The **saved library on the device** (the items on the Home list). Not YouTube, not the web: the app has no search API and no backend, so "search" means filtering what is already saved.

An item matches when **every typed word** is found in at least one of:
- its **title**,
- its **genres**,
- its **URL** (this also covers the host, such as `youtube.com`).

Matching rules:
- case-insensitive;
- accents ignored (`cafe` finds `Café`);
- words are separated by spaces, extra spaces are ignored, and a word can appear anywhere inside a title (substring, not whole-word), so `indie dev` finds "Most Indie Devs Release Too Late";
- an empty or whitespace-only query shows everything.

## 3. How it combines with the existing filters

Search is the **last step** of the list pipeline and only narrows the visible list:

```
saved items → genre filter → progress filter → search → visible list
```

- The chip counts (progress and genre) are **not** changed by the search text; they keep describing the library and the selected genre. This avoids chips jumping while typing.
- The Home Play / Shuffle buttons were removed in the same change (see §8), so nothing starts a queue from this list any more.
- Search text is not saved; it clears when the app restarts (it is per-session UI state, like the chip selection).

## 4. Design (follows the three layers)

| Layer | File | Change |
|---|---|---|
| Business logic | `src/business/library/search.ts` (new, + `search.test.ts`) | `searchItems(items, query)` and the normalisation it uses: pure, no React |
| Business hook | `src/business/library/useLibraryView.ts` | owns `query` / `setQuery` and applies `searchItems` as the last step; `useHomeScreen` passes it through unchanged (it already returns the whole `view`) |
| Presentation | `src/presentation/components/SearchBar.tsx` (new) | text field with a search icon and a clear button |
| Presentation | `src/presentation/screens/HomeScreen.tsx` | shows `SearchBar` under the paste bar (hidden while the library is empty); a "No matches" empty message when a search finds nothing; `keyboardShouldPersistTaps="handled"` on the list so a tap on a card works while the keyboard is open |
| Docs | `PRD.md` | new requirement row and Home table row |

No data-layer change, no storage, no new dependency.

Why not a debounce: filtering a list that is held in memory is a few microseconds per item, so the list updates on every keystroke without delay. If the library ever grows to many thousands of items this is the place to add one.

## 5. Tests

`search.test.ts` (pure logic): empty and whitespace-only query returns everything; case-insensitive title match; accent-insensitive match; every word must match (AND), in any order; a word matches inside a longer word; matches on genre; matches on URL/host; no match returns nothing; order of the input is preserved; the input list is not changed.

Not covered by automated tests: the `SearchBar` component and the Home wiring (the project has no component test setup); checked on the emulator instead.

## 6. Decisions I made without asking

| # | Decision | Alternative |
|---|---|---|
| 1 | Search the title, genres and URL of saved items | Titles only (simpler, but `youtube.com` or a genre name would not find anything) |
| 2 | Search is a plain field under the paste bar, always visible when the library is not empty | A search icon in the header that expands (saves vertical space, one more tap) |
| 3 | Chip counts ignore the search text | Counts that follow the search (more informative, but chips jump while typing) |
| 4 | Not remembered across launches | Persist the last query (rarely wanted) |
| 5 | Substring matching, no fuzzy matching (typos are not forgiven) | Fuzzy match (needs a scoring function or a library; not worth it for a personal library) |

## 7. Risks

- **Vertical space:** the Home screen already has the paste bar, two chip rows and (with a genre selected) Play/Shuffle above the list. One more row costs about 48 px; on small phones the list gets shorter. Alternative 2 in §6 is the fix if this feels cramped.
- **Keyboard covering the list:** the list shrinks with the keyboard; tapping a card with the keyboard open must still work (handled by `keyboardShouldPersistTaps`), checked on the emulator.

## 8. Implementation notes

Built as proposed: `searchItems` in `src/business/library/search.ts` (11 tests, 172 in total), `query` and `setQuery` in `useLibraryView`, `SearchBar`, and the Home wiring (`keyboardShouldPersistTaps="handled"`, a "No matches for …" message).

Checked on the emulator: the field appears under the paste bar; "indie" leaves one card; "zzz" shows `No matches for "zzz"`; the clear (x) button empties the field and restores both cards; with the keyboard open, one tap on a card opens the Player.

**Removed in the same change (separate request): the Play and Shuffle buttons on Home** (`GenrePlayActions` is deleted and `useHomeScreen` no longer exposes `playVisibleAsQueue`). Consequence at the time: Home had no way to start a genre queue. That was resolved afterwards by the auto playlist by tag (tapping a card queues the other items that share a genre), see `auto playlist by tag.md`.
