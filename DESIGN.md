---
name: Acoustic Ember
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#1a1c20'
  surface-container: '#1e2024'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#d8c3ad'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#a08e7a'
  outline-variant: '#534434'
  surface-tint: '#ffb95f'
  primary: '#ffc174'
  on-primary: '#472a00'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#855300'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#56e5a9'
  on-tertiary: '#003824'
  tertiary-container: '#30c88f'
  on-tertiary-container: '#004e34'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#111317'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-time:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  gutter-desktop: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a high-fidelity, audiophile-grade mobile environment optimized for long-form speech, spoken-word broadcasts, and audio extractions from video. It merges a modern, precision-engineered dark aesthetic with warm analog cues reminiscent of professional mixing consoles and high-end tube gear.

### Personality & Tone
- **Focused & Acoustic:** Pure matte dark surfaces eliminate visual clutter and reduce optical fatigue during extended listening sessions in dim environments.
- **Tactile & Precise:** Elements communicate physical weight and responsive elasticity. Sliders, toggles, and transport controls feel mechanical, responsive, and grounded.
- **Intelligent Utility:** Audio enhancements (vocal isolation, dynamic compression, tempo compensation) are presented not as esoteric engineering tools, but as tactile, intuitive controls.

### Design Movement & Influence
The design system draws from **Tactile Minimalism** and **Modern Skeuomorphic Precision**:
- High-contrast typography paired with deep, tinted charcoal layers.
- Sculpted pill-shaped interactions with subtle perimeter hair-lines.
- Warm vacuum-tube amber accents contrasting against deep, noiseless slate.

## Colors

The palette is tuned specifically for OLED and modern mobile displays, providing deep optical depth without harsh uncalibrated pitch-black clipping.

### Palette Architecture
- **Primary (`#F59E0B` - Warm Amber):** Represents active energy, warmth, and sound output. Used for active scrubbers, playheads, current playback status, vacuum-boost states, and live waveform highlights.
- **Secondary (`#6366F1` - Electric Indigo):** Reserved for technical routing, video extraction pipelines, streaming status indicators, and background processing tags.
- **Tertiary (`#10B981` - Studio Emerald):** Functional status for completed downloads, lossless audio indicators, and healthy voice-clarity normalization.
- **Neutral Ground (`#0F1115` to `#1F2430`):**
  - Canvas Root: `#0F1115` (deep matte charcoal ground)
  - Surface Mid: `#161920` (grouped sections, bottom sheets, full player chassis)
  - Surface Elevated: `#1F2430` (interactive cards, pill buttons, floating playback dock)
  - Stroke / Rim: `#2A303C` (structural definition, 1px separation)

### Semantic Text & Foreground
- **Text High Contrast:** `#FFFFFF` (track headers, elapsed time counters, active toggle labels)
- **Text Supporting:** `#94A3B8` (host names, chapter titles, primary metadata)
- **Text Muted:** `#64748B` (unfocused timestamps, total runtimes, bitrates, format pills)

## Typography

Typography balances clean geometry with legibility under high-contrast lighting:

- **Headlines (Plus Jakarta Sans):** Crafted with balanced counters and subtle curves that soften geometric sans forms, providing an approachable yet premium tone for show titles, episode banners, and modal headers.
- **Body & Controls (Manrope):** Clean, neutral, and readable at compact scales on mobile viewports.
- **Tabular Figures & Timestamps (`label-time`):** Always render with `font-variant-numeric: tabular-nums` or `font-feature-settings: "tnum"`. This prevents jittering during audio scrubbing, live playback increments, and remaining-time rollbacks.

## Layout & Spacing

The layout is built for single-handed thumb-zone ergonomics on modern mobile devices (screen ratio 19.5:9 to 20:9), with clean reflow for foldables and tablets.

### Grid & Ergonomic Boundaries
- **Mobile Grid:** 4-column layout with `16px` (`1rem`) lateral margins and `16px` gutters.
- **Tablet / Expanded Grid:** 8-column layout with `24px` (`1.5rem`) margins and `24px` gutters.
- **Thumb Reach Architecture:** Primary interactions (play/pause, 15s skip, scrubber, vocal enhancer toggle) remain strictly within the lower 45% screen zone. Auxiliary information (full transcripts, source video metadata, chapter selection) resides in the scrollable upper viewport.
- **Safe Area Insets:** A minimum bottom padding of `env(safe-area-inset-bottom) + 16px` is enforced for floating mini-players and fixed dock bars.

## Elevation & Depth

Visual hierarchy uses physical material separation via surface luminance layering and fine luminous boundaries instead of diffuse drop shadows.

### Elevation Hierarchy
1. **Level 0 (Backdrop Ground - `#0F1115`):** The default screen canvas. Unbordered, matte, absorbs light.
2. **Level 1 (Structural Containers - `#161920`):** Enclosing modules, playlist tracks, and panel drawers. Outlined with a continuous `1px solid #2A303C` border.
3. **Level 2 (Tactile Cards & Trays - `#1F2430`):** DSP processing chips, track cards, and speed dialogs. Features a `1px` top-edge highlight (`rgba(255, 255, 255, 0.08)`) and bottom edge containment (`rgba(0, 0, 0, 0.4)`), creating a machined bevel.
4. **Level 3 (Floating Docks & Sheets):** Mini-player bars and full modal expansions use `#1F2430` with `backdrop-filter: blur(24px)` at 92% opacity, supported by an ambient amber-tinted shadow: `0 16px 36px -8px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(245, 158, 11, 0.12)`.

## Shapes

The interface embraces a sculpted, pill-shaped aesthetic (Level 3 Roundedness). 

- **Primary Buttons & Floating Pills:** Rendered with full `border-radius: 9999px` to create distinct tactile grab points.
- **Cards & Enclosures:** Styled with `rounded-2xl` (`1.5rem` / `24px`) for compact DSP cards, and `rounded-3xl` (`2rem` / `32px`) for bottom sheets and episode feature cards.
- **Sliders & Tracks:** Full rounded capsules for scrubbing tracks and volume thumbs, preventing rigid corners from conflicting with fluid thumb motion.

## Components

### 1. Transport & Playback Controls
- **Main Play/Pause Capsule:** A prominent touch element (minimum 64x64px footprint). Uses active `#F59E0B` fill with `#0F1115` icon fill for high contrast, surrounded by an ambient 8px amber glow when audio is active.
- **Secondary Jump Buttons (Skip -15s / +30s):** 48x48px circular touch targets, surfaced in `#1F2430` with a 1px `#2A303C` stroke and crisp white icons (`#FFFFFF`).

### 2. Audio Scrubbers & Waveforms
- **Progress Track:** 6px pill-height baseline track in `#2A303C`.
- **Played Track:** Solid `#F59E0B` fill.
- **Buffer Track:** `#6366F1` with 35% opacity to indicate pre-loaded speech buffers.
- **Scrubber Thumb:** 16px circular pill with a 2px inner white core, expanding to 22px on thumb contact.
- **Timestamps:** Flanking left and right, set in `label-time` using `#94A3B8`.

### 3. Audio Enhancement Cards (DSP Modules)
- **Vocal Boost & Speech Compressor:** Housed in `rounded-2xl` cards (`#161920`).
- **State Toggles:** Pill switch with tactile amber jewel indicator that illuminates to `#F59E0B` when voice clarity processing is engaged.
- **Parametric Sliders:** Low-profile horizontal sliders allowing smooth adjustment from Natural to Maximum Voice Presence.

### 4. Floating Mini-Player
- **Form Factor:** Pill capsule suspended 16px above the navigation bar with `rounded-3xl` perimeter.
- **Surface:** `#1F2430` at 94% opacity with `20px` background blur and a 1px `#2A303C` border.
- **Contents:** 40px square rounded album/thumbnail art, single-line running title in `#FFFFFF`, play/pause pill toggle, and a micro 2px progress bar pinned along the bottom rim.

### 5. Chips & Metadata Filters
- **Pill Badges:** Fully rounded (`rounded-full`), height 32px, minimum touch padding 48px target box.
- **Inactive State:** Background `#161920`, border 1px `#2A303C`, text `#94A3B8`.
- **Active Filter State:** Background `rgba(245, 158, 11, 0.15)`, border 1px `#F59E0B`, text `#F59E0B`.

### 6. Episode Lists & Rows
- **List Item:** Separated by 8px margins; cards use `#161920` with interactive active states transitioning to `#1F2430`.
- **Source Link Cue:** Small `#6366F1` badge indicating original video-source URL derivation with timestamp sync capabilities.