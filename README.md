# Dino Day

A cozy task app with Rex, an interactive dinosaur friend.

## Run it

Open `index.html` in a browser. It's one self-contained page; tasks are saved in that browser's local storage.

## Edit and build

1. Edit `src/dino-day.src.html`. Rex's image is in `src/rex.b64`, and the scene backgrounds are in `src/env.json`.
2. Run `python3 build.py` to regenerate `index.html`.

`src/parts/` holds readable copies of the task logic and effects modules, which are inlined in the source page.

The "Make it smaller" AI breakdown works only inside Claude's artifact viewer. Everywhere else it falls back to Rex's built-in step templates.
