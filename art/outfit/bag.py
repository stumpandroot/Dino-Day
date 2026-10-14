import numpy as np, cv2
from PIL import Image, ImageFilter
from scipy import ndimage
a=np.array(Image.open('cut/v_2_1.png').convert('RGBA'))[:, ::-1].copy(); A=a.astype(int); al=a[...,3]; H,W=al.shape
r,g,b=A[...,0],A[...,1],A[...,2]; op=al>128; X=np.arange(W)[None,:]; Y=np.arange(H)[:,None]
coral=op&(r>170)&(g<160)&(r-g>60)
lab,n=ndimage.label(coral); straps=np.zeros_like(op)
for i in range(1,n+1):
    m=lab==i; ys,xs=np.where(m)
    if m.sum()<300: continue
    if not (xs.mean()<W-250 and ys.mean()>200): straps|=m
straps=ndimage.binary_dilation(straps,iterations=3)&op
cream=op&(r>230)&(g>215)&(b>170); gold=op&(r>200)&(g>130)&(g<205)&(b<120)
charm=ndimage.binary_dilation((cream|gold)&(X>W-215)&(Y>190)&(Y<390),iterations=4)&op
lab2,n2=ndimage.label(charm); keep=np.zeros_like(charm)
for i in range(1,n2+1):
    if (lab2==i).sum()>500: keep|=lab2==i
charm=keep
body=op&~straps&~charm
m=body; lab3,n3=ndimage.label(m); sz=ndimage.sum(m,lab3,range(1,n3+1)); body=lab3==(np.argmax(sz)+1)
low=ndimage.binary_fill_holes(ndimage.binary_closing(body,iterations=14)); low=ndimage.binary_opening(low,iterations=4)
handle_band=Y<75
full=np.where(handle_band, body|(low&(Y>60)), low)
fill=full&~body
fill|=full&(X>W-120)&(Y>100)   # the side that was under the straps and charm: repaint it from its neighbours
rgb=np.ascontiguousarray(a[...,:3][...,::-1]); rgb=cv2.inpaint(rgb, ndimage.binary_dilation(fill,iterations=2).astype(np.uint8)*255, 9, cv2.INPAINT_TELEA)
out=a.copy(); out[...,:3]=rgb[...,::-1]; out[...,3]=np.array(Image.fromarray(np.where(full,255,0).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7)))
im=Image.fromarray(out); im=im.crop(im.getbbox()); im.save('cut/backpack_bag.png')
bg=Image.new('RGBA',im.size,(60,70,90,255)); bg.alpha_composite(im); bg.convert('RGB').save('/tmp/claude-0/-home-claude-dino-day/775fd9c7-6c42-5baa-a8b0-3e2d9579d5cb/scratchpad/bag_v.png')
