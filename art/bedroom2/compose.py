import json, sys
from PIL import Image
L=json.load(open('layout.json')); W,H=1672,941
c=Image.new('RGBA',(W,H),(0,0,0,255))
def put(it, n=None):
    im=Image.open(f"cut2/{n or it['n']}.png").convert('RGBA'); w=it['w']; h=round(im.height*w/im.width); im=im.resize((round(w),h),Image.LANCZOS)
    x,y=it['x'],it['y']
    if it.get('base'): x,y=x-w/2,y-h
    c.alpha_composite(im,(round(x),round(y)))
back=L['back']; put(back[0]); put(back[1])
k='Lc' if 'closed' in sys.argv else 'L'; put(L['curtains'][k]); put(L['curtains'][k.replace('L','R')]); put(L['hang'])
for it in [i for i in back[2:] if not i.get('base')]: put(it)
for it in [i for i in back if i.get('id')=='rug']: put(it)
for it in sorted([i for i in back if i.get('base') and i.get('id')!='rug'], key=lambda i:i['y']): put(it)
r=Image.open('/tmp/claude-0/-home-claude-dino-day/775fd9c7-6c42-5baa-a8b0-3e2d9579d5cb/scratchpad/rex_full.png').convert('RGBA'); rw=200; rh=round(r.height*rw/r.width); r=r.resize((rw,rh)); c.alpha_composite(r,(W//2-rw//2,L['feetY']-rh))
for it in L['front']: put(it)
c.convert('RGB').save('preview.png')
