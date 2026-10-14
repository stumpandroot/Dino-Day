# Pulls Tim's outfit art out of his "Rex with ..." composites (drawn on the rig's own 536 x 688 Rex) into snippets the rig can place.
# Classes become inline fills so each snippet stands alone.
import re, json, xml.etree.ElementTree as ET
NS = '{http://www.w3.org/2000/svg}'
def load(path):
    t = ET.parse(path); root = t.getroot()
    css = ''.join(s.text or '' for s in root.iter(NS + 'style'))
    rules = {}
    for sel, body in re.findall(r'([^{}]+)\{([^}]*)\}', css):
        props = dict((k.strip(), v.strip()) for k, v in (p.split(':', 1) for p in body.split(';') if ':' in p))
        for c in sel.split(','): rules.setdefault(c.strip().lstrip('.'), {}).update(props)
    for el in root.iter():
        c = el.get('class')
        if c:
            for k, v in rules.get(c, {}).items(): el.set(k, v)
            del el.attrib['class']
        for k in ('id', 'data-name'): el.attrib.pop(k, None)
    main = root.find(NS + 'g').find(NS + 'g')
    return root, list(main)
def s(el): return re.sub(r'\s*xmlns(:\w+)?="[^"]*"', '', ET.tostring(el, encoding='unicode').replace('ns0:', ''))
def ss(els): return ''.join(s(e) for e in els)
out = {}
# propeller cap and baseball cap (composite Rex is 121.12 lower than the rig)
_, k = load('svg/rex_with_cap.svg'); cap = list(k[3])
out['cap_under'] = { 'dy':-121.12, 'svg':s(k[0]) }          # the brim's underside, behind his head
out['cap_shade'] = { 'dy':-121.12, 'svg':s(k[2]) }          # the cap's shadow on his head (his own color)
out['cap_blades'] = { 'dy':-121.12, 'svg':ss(cap[0:2]) }
out['cap_stem'] = { 'dy':-121.12, 'svg':s(cap[2]) }
out['cap_body'] = { 'dy':-121.12, 'svg':ss(cap[3:9]) }
out['cap_button'] = { 'dy':-121.12, 'svg':s(cap[9]) }
# beanie (composite Rex is 185.44 lower)
_, k = load('svg/rex_with_hat.svg'); hat = list(k[2])
out['beanie_under'] = { 'dy':-185.44, 'svg':s(k[0]) }
out['beanie_pom'] = { 'dy':-185.44, 'svg':s(hat[2]) }
out['beanie_body'] = { 'dy':-185.44, 'svg':ss(hat[0:2]) + s(hat[3]) + s(hat[4]) }
# backpack (same frame as the rig)
_, k = load('svg/rex_with_backpack.svg')
out['bag'] = { 'dy':0, 'svg':s(k[1]) }
out['strap_back'] = { 'dy':0, 'svg':s(k[4]) }
out['strap_front'] = { 'dy':0, 'svg':s(k[7]) }
# loose pieces: cape, its tie, the charm
for n in ['cape', 'cape_tie', 'chain', 'star']:
    r, k = load(f'svg/{n}.svg'); vb = [float(v) for v in r.get('viewBox').split()]
    out[n] = { 'vb':vb, 'svg':ss(k) }
json.dump(out, open('../../src/outfit_svg.json', 'w'))
print({k: len(v['svg']) for k, v in out.items()})
