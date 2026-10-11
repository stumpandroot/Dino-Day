# Builds index.html from src/: python3 build.py
s = open('src/dino-day.src.html').read()
s = s.replace('__REX__', open('src/rex.b64').read()).replace('__ENV__', open('src/env.json').read())
open('index.html', 'w').write(s)
