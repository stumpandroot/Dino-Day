# Dino Day for Mac

A Mac app built from the same page as the iPhone app, packaged with Electron. No Xcode, no Apple signing.

## Build it

1. Install Node from nodejs.org if Terminal says `npm` is not found.
2. In Terminal:

   ```sh
   cd mac
   npm run build
   ```

   The first run downloads Electron (about a minute). A Finder window opens on `dist/Dino Day-darwin-arm64`.
3. Drag **Dino Day.app** into **Applications**.
4. First launch only: right-click the app → **Open** → **Open**. macOS asks because the app isn't notarized. After that it opens like any app.

## Update it

Replace the `www` folder with a new one, run `npm run build` again, and drag the new app over the old one. Your data is kept in the app's own storage under `~/Library/Application Support/Dino Day`, and in your account when you're signed in.

## Account sync

Open Settings in the app → Account → Sign in. The same account on the iPhone app and on the web keeps all three in step.

## Floating Rex

Closing the window, pressing ⌘⇧D, or the shrink button on the scene puts Rex on the desk: a small window that floats above everything. Drag him anywhere. Hover for the Up next card with a Done button; double-click to open the app. Reminders (timed tasks, water, lunch, stretch, wind-down, and the frog at 2 PM) arrive as macOS notifications and as a bubble from Rex. Quit from the Dino Day menu or the menu bar icon.
