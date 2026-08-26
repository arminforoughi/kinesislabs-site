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

An SVG receiving cell with no words in it: tubes ride in on a conveyor from off
the left edge, the read station scans each one, and a gantry arm lifts it into
one of three racks. Everything the animation "says" it says visually — a
coloured meter under each rack that fills as the rack fills, a ping ring at the
read station (mint accepted, amber held), a carriage LED on the same code, and a
glow around whatever the gripper is carrying.

It is all inline in `index.html`:

- geometry constants at the top of the `<script>` — belt line, pick point, rack
  positions, link lengths
- `TYPES` — the tube mix and where each routes; edit this to change the balance
  of accepted vs held
- two-link inverse kinematics in `ik()`, redrawn each frame by `render()`
- an action queue (`push`, `stepQueue`) scripting one pick-and-place cycle;
  **durations are milliseconds, belt speed is px/second**
- ambient effects (dust, light shaft, seat pulse, sweep) run off the frame loop,
  outside the queue
- `prefers-reduced-motion` gets a static, already-sorted frame
- the loop pauses when the tab is hidden or the animation is scrolled out of view

The caption beneath it labelling this a concept animation is deliberate and
should stay while there is no footage of a working system.
