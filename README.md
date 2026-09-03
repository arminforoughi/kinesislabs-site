# kinesislabs.tech

Deploy target for the Kinesis Labs marketing site. Served by GitHub Pages at
**https://kinesislabs.tech**.

Single static page, no build step. The markup and the hero animation's JS are
inline in `index.html`; the stylesheet is `assets/site.css`, cache-busted by the
`?v=` on its `<link>` — bump it when you edit the CSS. `CNAME` holds the custom
domain and must not be deleted.

## Updating the site

Edit `index.html`, commit, push to `main`. Pages redeploys in about a minute.

If you are working out of the private `lab-robot` repo, copy the file over:

```
cp ../lab-robot/index.html index.html && git commit -am "update site" && git push
```

## SEO

The pages carry, in both `index.html` and `contact.html`:

- `<link rel="canonical">` and `og:url` on the live `https://kinesislabs.tech`
  origin — set these on any new page or Pages will let query strings and the
  `.html`/no-`.html` forms compete with each other
- Open Graph + Twitter `summary_large_image`, pointing at `assets/og-image.png`
- `robots` with `max-image-preview:large`
- JSON-LD: Organization + WebSite + Service on the home page, ContactPage on
  contact. **Not Product** — nothing here is priced, and a Product node without
  `offers` draws a "Product snippets" warning in Search Console.

`robots.txt` and `sitemap.xml` sit at the repo root, which is the site root on
Pages. `sitemap.xml` has hardcoded `lastmod` dates: update them when a page
changes materially, or drop the field rather than let it lie.

Meta descriptions are kept under ~160 characters, which is roughly where Google
truncates. The home page's was 182 and was being cut off mid-sentence.

Generated images — `og-image.png` (1200x630), `icon-512.png`, `logo-email.png` —
are all drawn by the Pillow snippets in this README rather than exported by hand,
so they can be regenerated exactly when the mark changes.

## The mark

The wordmark's glyph is a gripper closing on a specimen tube — white capsule,
mint jaws — in the two colours the site already uses. It is inline SVG in the nav
of both `index.html` and `contact.html`, and standalone in `assets/favicon.svg`.
The capsule strokes `currentColor` so it takes the nav's colour; only the jaws are
pinned to mint.

The same geometry exists in four places and they have to be kept in step:

| where | what |
|---|---|
| `index.html`, `contact.html` | inline in the nav |
| `assets/favicon.svg` | browser tab |
| `assets/logo-mark.svg` | 160px export source |
| `assets/logo-email.png` | 160px raster, pulled by `contact-endpoint.gs` into the confirmation email |

The PNG has to be re-rendered by hand when the mark changes. `qlmanage` gets SVG
scaling wrong — it renders the art into the top-left quadrant — so use a real
rasteriser, or redraw it directly:

```python
from PIL import Image, ImageDraw
S = 4; W = 160*S; px = lambda v: v*S
INK, PAPER, MINT = (7,12,16,255), (244,246,244,255), (95,227,180,255)
img = Image.new('RGBA', (W,W), (0,0,0,0)); d = ImageDraw.Draw(img)
d.rounded_rectangle([0,0,W-1,W-1], radius=px(34), fill=INK)
d.rounded_rectangle([px(65),px(31),px(95),px(135)], radius=px(15), outline=PAPER, width=px(15))
for cx in (36,124):
    d.rounded_rectangle([px(cx-8.5),px(58),px(cx+8.5),px(102)], radius=px(8.5), fill=MINT)
img.resize((160,160), Image.LANCZOS).convert('RGB').save('assets/logo-email.png')
```

## The background animation

A wireframe receiving station on a `<canvas>`, drawn by a small 3D renderer with
no dependencies. Three tubes, one to each rack: lift each off the input tray,
stand it upright, seat it in the spin, no-spin or hold rack.

**It is scrubbed by scroll**, over the whole document (`pageProgress()`), so the
machine keeps working the whole way down rather than finishing in the first
screen. Dragging the page back up runs the station in reverse and lifts the tubes
back out of their racks. (The value is eased by a per-frame lerp toward the
scroll position, so it lags slightly while moving and settles when you stop.)

### Two canvases, and why

There are two, and the split is what keeps the machine off the copy:

**`#mesh`, behind the page** (`z-index:0`). `body` is **ink**, and the
ink-coloured sections — `.hero`, `.sec.dark`, `.cta`, `.foot` — are
**transparent**. Ink over ink looks identical to what they were, but the machine
behind them shows through, under type that is already light on a dark ground. It
cannot land on anything: the sections are painted over it.

**`#mesh-front`, in front of the page** (`z-index:60`, under the nav's 100).
`.sec` paints itself **paper**, so the canvas behind is invisible through a light
section. Those sections get the same geometry drawn on top instead, in dark ink
and much fainter — `FRONT_K`, currently `0.20`, on top of the section's own
`data-mesh` opacity. It is clipped to `.sec:not(.dark):not(.cta)` exactly, so
none of it strays onto an ink section and doubles up with the pass behind.

`FRONT_K` is the dial for "too strong over the body copy". It is the only pass
that lands on text, so it is the one to turn down, not the placements.

If you make a light section transparent you will get both passes at once and the
machine will look muddled — leave `.sec` opaque.

`main` and `.foot` carry `position:relative;z-index:1` because a `position:fixed`
canvas at `z-index:0` paints *above* non-positioned block content. The nav is
deliberately not in that rule: it is already fixed at `z-index:100`, and giving it
`position:relative` drops it out of its centred pill — which also keeps the front
canvas from crossing the menu.

### The swell

The machine opens small on the right, then drives in hard until it is cropped by
the viewport and reads as line and dot rather than as a robot, then draws back
out so the bottom of the page looks like the top. That is one line:

```js
var arc = Math.sin(Math.PI * cp);   // 0 at both ends, 1 in the middle
```

`ZOOM_DOLLY` (2.45) moves the camera in — it is subtracted from a radius of 6.6,
so it is in scene units. `ZOOM_GAIN` (1.55) scales the projection on top of that.
They multiply, so the middle of the page runs about **4x** the framing at either
end; that is the intent, not an accident. Both ride the same arc, which is why
the two ends match — use `sin()` rather than a ramp or they will not.

Turn the whole effect down by moving `ZOOM_GAIN` toward 0; the dolly alone still
gives a perspective push without the crop.

### Where it sits

One fixed position cannot suit a page whose columns move around, so each section
declares its own in markup:

```html
<section id="contact" data-mesh="0.16 0.70 0.68 0.95">
```

On a phone the placements do not apply — they are written for a two-column page,
and centred on a narrow screen the machine sits straight behind the headline. So
below 1000px it ignores the declared `x`/`y` and instead:

- anchors low (`x 0.56`), so the ends of the page stay clear of the copy;
- **rises as it grows** — `cy` runs `0.85 - 0.26 * arc`, so the swollen middle is
  framed instead of hanging off the bottom edge;
- takes the **full** swell. Damping it there was a mistake: it reads as the zoom
  simply not happening on a phone.

`x y scale opacity` — x and y as fractions of the viewport. The renderer blends
the placements of every section currently on screen, weighted by how much of the
viewport each one fills, so the machine slides from one spot to the next across a
boundary instead of jumping when the midpoint crosses. Moving it is a markup edit;
no JS to touch. The swell above multiplies whatever `scale` says here.

The hero opens at `x 0.78`; the CTA and footer close at `0.22`, its mirror, at the
same scale. So the page opens and closes on the same framing, on opposite sides.

It is all inline in the first `<script>` in `index.html`:

- geometry constants near the top — link lengths, tube size, `SEAT_Y`
- `FEED` — where the tubes arrive; `RACKS`, `ROUTE` and `SEAT_IX` — where each
  one is routed. Edit those to change the mix.
- `solve()` — closed-form two-link inverse kinematics. The cycle is written as
  tool-tip targets, not joint angles, which is what lets a tube be grasped and
  released without a jump: at the grasp frame the gripper is exactly on the tube
  by construction, so parenting it to the wrist is seamless.
- `legsFor()` / `TIMELINE` / `sampleAt()` — the cycle. `d` is *relative*
  duration, not seconds; the timeline is normalised and indexed by scroll.
- `chain()` — the kinematic chain. The wrist roll `j6` pivots about the *grasp
  point*, so standing a tube upright does not drag it out of the fingers.
  `j6 = 0` leaves it flat as grasped, `STAND` stands it up for a rack.
- `placement()` / `collectPlaces()` — the `data-mesh` blending above.
- `paperBands()` / `FRONT_K` — the faint pass over the light sections. The paint
  helpers write to whichever context `tgt` points at, which is how the same
  buffered geometry is painted into both canvases without rebuilding it.
- `draw()` — projection and painting. Note it folds the view matrix into each
  part matrix (`MV`) before projecting; skipping that step projects world
  coordinates and culls almost the whole scene.

The palette is monochrome apart from one thing: the tube currently in the gripper
is drawn in mint, so the specimen in flight is the only coloured object on screen.

`prefers-reduced-motion` gets a single static frame with no scrubbing. The loop
stops when the tab is hidden.

The hero carried a "concept animation" caption while the animation was a
literal depiction of the receiving station. It is an abstract wireframe now and
the caption has been removed. The claim that still matters is the one under the
bench video in `#demo` — "a working system on a bench, not a station deployed in
a lab" — and that one should stay accurate.
