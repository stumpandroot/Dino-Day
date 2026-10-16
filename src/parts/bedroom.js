/* ================= the bedroom, built from separate painted layers =================
   Same idea as the meadow: positions are in art space (1672 x 941); "base" items are placed by their bottom center.
   Every piece sits in <g class="obj" data-obj> (for wiggles) around <g class="sw" data-sway> (for the soft sway that
   follows the pointer and the breeze), so leaves, curtains, and flags move on their own. */
const B2 = __BEDROOM__;
const BR = { curtOpen: S.curtains !== 'closed', bedMessy: false, chestOpen: false, moon: false, lantern: false };
function b2Box(it, n){ n = n || it.n; const w = it.w, h = w*B2.ar[n]; return it.base ? [it.x - w/2, it.y - h, w, h] : [it.x, it.y, w, h]; }
function b2Img(it, n){ const [x, y, w, h] = b2Box(it, n); return `<image href="${B2.img[n || it.n]}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" preserveAspectRatio="none"/>`; }
const SWAY_ORIGIN = { leaves:'50% 100%', hang:'50% 0%', top:'50% 0%', curtain:'50% 0%' };
function b2Obj(it, inner, sway){ inner = inner || b2Img(it); sway = sway || it.sway;
  const org = sway === 'fg' ? fgOrigin(it.id) : SWAY_ORIGIN[sway];
  return `<g class="obj" data-obj="${it.id || it.n}"><g class="sw"${sway ? ` data-sway="${sway}" style="transform-origin:${org}"` : ''}>${inner}</g></g>`; }
// foreground plants rock from where they'd be rooted: the bottom outside corner, off screen
const fgOrigin = id => /L$|left/i.test(id) ? '0% 100%' : '100% 100%';
function b2Glow(id, x, y, r, col){ return `<circle class="b2glow" data-glow="${id}" cx="${x}" cy="${y}" r="${r}" fill="url(#b2g_${id})" style="mix-blend-mode:screen"/><defs><radialGradient id="b2g_${id}"><stop offset="0" stop-color="${col}" stop-opacity=".75"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs>`; }
function b2Curtains(){ const C = B2.layout.curtains, open = BR.curtOpen;
  const one = (side) => { const it = C[open ? side : side + 'c']; return `<g class="sw" data-sway="curtain" data-side="${side}" style="transform-origin:50% 0%">${b2Img(it)}</g>`; };
  return `<g class="obj" data-obj="curtains">${one('L')}${one('R')}</g>`; }
function bedroomScene(ph){ const L = B2.layout, F = ph === 'day' ? '' : ' filter="url(#m2t)"', night = ph === 'night';
  const view = L.back.find(i => i.n === 'view'), shell = L.back.find(i => i.n === 'shell'), rest = L.back.filter(i => i !== view && i !== shell);
  const wall = rest.filter(i => !i.base), floor = rest.filter(i => i.base);
  const rug = floor.filter(i => i.id === 'rug'), furn = floor.filter(i => i.id !== 'rug').sort((a, b) => a.y - b.y);   // farther back first, so nearer pieces overlap them
  const piece = it => it.id === 'bed' ? b2Obj(it, b2Img(it, BR.bedMessy ? 'bedm' : 'bed')) : it.id === 'chest' ? b2Obj(it, BR.chestOpen ? b2Img(Object.assign({}, it, { w: it.w*1.09 }), 'chesto') : b2Img(it)) : b2Obj(it);
  const moon = L.back.find(i => i.id === 'moonshelf'), lan = L.back.find(i => i.id === 'lantern'), [mx, my, mw] = b2Box(moon), [lx, ly, lw, lh] = b2Box(lan);
  // the window's own things (the hanging plant and the lantern on the sill) sit behind the curtains when they're shut
  const sill = () => `${b2Obj(L.hang, b2Img(L.hang), 'hang')}${lan ? piece(lan) : ''}`;
  const back = `${m2Filter(ph)}
    <g class="layer" data-depth=".35"${F}>${b2Img(view)}${night ? '<rect x="600" y="0" width="700" height="480" fill="#0E1636" opacity=".35"/>' + [[880,300],[905,292],[1010,318],[1060,296],[948,330]].map(([a, b]) => `<rect x="${a}" y="${b}" width="7" height="9" rx="1.5" fill="#FFD27A" opacity=".9"/>`).join('') : ''}</g>
    <g class="layer" data-depth="1"${F}>${b2Img(shell)}${BR.curtOpen ? b2Curtains() + sill() : sill() + b2Curtains()}${wall.map(it => b2Obj(it)).join('')}${rug.map(it => b2Obj(it)).join('')}${furn.filter(it => it.id !== 'lantern').map(piece).join('')}</g>
    <g class="layer" data-depth="1">${BR.moon || night ? b2Glow('moon', (mx + mw*.47).toFixed(0), (my + mw*.12).toFixed(0), 120, '#FFF1C4') : ''}${BR.lantern ? b2Glow('lantern', (lx + lw/2).toFixed(0), (ly + lh*.55).toFixed(0), 110, '#FFC46A') : ''}</g>`;
  // while Rex is in bed, a copy of the footboard and its posts draws in front of him, so he's in the bed rather than on top of it
  let foot = ''; if (rex.inBed){ const bed = L.back.find(i => i.id === 'bed'), [x, y, w, h] = b2Box(bed, 'bedm'), P = [[0,.31],[.11,.31],[.11,.5],[.55,.55],[.55,.44],[.665,.44],[.665,1],[0,1]];
    foot = `<defs><clipPath id="b2foot"><polygon points="${P.map(([a, b]) => `${(x + a*w).toFixed(1)},${(y + b*h).toFixed(1)}`).join(' ')}"/></clipPath></defs><g clip-path="url(#b2foot)">${b2Img(bed, 'bedm')}</g>`; }
  const front = `${m2Filter(ph)}<g class="layer" data-depth="1"${F}>${foot}</g><g class="layer" data-depth="1.3"${F}>${L.front.map(it => b2Obj(it)).join('')}</g>`;
  return [back, front]; }
function b2Redraw(){ if (place() === 'bedroom') drawScene(); }

/* ---------- sway: a soft spring per piece. The breeze moves the curtains and flags; the pointer pushes whatever it passes over ---------- */
const SWS = new WeakMap(); let swPtr = null, swPrev = null;
world.addEventListener('pointermove', e => { swPtr = { x:e.clientX, y:e.clientY }; });
world.addEventListener('pointerleave', () => { swPtr = null; swPrev = null; });
function swayKick(sel, v){ document.querySelectorAll(sel).forEach(el => { const s = SWS.get(el) || { a:0, v:0 }; s.v += v; SWS.set(el, s); }); }
function swayStep(dt, t){ const els = document.querySelectorAll('#zoom [data-sway]'); if (!els.length) return;
  const dx = swPtr && swPrev ? swPtr.x - swPrev.x : 0; swPrev = swPtr ? { ...swPtr } : null;
  els.forEach((el, i) => { const s = SWS.get(el) || { a:0, v:0 }, type = el.dataset.sway;
    if (swPtr && Math.abs(dx) > .5){ const r = el.getBoundingClientRect(); if (swPtr.x > r.left && swPtr.x < r.right && swPtr.y > r.top && swPtr.y < r.bottom) s.v += Math.max(-40, Math.min(40, dx))*(type === 'curtain' ? .9 : type === 'fg' ? .35 : 1.6); }
    if (type === 'fg'){   // big, close, and soft: a slow rock of a degree or two, never a shear
      const idle = Math.sin(t*.55 + i*1.7)*.7 + Math.sin(t*1.3 + i)*.2; s.v += ((idle - s.a)*9 - s.v*2.6)*dt; s.a += s.v*dt; s.a = Math.max(-4, Math.min(4, s.a)); SWS.set(el, s);
      el.style.transform = `rotate(${(el.style.transformOrigin.startsWith('0%') ? s.a : -s.a).toFixed(2)}deg)`; return; }
    const idle = type === 'curtain' ? Math.sin(t*.8 + i)*.9 + Math.sin(t*1.9 + i*2)*.3 : type === 'top' ? Math.sin(t*1.1 + i)*.8 : type === 'hang' ? Math.sin(t*.7 + i)*.6 : Math.sin(t*.9 + i)*.25;
    s.v += ((idle - s.a)*22 - s.v*3.2)*dt; s.a += s.v*dt; s.a = Math.max(-12, Math.min(12, s.a)); SWS.set(el, s);
    el.style.transform = `skewX(${(type === 'leaves' ? -s.a : s.a).toFixed(2)}deg)`; }); }

/* ---------- what each piece does ---------- */
const squeak = () => beep([[1250,.06,0,'square',.025],[1700,.09,.06,'square',.022],[1400,.05,.15,'square',.018]]);
function bedroomAct(id, x, y, H){ const ph = phase(), L = B2.layout, it = L.back.find(i => i.id === id) || L.front.find(i => i.id === id) || (id === 'hangplant' ? L.hang : null), cx = it ? (b2Box(it)[0] + b2Box(it)[2]/2) : null;
  switch (id){
    case 'curtains': BR.curtOpen = !BR.curtOpen; S.curtains = BR.curtOpen ? 'open' : 'closed'; save(); SFX.pop(); b2Redraw(); setTimeout(() => swayKick('[data-sway="curtain"]', BR.curtOpen ? 30 : -30), 30);
      rex.say(BR.curtOpen ? pick(['Let the light in!','Good morning, window.']) : pick(['Cozy mode.','Curtains closed.']), 1300); return true;
    case 'window': H.goDo(950, 1, () => { rig()?.face('curious', 1500); rex.say(ph === 'night' ? pick(['The town is sleeping.','So many lights out there.']) : ph === 'golden' || ph === 'dusk' ? 'The sky\'s on fire!' : pick(['I can see the lake.','Nice day out.']), 2000); }); return true;
    case 'dino': wiggle('dino', 'squish'); squeak(); setTimeout(squeak, 260); H.burst(x, y, 6, 'sparkle'); rig()?.face('laughing', 1200); rex.say(pick(['Squeak!','Hi, little guy!','He\'s my cousin.']), 1300); return true;
    case 'chest': H.goDo(cx - 190, 1, () => { BR.chestOpen = !BR.chestOpen; b2Redraw(); wiggle('chest');
        if (BR.chestOpen){ squeak(); H.burst(x, y - 30, 14, 'confetti'); rig()?.face('excited', 1600); rex.hop = 1; rex.say(pick(['Toys!','Look who\'s in here!']), 1400); }
        else rex.say('All tidied up.', 1200); }); return true;
    case 'bed': if (BR.bedMessy && !rex.sleeping){ H.goDo(cx + 250, -1, () => { BR.bedMessy = false; b2Redraw(); wiggle('bed'); rig()?.face('proud', 1500); rex.say('Bed\'s made!', 1400); }); return true; }
      H.goDo(cx + 250, -1, () => { BR.bedMessy = true; b2Redraw(); wiggle('bed'); rex.say('Just a little nap…', 1300);
        setTimeout(() => { const [bx, by, bw, bh] = b2Box(it, 'bedm'), zw = document.getElementById('zoom').clientWidth;   // climb in: onto the mattress, lying toward the pillow
          rex.x = rex.tx = Math.max(.09, H.sx(bx + bw*.74)/zw); rex.face = 1; rex.state = 'idle'; rex.hop = 1; rex.sleeping = true; rex.sitting = 1; rex.napUntil = Date.now() + 30000; rex.inBed = B2.layout.feetY - (by + bh*.47); b2Redraw();
          setTimeout(() => rex.say('Zzz…', 2200), 400); }, 700); }); return true;
    case 'lamp': S.lamp = !(S.lamp !== false); save(); SFX.pop(); wiggle('lamp'); H.flick(); H.seed(); rex.say(S.lamp ? pick(['Cozy.','Light on!']) : 'Lamp off.', 1300); return true;
    case 'moonshelf': if (x < H.sx(b2Box(it)[0] + b2Box(it)[2]*.62) && x > H.sx(b2Box(it)[0] + b2Box(it)[2]*.32)){ BR.moon = !BR.moon; SFX.pop(); b2Redraw(); rex.say(BR.moon ? 'My moon lamp. A tiny moon!' : 'Moon off.', 1500); return true; }
      swayKick('[data-obj^="shelfplant"] [data-sway]', 26); H.leaves(x, y, 5); H.goDo(cx + 140, -1, () => rex.say(pick(['Watering the plants.','Grow, little vines!']), 1500)); return true;
    case 'shelfplantL': case 'shelfplantR': swayKick(`[data-obj="${id}"] [data-sway]`, 30); H.leaves(x, y, 6); H.goDo(cx + 140, -1, () => rex.say(pick(['Watering the plants.','Grow, little vines!']), 1500)); return true;
    case 'lantern': BR.lantern = !BR.lantern; SFX.pop(); b2Redraw(); H.flick(); rex.say(BR.lantern ? 'Camping light!' : 'Lantern off.', 1300); return true;
    case 'books': H.goDo(cx - 210, 1, () => { rig()?.face('curious', 1000); rex.say(pick(['This one!','A volcano book.']), 1200); setTimeout(() => { rex.goTo(.5, () => { rex.face = 1; read(); }); }, 900); }); return true;
    case 'desk': H.goDo(cx - 230, 1, () => { rig()?.face('thinking', 1800); rex.say('Drawing you a picture…', 1600); setTimeout(() => { rig()?.hearts(3); rex.say('Done! It\'s you.', 1500); }, 2200); }, 3800); return true;
    case 'poster': wiggle('poster'); rex.face = -1; rex.shake = 1; rex.sq = .1; rex.say('RAWR! …he roared back. Probably.', 2000); return true;
    case 'printT': case 'printM': case 'cactus': wiggle(id, 'sway'); rex.say(pick(['I drew that one.','Nice, right?']), 1200); return true;
    case 'bunting': swayKick('[data-obj="bunting"] [data-sway]', 34); H.burst(x, y, 6, 'confetti'); rex.say('Party flags!', 1100); return true;
    case 'hangplant': case 'basket': swayKick(`[data-obj="${id}"] [data-sway]`, 30); H.leaves(x, y, 6); H.goDo(cx + (id === 'basket' ? -150 : 0), id === 'basket' ? 1 : 0, () => rex.say(pick(['Watering the plants.','Does it need water?','Leafy!']), 1400)); return true;
    case 'stand': wiggle('stand'); rex.say(pick(['My secret snack drawer.','Nothing in here. Probably.']), 1500); return true;
    case 'fgL': case 'fgR': swayKick(`[data-obj="${id}"] [data-sway]`, 10); H.leaves(x, y, 6); return true;
    case 'rug': return false;
  }
  return false; }
function bedroomHot(){ const L = B2.layout, hot = [];
  for (const it of L.front) { const [x, y, w, h] = b2Box(it); hot.push({ id:it.id, box:[x + w*.05, y + h*.25, x + w, y + h] }); }
  const furn = L.back.filter(i => i.base && i.id !== 'rug').slice().sort((a, b) => b.y - a.y);   // front-most first
  for (const it of furn){ const [x, y, w, h] = b2Box(it); hot.push({ id:it.id, box:[x, y, x + w, y + h] }); }
  hot.push({ id:'hangplant', box: (() => { const [x, y, w, h] = b2Box(L.hang); return [x, y, x + w, y + h]; })() });
  const C = L.curtains, cl = b2Box(C.L), cr = b2Box(C.R);
  hot.push({ id:'curtains', box:[cl[0], cl[1], cl[0] + cl[2]*.75, cl[1] + cl[3]] }, { id:'curtains', box:[cr[0] + cr[2]*.25, cr[1], cr[0] + cr[2], cr[1] + cr[3]] });
  for (const it of L.back.filter(i => !i.base && i.id && i.id !== 'window')){ const [x, y, w, h] = b2Box(it); hot.push({ id:it.id, box:[x, y, x + w, y + h] }); }
  hot.push({ id:'window', box:[705, 59, 1190, 430] });
  return hot; }
