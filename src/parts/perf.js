/* ================= keeping it smooth on phones =================
   1. Scene tints are baked once into new images instead of running an SVG color filter over the art on every repaint.
   2. On phones (and anywhere frames run slow), Rex's 14-step lighting filter is swapped for a single GPU-friendly CSS tint,
      and the dust and light effects update at 30 frames a second. */
const LITE_DEVICE = matchMedia('(pointer:coarse)').matches;
let lite = LITE_DEVICE ? 1 : 0;
function setLite(n){ lite = n; app.classList.toggle('lite', n > 0); const g = document.getElementById('rexLit');
  if (g){ if (n > 0) g.removeAttribute('filter'); else g.setAttribute('filter', 'url(#rexFx)'); } rexTintLite(); }
// a multiply tint at strength a is close to darkening by the tint's lightness and warming slightly
function rexTintLite(){ const svg = document.getElementById('rexSvg'); if (!svg) return; if (!lite){ svg.style.filter = ''; return; }
  const [tc, ts] = REXLIGHT[place()][phase()] || ['#fff', 0], m = tc.replace('#','').match(/../g).map(h => parseInt(h, 16)/255), l = .3*m[0] + .59*m[1] + .11*m[2];
  const b = 1 - ts*(1 - l), warm = (m[0] - m[2])*ts; svg.style.filter = ts > .02 ? `brightness(${b.toFixed(3)}) sepia(${Math.max(0, warm*.6).toFixed(3)}) saturate(${(1 - ts*.25).toFixed(3)})` : ''; }
// frame-time watch: if a desktop or tablet can't keep up for a few seconds, it drops to the light mode too
const fpsWatch = { ema:16, n:0 };
function watchFrame(dt){ if (lite) return; fpsWatch.ema += (dt*1000 - fpsWatch.ema)*.05; if (++fpsWatch.n > 240 && fpsWatch.ema > 26){ setLite(1); } }

const tintCache = new Map(), tintBusy = new Set();
function tintKey(src, ph){ return ph + '|' + src.length + '|' + src.slice(-48); }
function bakeTint(src, ph){ const k = tintKey(src, ph); if (tintCache.has(k) || tintBusy.has(k)) return; tintBusy.add(k);
  const [r, g, b] = M2TINT[ph] || [1,1,1], im = new Image();
  im.onload = () => { try { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d');
      x.drawImage(im, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = `rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`; x.fillRect(0, 0, c.width, c.height);
      x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0);   // keep the original transparency
      if (blobOK) c.toBlob(bl => { tintBusy.delete(k); if (bl){ tintCache.set(k, URL.createObjectURL(bl)); applyBakedSoon(); } bakeNext(); }, 'image/png');
      else { tintCache.set(k, c.toDataURL('image/png')); tintBusy.delete(k); applyBakedSoon(); bakeNext(); } } catch(_){ tintBusy.delete(k); bakeNext(); } };   // a data URL works everywhere the original art does
  im.onerror = () => { tintBusy.delete(k); bakeNext(); }; bakeQ.push(() => { im.src = src; }); if (!bakeOn) bakeNext(); }
// one image at a time, between frames, so baking never stalls an animation
const bakeQ = []; let bakeOn = false, applyT = 0;
function bakeNext(){ const f = bakeQ.shift(); bakeOn = !!f; if (f) setTimeout(f, 40); }
function applyBakedSoon(){ clearTimeout(applyT); applyT = setTimeout(applyBaked, 30); }
// swap in baked images; a layer loses its filter once every image in it is baked
function applyBaked(){ const ph = phase(); if (ph === 'day') return;
  document.querySelectorAll('#scene [filter="url(#m2t)"], #sceneFront [filter="url(#m2t)"]').forEach(gr => { let all = true;
    gr.querySelectorAll('image').forEach(im => { const src = im.dataset.src || im.getAttribute('href'); if (!im.dataset.src) im.dataset.src = src; const u = tintCache.get(tintKey(src, ph));
      if (u){ if (im.getAttribute('href') !== u) im.setAttribute('href', u); } else { all = false; bakeTint(src, ph); } });
    if (all) gr.removeAttribute('filter'); }); }
const _drawScene = drawScene;
drawScene = function(){ _drawScene(); try { applyBaked(); rexTintLite(); if (typeof prebake === 'function') setTimeout(prebake, 800); } catch(_){} };
setLite(lite);
// bake both places for the current light ahead of time, while nothing is moving, so a trip never waits on it
let prebaked = '';
function prebake(){ const ph = phase(); if (ph === 'day' || prebaked === ph) return; prebaked = ph;
  const srcs = [...Object.values(M2.img || {}), ...Object.values(B2.img || {})].filter(s => typeof s === 'string');
  const go = () => srcs.forEach(s => bakeTint(s, ph)); 'requestIdleCallback' in window ? requestIdleCallback(go, { timeout:3000 }) : setTimeout(go, 1500); }
setTimeout(prebake, 2500); setInterval(prebake, 60e3);
// The scene art ships as data URLs; each new copy of a scene re-reads and re-decodes those long strings.
// Where the page allows blob: images, they're turned into short object URLs once, so the browser decodes each picture one time.
let blobOK = false;
function toBlobURL(d){ const i = d.indexOf(','), mime = d.slice(5, d.indexOf(';')), bin = atob(d.slice(i + 1)), u8 = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k); return URL.createObjectURL(new Blob([u8], { type:mime })); }
(function blobify(){ try { const test = toBlobURL('data:image/gif;base64,R0lGODlhAQABAAAAACw='), im = new Image();
  im.onload = () => { blobOK = true; const step = (list) => { const job = list.shift(); if (!job) { drawScene(); return; } const [o, k] = job; if (typeof o[k] === 'string' && o[k].startsWith('data:')) o[k] = toBlobURL(o[k]); setTimeout(() => step(list), 0); };
    step([...Object.keys(M2.img || {}).map(k => [M2.img, k]), ...Object.keys(B2.img || {}).map(k => [B2.img, k])]); };
  im.src = test; } catch(_){} })();
