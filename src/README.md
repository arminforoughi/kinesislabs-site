# Digital twin sources

`twin-figure.html` is the source of `/twin.html` (the clinical bench twin), written for the Colorfigures skill.
Rebuild it after editing:

```
cp ~/.claude/skills/colorfigures/assets/core.js src/
python3 ~/.claude/skills/colorfigures/scripts/build.py src/twin-figure.html twin.html
```

then re-add the description meta, favicon, and the closing `<script>` from the current `twin.html`: it adds the
"Kinesis Labs" back link and the `?embed` mode the home page uses (hides the page chrome and posts the twin's height
to the parent). `?embed=scroll` is what How it works uses: the page sends `{twinAt: 0..9}` as you scroll, the
animation scrubs to that point and its camera zooms onto the part that is working (the FOCI table).

`/lab-twin.html` is a copy of the RAX lab twin served by the teleop server, with the Live source removed so it runs
in simulation only on the public site. Re-copy it from the teleop server when that twin changes.
