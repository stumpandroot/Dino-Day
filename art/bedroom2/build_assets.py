# Encodes the bedroom layers for the app: src/bedroom2.json = { layout, img: { name: data URI }, ar: { name: height/width } }.
import json, base64, io, os
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__))
L = json.load(open(os.path.join(D, 'layout.json')))
items = L['back'] + L['front'] + list(L['curtains'].values()) + [L['hang'], { 'n':'bedm', 'w':480 }, { 'n':'chesto', 'w':300 }]
out = { 'layout': L, 'img': {}, 'ar': {} }
for it in items:
    n = it['n']
    if n in out['img']: continue
    im = Image.open(os.path.join(D, 'cut2', n + '.png'))
    w = min(im.width, round(it['w'] * 1.4)); im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=86, method=6)
    out['img'][n] = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(); out['ar'][n] = round(im.height / im.width, 5)
json.dump(out, open(os.path.join(D, '..', '..', 'src', 'bedroom2.json'), 'w'))
print(sum(len(v) for v in out['img'].values())//1024, 'KB')
