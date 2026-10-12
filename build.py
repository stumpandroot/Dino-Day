# Builds index.html: python3 build.py
# 1. rig/compose.py assembles Rex's rig from rig/parts.json (made from Tim's SVGs in rig/svg by rig/parts.py)
#    and writes the rig test page (rig/rex-rig.html) plus the fragments the app embeds.
# 2. The app source gets the rig, its engine script, Rex's onboarding image, and the scene art inlined.
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, 'rig') + '/'
subprocess.run([sys.executable, R + 'compose.py'], check=True, stdout=subprocess.DEVNULL)
rig = open(R + 'rig_frag.svg').read()
parts = open(R + 'rig_parts.json').read()
src = open(R + 'rig.src.html').read()
js = src[src.index('<script>') + 8: src.rindex('</script>')]
def cut(s, a, b):
    i = s.index(a); j = s.index(b, i); return s[:i] + s[j:]
js = cut(js, "$('#exGrid').innerHTML", "/* ---------- pointer ---------- */")          # rig test-page controls
js = cut(js, "g('rexHit').addEventListener('pointerdown'", "/* ---------- API for the app")   # the app owns tap, hold, and drag
js = js.replace("const svg = $('#svg')", "const svg = document.getElementById('rexSvg')", 1).replace('__PARTS__', parts)
engine = ("<script>\nwindow.REX_OPT = { optLook:true, get optIdle(){ return !(window.__rexBusy && window.__rexBusy()); } };\n"
          "window.REX_HOOK = { walking: () => !!(window.__rexWalking && window.__rexWalking()) };\n"
          "(() => {\n" + js + "\n})();\n</script>\n")
S = os.path.join(HERE, 'src') + '/'
app = open(S + 'dino-day.src.html').read()
app = app.replace('__RIG__', rig).replace('<!--RIG_ENGINE-->', engine)
app = app.replace('__REX__', open(S + 'rex.b64').read()).replace('__ENV__', open(S + 'env.json').read())
open(os.path.join(HERE, 'index.html'), 'w').write(app)
print('index.html', len(app))
