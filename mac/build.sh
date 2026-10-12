#!/bin/sh
# Builds "Dino Day.app" for Apple Silicon Macs and opens the folder that holds it.
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then npm install --no-audit --no-fund; fi
iconutil -c icns icon.iconset -o icon.icns
npx @electron/packager . "Dino Day" --platform=darwin --arch=arm64 --icon=icon.icns --overwrite --out=dist --app-bundle-id=co.stumpandroot.dinoday.mac --app-category-type=public.app-category.productivity
echo
echo "Done. Drag dist/Dino Day-darwin-arm64/Dino Day.app into Applications."
open "dist/Dino Day-darwin-arm64"
