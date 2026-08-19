# Design System — "lặng." Indie Mixtape Player

> Style: **80–90s Cassette Mixtape × Zine/Polaroid Craft**
> Target feeling: nostalgic, warm, handmade, unhurried — the opposite of the flat, cold UI of mainstream music apps (Spotify, Apple Music).

---

## 1. Design Philosophy

- Each song isn't a "data row" — it's a **physical object**: a movie ticket, a polaroid, a spool of tape.
- Perfection is deliberately avoided: slight tilts, hand-drawn edges, film grain — simulating the trace of *touch* rather than machine rendering.
- "Boldness" is spent on only **one** signature detail (the spinning cassette reels) — everything else stays restrained, with generous whitespace like a real zine page.

---

## 2. Color Tokens

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#EDE6D6` | Primary background — aged cream paper |
| `--ink` | `#2B2620` | Primary text, borders, now-playing bar |
| `--rust` | `#B85C38` | Primary accent — play button, progress fill, hover links |
| `--moss` | `#5C6B57` | Secondary accent — image gradients, decorative details |
| `--taupe` | `#8A7B6C` | Secondary text, dashed dividers, timestamps |
| `--mustard` | `#D4A24C` | Small accents — badges, washi tape, cassette reel core |
| `--card` | `#F4EFE4` | Card/ticket background (slightly lighter than main background) |

**Color rule:** no more than 2 accents active in the same area at once. `--rust` is the "action" color (CTA, currently playing); `--moss`/`--mustard` are decorative only — never used for primary buttons.

### Suggested addition — Dark Mode variant ("Night Tape")
Don't simply invert black/white — keep the "aged" spirit by shifting to a dim desk-lamp-lit room tone instead:

| Token | Hex |
|---|---|
| `--paper-dark` | `#1C1815` (very deep brown-black, never pure black) |
| `--ink-dark` | `#EDE6D6` |
| `--card-dark` | `#26211C` |
| `--rust-dark` | `#D97C54` (brighter than the light version for sufficient contrast) |

---

## 3. Typography

| Role | Font | Used for |
|---|---|---|
| Display | **Fraunces** (serif, italic 500 / weight 600) | Song titles, mixtape name, polaroid captions |
| Body | **Karla** (400 / 500 / 700) | Descriptions, paragraphs, buttons |
| Label / Mono | **Courier Prime** (400 / 700) | Nav links, durations, timestamps, badges — mimicking a stamped typewriter look |

**Rules:**
- Courier Prime is always uppercase with wide letter-spacing (`.06em–.14em`) when used as a label/eyebrow.
- Fraunces italic is reserved for "emotional" lines (captions, mixtape titles) — never for functional UI.
- No more than 3 fonts across the whole system — a fourth font would break the handmade feel.

---

## 4. Texture & Surface Details

- **Film grain**: a noise layer over the whole page, `mix-blend-mode: multiply`, opacity ~0.05–0.08 — noticeable without hurting readability.
- **Washi tape**: a semi-transparent rectangle (`--mustard` at 55% opacity) stuck at an angle on featured polaroids/cards.
- **Dashed dividers** (`border-left: 1px dashed`) instead of solid ones — evokes paper/torn-ticket edges.
- **Perforation holes** on either side of each tracklist row (`::before`/`::after` circle cutouts) — mimicking ticket-stub perforations.
- **Zero border-radius** system-wide, except for deliberately round details (ticket holes, cassette reels, the play button).

### Suggested addition — Interactive paper texture
- On hover over a track "ticket," add a subtle "lifted paper" effect (increasing `box-shadow` + `transform: translateX(4px) rotate(-0.3deg)`), as if picking the ticket up to look at it.
- On track change, animate the polaroid with a gentle "shake then settle into frame" motion (like shaking a polaroid photo) instead of a plain fade/slide.

---

## 5. Signature Components

### 5.1 Now Playing Bar — "Spinning Reel"
- Fixed to the bottom of the screen, `--ink` background, `--rust` top border (2px).
- Two circles (`.reel`) spin continuously via `animation: spin 3s linear infinite` while playing; **should stop spinning when paused** (suggested addition — the demo currently spins constantly, so add a `.paused { animation-play-state: paused; }` class).
- Thin progress bar (3px), fill color `--rust`.

### 5.2 Tracklist — "Movie Ticket"
- Each song is a `.ticket` row with perforation holes on both sides, `--ink` 1.5px border, `--card` background.
- Track number in Courier Prime, colored `--rust`.
- Hover: slight horizontal shift (`translateX(4px)`).

### 5.3 Album Art — Polaroid
- White frame, uneven padding (thicker at the bottom to leave room for the caption).
- Deliberate `-2.5deg` tilt, `box-shadow` cast downward for a "resting on a table" feel.
- Caption set in Fraunces italic.

### Suggested additions — new components worth building
1. **"Sticker" status badges**: for "Just added," "Favorite" — an oval/round sticker shape, slightly tilted, with a hand-drawn (irregular SVG `path`) border, instead of the usual crisp rectangular badge.
2. **Liner Notes page per album** — a secondary page mimicking the back of a cassette case, set in Fraunces italic, telling the story behind that mixtape. This could be a real differentiator from other music apps — turning listening into a reading experience too.
3. **"Tape reel" search bar**: instead of a flat input field, design it like a small spool of tape the cursor "rewinds" through — playful and consistent with the core signature.
4. **Micro-sound feedback**: a soft cassette "click" on play/pause, a "whoosh" on track change — adds depth to the nostalgic experience (should be an opt-in toggle to avoid annoyance).

---

## 6. Motion

| Principle | Application |
|---|---|
| Motion should mimic real physics, not modern UI easing | Reels spin at a constant rate, not a smooth Material-style ease-in-out |
| One orchestrated moment per page, everything else stays still | Homepage: only the player's reels move continuously; everything else is static |
| Respect `prefers-reduced-motion` | When enabled, stop the `.reel` animation and keep the reel icon in a static position |

---

## 7. Accessibility — suggested addition

- `--taupe` (#8A7B6C) on `--paper` (#EDE6D6) currently has fairly low contrast (~3:1) — use it only for secondary text ≥14px or icons, **never for primary content**.
- "Currently playing" state shouldn't rely on color (`--rust`) alone — add a clear icon/label too (e.g. a small pulsing music note) for users who have difficulty distinguishing color.
- `focus-visible` should use a dashed `--rust` 2px outline instead of the browser default — keeps the "hand-drawn" spirit while ensuring clear keyboard navigation.

---

## 8. Iconography — suggested addition

- Icons should be drawn as **slightly hand-tilted line art** (uneven stroke, similar to Excalidraw's rough.js but toned down) rather than perfect vector icons — staying consistent with the system's "handmade" language.
- Suggested icon set: a hand-drawn music note, line-art cassette tape, a torn-ticket clock/stub icon, hand-drawn curved arrows for rewind/forward.

---

## 9. Signature Summary

If only **one** element had to carry the entire identity of "lặng.", it would be: **the spinning cassette reels in the now-playing bar**, paired with the **ticket-stub tracklist**. Any future expansion (liner notes, sticker badges, tape-reel search bar) should support these two elements, not compete with them for attention.