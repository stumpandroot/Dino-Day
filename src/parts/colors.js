/* ================= Rex's colors =================
   Rex's art is vector, so a new color is a recolor of his green family (body, spots, outline greens) and, optionally, his cream belly.
   Each green keeps its own lightness and saturation relative to the classic body green, so spots and shading stay where they were.
   The small pose pictures in the app are PNGs; they get the same recolor, pixel by pixel, once per color. */
const REX_PRESETS = [['classic','Classic','#4d8b7f'],['moss','Moss','#6f8f3e'],['sky','Sky','#4f86b8'],['grape','Grape','#7a5ca8'],['sunset','Sunset','#d27a45'],['bubblegum','Bubblegum','#d8749a'],['butter','Butter','#d6ae3f'],['midnight','Midnight','#3e4c80']];
const RC_BASE = { h:168, s:.29, l:.42 };   // the classic body green, #4d8b7f
if (!S.rexColor || typeof S.rexColor !== 'object') S.rexColor = { base:'#4d8b7f', belly:'cream' };
function hexHsl(c){ const [r, g, b] = [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16)/255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn)/2, d = mx - mn;
  if (!d) return { h:0, s:0, l }; const s = d/(1 - Math.abs(2*l - 1)); let h = mx === r ? ((g - b)/d) % 6 : mx === g ? (b - r)/d + 2 : (r - g)/d + 4; return { h:(h*60 + 360) % 360, s, l }; }
function hslHex({ h, s, l }){ s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l)); const c = (1 - Math.abs(2*l - 1))*s, x = c*(1 - Math.abs((h/60) % 2 - 1)), m = l - c/2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map(v => Math.round((v + m)*255).toString(16).padStart(2, '0')).join(''); }
const isGreen = o => o.h > 150 && o.h < 190 && o.s > .15 && o.s < .45 && o.l < .55;
const isBelly = o => o.h > 25 && o.h < 45 && o.l > .75;
// one original color -> its recolored version
function rexMap(hex, rc){ const o = hexHsl(hex), t = hexHsl(rc.base);
  if (isGreen(o)) return hslHex({ h:t.h, s:t.s*(o.s/RC_BASE.s), l:t.l + (o.l - RC_BASE.l)*(t.l < .3 ? .8 : 1) });
  if (isBelly(o) && rc.belly === 'tint') return hslHex({ h:t.h, s:Math.min(.6, t.s*.9 + .1), l:o.l + (o.l > .86 ? 0 : -.02) });
  return null; }
function recolorSvg(root, rc){ if (!root) return; const classic = rc.base.toLowerCase() === '#4d8b7f' && rc.belly !== 'tint';
  root.querySelectorAll('[fill],[stroke],[stop-color],[style*="fill"],[style*="stroke"]').forEach(el => {
    for (const a of ['fill', 'stroke', 'stop-color']){ const k = 'c0' + a.replace('-', ''); if (!el.dataset[k]){ const v = el.getAttribute(a); if (!v || !/^#[0-9a-f]{6}$/i.test(v)) continue; el.dataset[k] = v; }
      const orig = el.dataset[k]; el.setAttribute(a, classic ? orig : (rexMap(orig, rc) || orig)); }
    const st = el.getAttribute('style'); if (st && /#[0-9a-f]{6}/i.test(st)){ if (!el.dataset.c0style) el.dataset.c0style = st;
      el.setAttribute('style', classic ? el.dataset.c0style : el.dataset.c0style.replace(/#[0-9a-f]{6}/gi, m => rexMap(m, rc) || m)); } }); }
// pose pictures: recolor green and cream pixels in a canvas
const POSE0 = Object.assign({}, POSE), poseCache = {};
function recolorPoses(rc, done){ const key = rc.base + rc.belly; if (rc.base.toLowerCase() === '#4d8b7f' && rc.belly !== 'tint'){ Object.keys(POSE0).forEach(k => POSE[k] = POSE0[k]); done && done(); return; }
  if (poseCache[key]){ Object.assign(POSE, poseCache[key]); done && done(); return; }
  const names = Object.keys(POSE0).filter(k => typeof POSE0[k] === 'string' && POSE0[k].startsWith('data:')), out = {}; let left = names.length; const t = hexHsl(rc.base);
  names.forEach(k => { const im = new Image(); im.onload = () => { try { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height), p = d.data, memo = new Map();
      for (let i = 0; i < p.length; i += 4){ if (p[i + 3] < 8) continue; const hex = '#' + [p[i], p[i + 1], p[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''); let m = memo.get(hex);
        if (m === undefined){ const o = hexHsl(hex); m = isGreen(o) || (rc.belly === 'tint' && isBelly(o)) || (o.h > 150 && o.h < 190 && o.s > .1 && o.l < .6) ? (rexMap(hex, rc) || hslHex({ h:t.h, s:t.s*(o.s/RC_BASE.s), l:o.l })) : null; memo.set(hex, m); }
        if (m){ p[i] = parseInt(m.slice(1, 3), 16); p[i + 1] = parseInt(m.slice(3, 5), 16); p[i + 2] = parseInt(m.slice(5, 7), 16); } }
      x.putImageData(d, 0, 0); out[k] = c.toDataURL('image/png'); } catch(_){ out[k] = POSE0[k]; }
    if (--left === 0){ poseCache[key] = out; Object.assign(POSE, out); done && done(); } }; im.src = POSE0[k]; }); }
function applyRexColor(){ const rc = S.rexColor; recolorSvg(document.getElementById('rexSvg'), rc); recolorPoses(rc, () => { try { render(); } catch(_){} });
  try { window.desk && window.desk.state && window.desk.state({ rexColor:rc }); } catch(_){} }
function rexColorRow(){ const rc = S.rexColor, cur = rc.base.toLowerCase(), preset = REX_PRESETS.find(p => p[2] === cur);
  return `<div class="row rcrow"><div><div class="lab">Rex's colors</div><div class="hint">${preset ? preset[1] : 'Custom'}${rc.belly === 'tint' ? ', matching belly' : ''}.</div></div>
    <div class="rcpick"><div class="rcsw">${REX_PRESETS.map(([k, l, c]) => `<button type="button" data-rexcolor="${c}" aria-label="${l}" title="${l}" aria-pressed="${c === cur}" style="--sw:${c}"></button>`).join('')}
      <label class="rccustom ${preset ? '' : 'on'}" title="Custom color" style="--sw:${preset ? 'conic-gradient(#e8574a,#d6ae3f,#6f8f3e,#4f86b8,#7a5ca8,#d8749a,#e8574a)' : cur}"><input type="color" id="rexColorIn" value="${cur}" aria-label="Custom color"></label></div>
      ${seg('rexBelly', [['cream','Cream belly'],['tint','Matching']], { rexBelly: rc.belly })}</div></div>`; }
// clicks and the color wheel
$('#scroll').addEventListener('click', e => { const b = e.target.closest('[data-rexcolor]'); if (b){ e.stopImmediatePropagation(); setRexColor(b.dataset.rexcolor); return; }
  const s = e.target.closest('[data-set="rexBelly"]'); if (s){ e.stopImmediatePropagation(); S.rexColor.belly = s.dataset.val; save(); applyRexColor(); render(); } }, true);
$('#scroll').addEventListener('input', e => { if (e.target.id === 'rexColorIn'){ S.rexColor.base = e.target.value; recolorSvg(document.getElementById('rexSvg'), S.rexColor); } });
$('#scroll').addEventListener('change', e => { if (e.target.id === 'rexColorIn') setRexColor(e.target.value); });
function setRexColor(c){ S.rexColor.base = c.toLowerCase(); save(); applyRexColor(); SFX.pop && SFX.pop(); rig()?.face('happy', 1600); rig()?.hearts(3); rex.hop = 1;
  const p = REX_PRESETS.find(x => x[2] === S.rexColor.base); rex.say(p ? pick([`${p[1]}! I like it.`, `Ooh, ${p[1].toLowerCase()}.`, 'New look!']) : pick(['New look!','Do I look fancy?']), 1600); render(); }
setTimeout(applyRexColor, 0);

/* ================= Rex's outfit =================
   Hats, a scarf, and back pieces drawn by ChatGPT, cut into pieces that move on their own (see OFL and outfitStep in the rig). */
const OUTFIT_ART = __OUTFIT__;
const OUTFIT_OPTS = { hat:[['none','None'],['beanie','Beanie'],['propcap','Propeller cap']], neck:[['none','None'],['scarf','Scarf']], back:[['none','None'],['cape','Cape'],['backpack','Backpack']] };
if (!S.outfit || typeof S.outfit !== 'object') S.outfit = { hat:'none', neck:'none', back:'none' };
let outfitArtSent = false;
function applyOutfit(){ const R = rig(); if (!R || !R.outfit) return; const sp = {}; for (const k of ['hat','neck','back']) if (S.outfit[k] && S.outfit[k] !== 'none') sp[k] = S.outfit[k];
  R.outfit(sp, outfitArtSent ? null : OUTFIT_ART); outfitArtSent = true; }
function outfitRow(){ const o = S.outfit, any = ['hat','neck','back'].some(k => o[k] && o[k] !== 'none');
  return `<div class="row ofrow"><div><div class="lab">Rex's outfit</div><div class="hint">${any ? 'Pieces swing and bounce as he moves.' : 'Dress him up. Pieces swing and bounce as he moves.'}</div></div>
    <div class="ofpick">${Object.entries(OUTFIT_OPTS).map(([k, opts]) => `<div class="ofline"><span>${{ hat:'Hat', neck:'Neck', back:'Back' }[k]}</span><div class="seg" role="group" aria-label="${k}">${opts.map(([v, l]) => `<button type="button" data-outfit="${k}:${v}" aria-pressed="${(o[k] || 'none') === v}">${l}</button>`).join('')}</div></div>`).join('')}</div></div>`; }
$('#scroll').addEventListener('click', e => { const b = e.target.closest('[data-outfit]'); if (!b) return; e.stopImmediatePropagation();
  const [k, v] = b.dataset.outfit.split(':'); S.outfit[k] = v; save(); applyOutfit(); SFX.pop && SFX.pop(); render();
  if (v !== 'none'){ rig()?.face('happy', 1600); rex.hop = 1; rex.say(pick({ beanie:['Cozy!','Toasty head.'], propcap:['Wheee, whirly!','Watch it spin!'], scarf:['So snug.','Scarf weather!'], cape:['Super Rex!','To the rescue!'], backpack:['Ready for school!','What\'s in the bag?'] }[v] || ['New look!']), 1600); } }, true);
setTimeout(applyOutfit, 50);
