# Dino Day

A cozy task app with Rex, an interactive dinosaur friend.

## Run it

Open `index.html` in a browser. It's one self-contained page; tasks are saved in that browser's local storage.

## Edit and build

1. Edit `src/dino-day.src.html`. Rex's onboarding image is in `src/rex.b64`, and the scene backgrounds (meadow and bedroom, one per time of day) are in `src/env.json`.
2. Run `python3 build.py` to regenerate `index.html`. The build assembles Rex's rig first, then inlines it into the app.

`src/parts/` holds readable copies of the task logic and effects modules, which are inlined in the source page.

## Rex's rig

Rex is an animated SVG rig built from Tim's Illustrator parts.

- `rig/svg/`: the exported parts (body, head, eyes, mouths, arms, legs, poses, book, and composites like `seated_reading.svg`).
- `rig/parts.py`: converts the SVGs into `rig/parts.json`. Run it after adding or changing a part.
- `rig/rig.src.html`: the rig engine (expressions, blinks, arms, walk, jump, roar, breath, sleep, feed, pet, read, carry) and its test page.
- `rig/compose.py`: builds the rig and writes `rig/rex-rig.html`, a standalone page for testing every expression and action.

In the app, you can tap Rex to say hi, hold to pet him, and drag him anywhere. He lands on whatever is under him, rides along when the list scrolls, cheers when you finish the task he's sitting on, and stays where you left him after a reload.

The "Make it smaller" AI breakdown works only inside Claude's artifact viewer. Everywhere else it falls back to Rex's built-in step templates.
