# Chainsaw Man FanPage

A scroll-led, WebGL fan experience for Chainsaw Man — seven characters, floating portrait galleries and a cursor-driven **RUN MODE** built on top of the original site.

**Built by Krish ([@krizzh7](https://github.com/krizzh7))**
Check out the live website here: https:/thebloodarchive.netlify.app

> Fan project. Chainsaw Man and all artwork belong to their original creators; this is a non-commercial tribute.

---

## Features

- **Cinematic video loading screen** — full-bleed intro with music choice and exit-to-main-page flow.
- **Seven character chapters** — Aki, Asa, Denji, Makima, Power, Reze and Himeno, each with its own palette, bio and quote.
- **WebGL portrait layer** — a fixed R3F canvas renders the floating artworks with cursor/scroll-reactive shaders, grain and chromatic aberration.
- **RUN MODE** — each chapter opens a bounded, cinematic gallery of that character's images with image-specific copy.
- **Custom cursor, Lenis smooth scrolling and GSAP ScrollTrigger** chapter transitions.

## RUN MODE

Press **RUN MODE** inside any character chapter. The scattered portraits gather into a horizontal composition: the active image dominates the right-hand gallery, neighbours stay visible with depth and dimming, and the left panel shows the character identity plus the active image's title and description.

### Controls

| Input | Action |
| --- | --- |
| Move mouse horizontally over the gallery | Continuous, damped progression (relative movement, reverses freely) |
| Drag | Scrub the gallery |
| Swipe (touch) | Same as drag |
| `←` / `→` | Previous / next image |
| Prev / next buttons | Step one image |
| Progress ticks | Jump to a specific image |
| `Esc` or **EXIT RUN** | Close RUN MODE |

### Behaviour

- The active image is capped at a fraction of the gallery width — never fullscreen, aspect ratio always preserved.
- Image count is **dynamic** (4 or 5 today), so counters, ticks and progression adapt automatically.
- Page scrolling, Lenis and background navigation are frozen while RUN MODE is open; the exact scroll position and active chapter are restored on exit.
- Desktop uses cursor progression; touch devices use swipe/drag.
- Honours `prefers-reduced-motion`.
- Panel transforms are applied imperatively from a single `requestAnimationFrame` loop, so pointer movement does not trigger React re-renders.
- `source/<Character>/cont<N>.txt` files are imported at build time and paired with images through an explicit mapping in `src/data/runContent.js` — original assets are never renamed, moved or edited.

## Tech stack

React 18 · Vite 5 · GSAP + ScrollTrigger · Lenis · Three.js / React Three Fiber · postprocessing · Tailwind (base) + hand-written CSS

## Getting started

```sh
npm install
npm run dev
```

Dev server runs on `http://localhost:5173`.

```sh
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run test:browser  # headless browser verification
```

## Project structure

```
src/
├─ App.jsx                  # page narrative, ScrollTrigger timelines, RUN state + scroll restore
├─ styles.css               # editorial layout, RUN MODE, responsive breakpoints
├─ components/
│  ├─ LoadingScreen.jsx     # protected video intro
│  ├─ CharacterSection.jsx  # chapter copy + RUN trigger
│  ├─ RunMode.jsx           # RUN MODE overlay, interaction loop, entry/exit
│  ├─ RunImage.jsx          # single gallery panel
│  ├─ ImageLightbox.jsx, Navigation.jsx, CustomCursor.jsx
├─ data/
│  ├─ assets.js             # public asset manifest + bio parser
│  └─ runContent.js         # image ↔ cont<N>.txt mapping, dynamic gallery content
├─ hooks/                   # smooth scroll, music, loading flow, biography fetch
└─ scene/                   # fixed R3F canvas: background, gallery, particles, state

public/csm/cource/          # served images, videos and biographies
source/                     # original input assets + per-character cont*.txt
```

## Content mapping

Each character folder ships one `contN.txt` per artwork, but filenames do not encode the pairing. The associations in `src/data/runContent.js` were established by inspecting every image against its description. Where no explicit metadata existed, the mapping is a visual/contextual inference and is documented in comments in that file.

Adding a character or an extra image only requires adding the corresponding entry there — counts, counters and progress indicators update automatically.

## License

Code © Krish. Artwork and Chainsaw Man are the property of Tatsuki Fujimoto, Shueisha and the respective rights holders. Not for commercial use.
