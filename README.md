# kinesislabs.tech

Deploy target for the Kinesis Labs marketing site. Served by GitHub Pages at
**https://kinesislabs.tech**.

Single static page, no build step: everything is in `index.html` (HTML, CSS and
the hero animation's JS, all inline). `CNAME` holds the custom domain and must
not be deleted.

## Updating the site

Edit `index.html`, commit, push to `main`. Pages redeploys in about a minute.

If you are working out of the private `lab-robot` repo, copy the file over:

```
cp ../lab-robot/index.html index.html && git commit -am "update site" && git push
```

## The hero animation

An abstract SVG robot: a two-link arm sweeps around an arc, lifts an element
from the pick point, and lights each position in turn, trailing a fading motion
path. Nothing in it depicts the product workflow.

It is all inline in `index.html`:

- geometry at the top of the `<script>` — base point, link lengths, the arc the
  positions sit on
- moves are tweened in *polar* coordinates around the base, which is what makes
  them arc instead of running in straight lines
- `ik()` solves the two links; the elbow always breaks to the same side so the
  arm keeps one silhouette
- an action queue drives the cycle; **durations are milliseconds**
- animated opacity is set as an *attribute*, so never give those classes an
  `opacity` in CSS — the stylesheet would win and nothing would show
- `prefers-reduced-motion` gets a static frame; the loop pauses when the tab is
  hidden or the animation is scrolled out of view
