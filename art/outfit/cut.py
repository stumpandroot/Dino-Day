# Cuts each ChatGPT sheet into its pieces: opaque regions, small specks dropped, pieces in reading order.
import numpy as np, os, json
from PIL import Image
from scipy import ndimage
D = os.path.dirname(os.path.abspath(__file__))
def pieces(name, min_area=1500, rows=False, dil=6, col=0):
    im = Image.open(f'{D}/src/{name}.png').convert('RGBA'); a = np.array(im); al = a[...,3]
    m = al > 128; m = ndimage.binary_opening(m, iterations=1)
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=dil) if dil else m)   # join parts of one piece that nearly touch
    out = []
    for i in range(1, n + 1):
        sl = ndimage.find_objects((lab == i).astype(int))[0]; area = (lab[sl] == i).sum()
        if area < min_area: continue
        keep = (lab == i) & (al > 8); ys, xs = np.where(keep); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        p = a[y0:y1, x0:x1].copy(); p[~keep[y0:y1, x0:x1], 3] = 0
        out.append(((x0 // col) if col else 0, (y0 // 200) if rows else 0, y0 if col else x0, p))
    out.sort(key=lambda o: (o[0], o[1], o[2]))
    return [o[3] for o in out]
meta = {}
for name, labels, kw in [('propcap', ['cap','stem','propTop','propSide'], {}), ('beanie', ['hat','pom','pomStem'], {}),
                           ('scarf', ['wrap','longA','longB','longC','shortA','shortB'], {'dil':0, 'col':380}), ('cape', ['collar','upper','lower','windy'], {'col':600}),
                           ('backpack', ['bag','ring','star'], {})]:
    ps = pieces(name, **kw)
    print(name, len(ps), [p.shape[:2] for p in ps])
    meta[name] = len(ps)
    for lab, p in zip(labels, ps): Image.fromarray(p).save(f'{D}/cut/{name}_{lab}.png')
