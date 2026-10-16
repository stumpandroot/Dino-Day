import re, json, glob, os
D=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'svg') + '/'
def conv(path):
    s=open(path).read()
    styles={}
    css=re.search(r'<style>(.*?)</style>',s,re.S)
    if css:
        for sel,body in re.findall(r'([^{}]+)\{([^}]*)\}',css.group(1)):
            props=';'.join(x.strip() for x in body.strip().split(';') if x.strip())
            for c in sel.split(','):
                c=c.strip().lstrip('.')
                styles[c]=(styles.get(c,'')+';'+props).strip(';')
    inner=re.search(r'<g id="Layer_1-2"[^>]*>(.*)</g>\s*</svg>',s,re.S).group(1)
    def rep(m):
        st=';'.join(styles.get(c,'') for c in m.group(1).split())
        return f'style="{st}"'
    inner=re.sub(r'class="([^"]+)"',rep,inner)
    inner=re.sub(r'\s(id|data-name)="[^"]*"','',inner)
    inner=re.sub(r'\s+',' ',inner).strip()
    vb=re.search(r'viewBox="([^"]+)"',s).group(1)
    return {'vb':vb,'svg':inner}
out={}
for f in sorted(glob.glob(D+'*.svg')):
    k=os.path.basename(f).split('-',1)[1][:-4]
    out[k]=conv(f)
json.dump(out,open(os.path.join(os.path.dirname(D[:-1]), 'parts.json'),'w'),indent=0)
print(list(out))
