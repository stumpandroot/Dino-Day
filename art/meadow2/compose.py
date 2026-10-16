# Lays out the meadow layers in the app's art space (1672 x 941) and writes a preview plus layout.json for the app.
import json, sys
from PIL import Image
W, H = 1672, 941
L = json.load(open('layout.json'))
def img(n): return Image.open(f'cut/{n}.png').convert('RGBA')
canvas = Image.new('RGBA', (W, H), (0, 0, 0, 255))
def put(name, x, y, w, base=False):
    im = img(name); h = round(im.height * w / im.width); im = im.resize((round(w), h), Image.LANCZOS)
    if base: x, y = x - w/2, y - h   # x,y = bottom center
    canvas.alpha_composite(im, (round(x), round(y)))
for it in L['back']: put(it['n'], it['x'], it['y'], it['w'], it.get('base', False))
if len(sys.argv) > 2:   # Rex for scale
    r = Image.open(sys.argv[2]).convert('RGBA'); rw = L['rexW']; rh = round(r.height*rw/r.width); r = r.resize((rw, rh), Image.LANCZOS)
    canvas.alpha_composite(r, (W//2 - rw//2, L['feetY'] - rh))
for it in L['front']: put(it['n'], it['x'], it['y'], it['w'], it.get('base', False))
canvas.convert('RGB').save(sys.argv[1] if len(sys.argv) > 1 else 'preview.png')
