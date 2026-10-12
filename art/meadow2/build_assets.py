# Encodes the meadow layers for the app: src/meadow2.json = { layout, img: { name: data URI } }.
# Each image is resized to 1.4x its size in art space (1672 x 941) so it stays sharp full screen.
import json, base64, io, os
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__))
L = json.load(open(os.path.join(D, 'layout.json')))
out = { 'layout': L, 'img': {} }
for it in L['back'] + L['front']:
    n = it['n']
    if n in out['img']: continue
    im = Image.open(os.path.join(D, 'cut', n + '.png'))
    w = min(im.width, round(it['w'] * 1.4)); im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=86, method=6)
    out['img'][n] = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
    it_h = im.height / im.width   # aspect, for the app
    out.setdefault('ar', {})[n] = round(it_h, 5)
json.dump(out, open(os.path.join(D, '..', '..', 'src', 'meadow2.json'), 'w'))
print({k: len(v)//1024 for k, v in out['img'].items()}, 'KB total', sum(len(v) for v in out['img'].values())//1024)
