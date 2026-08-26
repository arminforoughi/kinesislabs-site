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

An SVG receiving cell: tubes queue on a conveyor, get scanned at the read
station, and a two-link gantry arm sorts each into the spin, no-spin or hold
rack. Flagged tubes (wrong tube for the ordered test, underfilled) route to hold
as *not accessioned*. Constants, tube types and the action queue are at the top
of the `<script>` block — durations are in milliseconds, belt speed in px/second.

`prefers-reduced-motion` gets a static sorted frame instead.
