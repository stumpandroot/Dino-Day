import json, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(HERE + '/parts.json'))
els = re.findall(r'<(?:path|ellipse|rect|polyline)[^>]*/>', P['Rex_Updated']['svg'])
E = lambda *ix: ''.join(els[i] for i in ix)

def attrs(el):
    return dict(re.findall(r'(\w[\w-]*)="([^"]*)"', el))

eyeL_d = attrs(els[22])['d']
eR = attrs(els[24])

sr = re.findall(r'<(?:path|ellipse|rect|polyline)[^>]*/>', P['seated_reading']['svg'])
SR = lambda *ix: ''.join(sr[i] for i in ix)
rig = f'''
<defs>
  <clipPath id="clipL"><path d="{eyeL_d}"/></clipPath>
  <clipPath id="clipR"><ellipse cx="{eR['cx']}" cy="{eR['cy']}" rx="{eR['rx']}" ry="{eR['ry']}" transform="{eR['transform']}"/></clipPath>
  <clipPath id="thighClip" clipPathUnits="userSpaceOnUse"><path d="{attrs(els[12])['d']}"/><rect x="-200" y="592" width="1000" height="400"/></clipPath>
</defs>
<g id="shadow"><ellipse cx="300" cy="684" rx="190" ry="16" fill="var(--shadow)"/></g>
<g id="root">
  <g id="lie_armB"><g id="armB"><path id="armBp" fill="none" stroke="#467a6f" stroke-width="60" stroke-linecap="round" stroke-linejoin="round"/><g id="handB">{els[4]}</g></g></g>
  <g id="lie_legB"><g id="legB"><g id="legBl">{E(0,1)}</g><g id="footB">{els[2]}</g></g></g>
  <g id="lie_tail"><g id="tail">{E(5,6,7,8,9)}</g></g>
  <g id="lie_side" style="display:none">
    <g fill="#29544b"><path d="M-6 452 q30 -62 64 -14z"/><path d="M56 428 q34 -70 74 -12z"/><path d="M128 420 q34 -68 72 -6z"/></g>
    <g transform="translate(150 556) rotate(90) scale(1.32 1.5) translate(-101.7 -139)">{P['body_side']['svg']}</g>
    <g fill="#305c53"><ellipse cx="38" cy="500" rx="25" ry="22"/><ellipse cx="102" cy="474" rx="20" ry="17"/><ellipse cx="160" cy="468" rx="15" ry="13"/></g>
  </g>
    <g id="seatMB" style="display:none"><path id="sBbody" fill="#4d8b7f"/><path id="sBshade" fill="#407469"/><path id="sBsole" fill="#305c53"/><path id="sBdot" fill="#305c53"/></g>
  <g id="lie_torso"><g id="torso">{E(10,11,12,13,14,15)}</g></g>
  <g id="lie_head"><g id="head">
    {E(16,17,18,19,20,21)}
    <g id="eyeL">{els[22]}<g clip-path="url(#clipL)"><g id="irisL">{els[23]}<g id="glL" class="gl"></g></g></g></g>
    <g id="eyeR">{els[24]}<g clip-path="url(#clipR)"><g id="irisR">{els[25]}<g id="glR" class="gl"></g></g></g></g>
    <g id="altL"></g><g id="altR"></g>
    {E(26,27,28,29,30,31,32,33)}
    <g id="blush">{els[34]}</g>
    <g id="browL">{els[35]}</g>
    <g id="browR">{els[36]}</g>
    <g id="mouth">{els[40]}</g>
  </g></g>
  <g id="lie_legF"><g id="legF"><g id="legFl">{E(37,39)}<path id="mLeg" fill="#4d8b7f" style="display:none"/><path id="mSpot" fill="#305c53" style="display:none"/></g><g id="footF">{els[38]}<path id="mFoot" fill="#305c53" style="display:none"/></g></g></g>
  <g visibility="hidden" id="turnSrc"><g id="turnSrcH">{P["head_front"]["svg"]}</g><g id="turnSrcB">{P["body_front"]["svg"]}</g></g>
  <g visibility="hidden"><g id="seatSrcB">{SR(0,1,2,3)}</g><g id="seatSrcF">{SR(37,38,39)}</g></g>
  <g id="walkSrc" visibility="hidden"><g id="legFwl" transform="translate(192 486)">{P["front_walking_leg"]["svg"]}</g></g>
  <g id="seatMF" style="display:none"><path id="sFbody" fill="#4d8b7f"/><path id="sFsole" fill="#305c53"/><path id="sFspot" fill="#305c53"/></g>
  <g id="bookSlot" style="display:none"><g id="bkSmear" style="display:none"><path id="bkStreak" fill="#E8574A"/><path id="bkStreak2" fill="#FBE9D2"/><path id="bkLine1" fill="none" stroke="#2d554e" stroke-linecap="round" stroke-width="5"/><path id="bkLine2" fill="none" stroke="#2d554e" stroke-linecap="round" stroke-width="4"/><use id="bkGh0" href="#bookV"/><use id="bkGh1" href="#bookV"/><use id="bkGh2" href="#bookV"/></g><g id="bookG"><g id="bookV" stroke-linejoin="round" transform="matrix(0.8470 -0.1073 0.0383 0.8390 -32.15 -24.53)"><path id="bkLP" fill="#FBE9D2" stroke="#FBE9D2" stroke-width="22"/><path id="bkRP" fill="#FBE9D2" stroke="#FBE9D2" stroke-width="22"/><path id="bkFL" fill="#FBE9D2"/><path id="bkFLs" fill="#EFD6B4"/><path id="bkLC" fill="#E8574A" stroke="#E8574A" stroke-width="34"/><path id="bkRC" fill="#E8574A" stroke="#E8574A" stroke-width="34"/><path id="bkSP" fill="#C63F35" stroke="#C63F35" stroke-width="20"/></g></g></g>
  <g id="lie_armF"><g id="armF"><path id="armFp" fill="none" stroke="#528e82" stroke-width="70" stroke-linecap="round" stroke-linejoin="round"/><g id="handF">{els[42]}</g></g></g>
  <g id="handB2" style="display:none">{SR(46)}</g><g id="handF2" style="display:none">{SR(45)}</g>
  <g id="lie_marks"><g id="marks"></g></g>
</g>'''

sl = re.findall(r'<(?:path|ellipse|rect|polyline)[^>]*/>', P['Sleeping_full']['svg'])
S_ = lambda *ix: ''.join(sl[i] for i in ix)
sleep = f'''<g id="sleepPose" style="display:none"><g id="sleepScale" transform="translate(-6 356) scale(.74)">
  <ellipse cx="420" cy="440" rx="330" ry="18" fill="var(--shadow)"/>
  <g id="sArmB">{S_(0,1)}</g>
  <g id="sTail">{S_(2,3,4,5,6)}</g>
  <g id="sBody">{S_(8,9,10,11,12,13,14,15,16)}</g>
  <g id="sArm">{S_(17,18,19)}</g>
  <g id="sHead">{S_(20,21,22,23,24,25,26,27,28,29,30,31,32)}</g>
  <g id="sLeg">{S_(33,34)}</g>
  <g id="sFace">{S_(35,36,37,38,39)}</g>
  <g id="sZ" font-family="Fredoka, sans-serif" font-weight="700" fill="#6F7FC4"><text x="700" y="120" font-size="46">z</text><text x="736" y="78" font-size="58">z</text><text x="780" y="30" font-size="74">z</text></g>
</g></g>'''
rig = rig.replace('<g id="lie_marks"><g id="marks"></g></g>\n</g>', '<g id="lie_marks"><g id="marks"></g></g>\n</g>\n<g id="props"></g>\n' + sleep)
keep = ['hungry_mouth','Happy_eyes','laughing_eyes','closed_eyes','sad_eyes','tired_-_annoyed_eyes','eye_glisten','Frown','Worried','open_mouth',
        'excited_-_happy_-_laughing','surprised_-_curious','sleepy_-_tired','frustrated','Mouth']
parts = {k: P[k] for k in keep}
src = open(HERE + '/rig.src.html').read()
out = src.replace('__RIG__', rig).replace('__PARTS__', json.dumps(parts))
open(HERE + '/rex-rig.html', 'w').write(out)
print(len(out))
# fragments for the app build
open(HERE + '/rig_frag.svg', 'w').write(rig)
open(HERE + '/rig_parts.json', 'w').write(json.dumps(parts))
