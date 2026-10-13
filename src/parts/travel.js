/* ================= going places: a picker, and Rex walks there =================
   The place button opens a small card with a picture of each place (in the current light).
   Picking one: Rex turns and walks off the edge, the camera pans to the new place, and he walks in from the other side. */
const PLACE_THUMBS = __PLACETHUMBS__;
const PLACE_LIST = [['meadow','Meadow','Outside, by the lake'],['bedroom','Bedroom','His room, with his toys']];
const thumbFor = pl => { const ph = phase() === 'morning' ? 'day' : phase(); return PLACE_THUMBS[`${pl}-${ph}`] || PLACE_THUMBS[`${pl}-day`]; };
let travelling = false;

function placePicker(){ const old = $('#placePick'); if (old){ closePlacePicker(); return; }
  const chip = $('#placeChip'), wr = app.getBoundingClientRect(), cr = chip.getBoundingClientRect();   // it lives on the app, so the sheet can't cut it off
  const el = document.createElement('div'); el.id = 'placePick'; el.className = 'placepick'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Where should Rex go?');
  el.innerHTML = `<div class="pph">Where should Rex go?</div><div class="ppgrid">${PLACE_LIST.map(([k, l, d]) => `<button type="button" data-goto="${k}" aria-pressed="${place() === k}"><span class="ppimg"><img src="${thumbFor(k)}" alt="">${place() === k ? `<i class="ppok">${IC.check}</i>` : ''}</span><b>${l}</b><span>${place() === k ? 'He\'s here now' : d}</span></button>`).join('')}</div>`;
  app.appendChild(el);
  // under the button when there's room, otherwise above it; never past the world's edges
  const w = el.offsetWidth, h = el.offsetHeight, below = cr.bottom - wr.top + 8, above = cr.top - wr.top - h - 8;
  el.style.top = (below + h < wr.height - 8 || above < 8 ? below : above) + 'px';
  el.style.left = Math.max(8, Math.min(wr.width - w - 8, cr.right - wr.left - w)) + 'px';
  el.style.transformOrigin = `${cr.left + cr.width/2 - wr.left - parseFloat(el.style.left)}px ${below + h < wr.height - 8 || above < 8 ? 'top' : 'bottom'}`;
  chip.setAttribute('aria-expanded', 'true'); SFX.pop && SFX.pop();
  el.onclick = e => { e.stopPropagation(); const b = e.target.closest('[data-goto]'); if (!b) return; const k = b.dataset.goto; closePlacePicker(); if (k !== place()) travelTo(k); else { rex.hop = 1; rex.say(pick(['I\'m already here!','Right here!']), 1300); } };
  setTimeout(() => addEventListener('pointerdown', ppOutside, true), 0); }
function ppOutside(e){ if (!e.target.closest('#placePick,#placeChip')) closePlacePicker(); }
function closePlacePicker(){ const el = $('#placePick'); removeEventListener('pointerdown', ppOutside, true); $('#placeChip')?.setAttribute('aria-expanded', 'false'); if (!el) return;
  el.classList.add('out'); setTimeout(() => el.remove(), 160); }
$('#placeChip').onclick = e => { e.stopPropagation(); placePicker(); };
$('#placeChip').setAttribute('aria-haspopup', 'dialog'); $('#placeChip').setAttribute('aria-expanded', 'false');
addEventListener('keydown', e => { if (e.key === 'Escape') closePlacePicker(); });

// Rex walks off the edge, the world pans, he walks in. Asleep, away on your list, or with reduced motion, it's a soft crossfade.
function travelTo(dest){ if (travelling || dest === place()) return; travelling = true; closePlacePicker();
  const dir = dest === 'bedroom' ? 1 : -1, walkable = !rex.sleeping && !S.asleep && !rex.away && !carry && !fall && !reduceMotion.matches;
  bubble.classList.remove('on','btns'); clearAllProps(); rex.busyUntil = Date.now() + 4000;
  const arrive = () => { const nx = dir > 0 ? .32 : .68; rex.travel = true; rex.spd = 2.6; rex.x = dir > 0 ? -.12 : 1.12; rex.tx = rex.x; rex.face = dir; rexEl.style.visibility = '';
    rex.goTo(nx, () => { rex.travel = false; rex.spd = 1; travelling = false; rex.busyUntil = 0; rex.hop = 1;
      rex.say(dest === 'bedroom' ? pick(['Home sweet home.','My room!','Cozy in here.']) : pick(['Fresh air!','Back outside!','Hello, meadow!']), 1600); }); rex.x = dir > 0 ? -.12 : 1.12; };
  const swap = () => { S.place = dest; save(); drawScene(); try { render(); } catch(_){} };
  if (!walkable){ crossfade(swap, () => { travelling = false; rex.busyUntil = 0; rex.x = rex.tx = .5; }); return; }
  // 1. turn and walk off the edge
  rex.travel = true; rex.spd = 2.6; rex.face = dir; rex.goTo(dir > 0 ? 1.14 : -.14, () => { rexEl.style.visibility = 'hidden';
    // 2. pan: the old place slides out as the new one slides in
    pan(dir, swap, arrive); });
  rex.tx = dir > 0 ? 1.14 : -.14;   // goTo clamps to the screen; the trip goes past the edge
}
function sceneParts(){ const z = $('#zoom'); return [$('#scene'), $('#sceneFront'), ...z.querySelectorAll('.fxc')].filter(Boolean); }
function freeze(){ const z = $('#zoom'), box = document.createElement('div'); box.className = 'travelOld';
  for (const el of [$('#scene'), $('#sceneFront')]){ const c = el.cloneNode(true); c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(n => { if (n.tagName.toLowerCase() !== 'filter') n.removeAttribute('id'); }); box.appendChild(c); }
  z.querySelectorAll(':scope > .fxc').forEach(cv => { const c = document.createElement('canvas'); c.className = cv.className; c.width = cv.width; c.height = cv.height; try { c.getContext('2d').drawImage(cv, 0, 0); } catch(_){} box.appendChild(c); });   // the light and shade go with it
  z.insertBefore(box, $('#wprops')); return box; }
function pan(dir, swap, done){ const old = freeze(); swap(); const parts = sceneParts(), D = 720, E = 'cubic-bezier(.65,0,.35,1)';
  old.animate([{ transform:'translateX(0)' }, { transform:`translateX(${-dir*100}%)` }], { duration:D, easing:E, fill:'forwards' });
  parts.forEach(el => el.animate([{ transform:`translateX(${dir*100}%)` }, { transform:'translateX(0)' }], { duration:D, easing:E }));
  setTimeout(() => { old.remove(); done(); }, D); }
function crossfade(swap, done){ const old = freeze(); swap(); rex.x = rex.tx = .5;
  old.animate([{ opacity:1 }, { opacity:0 }], { duration:reduceMotion.matches ? 1 : 650, easing:'ease', fill:'forwards' }).onfinish = () => { old.remove(); done(); }; }
