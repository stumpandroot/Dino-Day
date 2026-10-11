/* ================= living world: light, dust, bugs, grass, tappable things ================= */
const FX = (() => {
  const zoom = $('#zoom');
  const light = document.createElement('canvas'); light.className = 'fxc light'; zoom.insertBefore(light, $('#props'));
  const dark = document.createElement('canvas'); dark.className = 'fxc dark'; zoom.insertBefore(dark, light);
  const front = document.createElement('canvas'); front.className = 'fxc front'; zoom.insertBefore(front, $('#bubble'));
  const lc = light.getContext('2d'), dc = dark.getContext('2d'), fc = front.getContext('2d');
  let W = 0, H = 0, dpr = 1, M = { s:1, tx:0, ty:0, vx:0, vy:0, vw:1672, vh:941 };
  let dust = [], bugs = [], bits = [], rings = [], tufts = [], gust = 0, ptr = null, ptrV = { x:0, y:0 }, lastPtr = null, flick = 0;

  // places: hotspots in art pixels (1672 x 941); sunset bedroom art sits ~25px to the right
  const HOT = {
    bedroom: [
      { id:'lamp', x:500, y:340, r:70, label:'the lamp' },
      { id:'lantern', x:1495, y:185, r:45, label:'the lantern' },
      { id:'window', box:[745, 55, 1185, 430], label:'the window' },
      { id:'toybox', box:[1115, 470, 1400, 625], label:'the toy box' },
      { id:'bed', box:[0, 300, 470, 690], label:'the bed' },
      { id:'plant', x:1460, y:545, r:70, label:'the plant' },
      { id:'pothos', x:795, y:420, r:55, label:'the little plant' },
      { id:'moonlamp', x:110, y:112, r:45, label:'the moon lamp' },
      { id:'poster', box:[275, 60, 485, 300], label:'the poster' },
      { id:'bunting', box:[60, 0, 360, 70], label:'the flags' },
    ],
    meadow: [
      { id:'house', box:[1045, 350, 1275, 530], label:'the house' },
      { id:'lake', box:[540, 495, 880, 545], label:'the lake' },
      { id:'treeL', box:[0, 60, 330, 470], label:'the big tree' },
      { id:'treeR', box:[1460, 200, 1672, 520], label:'the tree' },
      { id:'flowersL', x:160, y:648, r:70, label:'the flowers' },
      { id:'flowersR', x:1490, y:668, r:70, label:'the flowers' },
      { id:'sky', box:[380, 0, 1672, 330], label:'the sky' },
    ],
  };
  const LIGHTS = { // key lights per place/art: [x, y, color, size]
    bedroom: { day:[[965, 240, '255,214,150', 1]], golden:[[1000, 290, '255,170,90', 1], [520, 345, '255,196,110', .7]], dusk:[[1000, 290, '255,160,90', .8], [520, 345, '255,196,110', .8]], night:[[500, 340, '255,196,110', 1], [1495, 185, '255,180,90', .55], [110, 112, '255,230,180', .35], [1070, 130, '170,190,255', .45]] },
    meadow: { day:[[1335, 145, '255,245,200', 1]], golden:[[720, 385, '255,170,80', 1.2]], dusk:[[755, 430, '255,140,90', .7]], night:[[1295, 155, '210,220,255', .7], [1225, 480, '255,200,120', .35]] },
  };
  const artPh = () => { const ph = phase(); return ph === 'morning' ? 'day' : ph; };
  const dxArt = () => place() === 'bedroom' && ['golden','dusk'].includes(phase()) ? 25 : 0;
  const lampOn = () => S.lamp !== false;

  function resize(){ dpr = Math.min(2, devicePixelRatio || 1); W = zoom.clientWidth; H = zoom.clientHeight;
    [light, dark, front].forEach(c => { c.width = Math.round(W*dpr); c.height = Math.round(H*dpr); }); seed(); }
  function mapping(){ const vb = (scene.getAttribute('viewBox') || '0 0 1672 941').split(' ').map(Number); const s = Math.max(W/vb[2], H/vb[3]);
    const par = -(rex.x - .5)*70; M = { s, tx:(W - vb[2]*s)/2 - vb[0]*s + par*s, ty:(H - vb[3]*s) - vb[1]*s }; }
  const sx = x => M.tx + x*M.s, sy = y => M.ty + y*M.s;
  const ax = px => (px - M.tx)/M.s, ay = py => (py - M.ty)/M.s;

  function seed(){
    const pl = place(), ph = artPh(), n = Math.round((W*H)/9000);
    dust = Array.from({ length: pl === 'bedroom' ? n : Math.round(n*.6) }, () => ({ x:Math.random()*W, y:Math.random()*H, vx:0, vy:0, r:.6 + Math.random()*1.6, p:Math.random()*6.28, z:.4 + Math.random()*.8 }));
    bugs = [];
    if (pl === 'meadow'){
      if (ph === 'day'){ for (let i = 0; i < 2; i++) bugs.push(bug('fly', i)); bugs.push(bug('bee', 0)); }
      if (ph === 'golden'){ for (let i = 0; i < 8; i++) bugs.push(bug('gnat', i)); bugs.push(bug('fly', 0)); }
      if (ph === 'dusk' || ph === 'night'){ for (let i = 0; i < (ph === 'night' ? 16 : 10); i++) bugs.push(bug('firefly', i)); }
    } else {
      if (ph === 'night' && lampOn()) for (let i = 0; i < 2; i++) bugs.push(bug('moth', i));
      if (ph === 'day') bugs.push(bug('ladybug', 0));
    }
    tufts = pl === 'meadow' ? Array.from({ length: 26 }, (_, i) => ({ x: (i + Math.random()*.6)/26, h: 16 + Math.random()*16, b:0, bv:0, k: Math.random() })) : [];
  }
  function bug(kind, i){ const b = { kind, i, x: Math.random()*W, y: H*(.35 + Math.random()*.4), vx:0, vy:0, t:Math.random()*100, scared:0, home:null };
    if (kind === 'moth'){ b.home = [500, 330]; }
    if (kind === 'ladybug'){ b.x = sx(760 + Math.random()*400); b.y = sy(438); b.dir = 1; }
    return b; }

  /* ---------- input ---------- */
  world.addEventListener('pointermove', e => { const r = zoom.getBoundingClientRect(); const p = { x:e.clientX - r.left, y:e.clientY - r.top };
    if (lastPtr){ ptrV = { x:p.x - lastPtr.x, y:p.y - lastPtr.y }; } lastPtr = p; ptr = p; });
  world.addEventListener('pointerleave', () => { ptr = null; lastPtr = null; });
  let downAt = null;
  world.addEventListener('pointerdown', e => { if (e.target.closest('.rex,button,.playbar,.bubble')) { downAt = null; return; } downAt = { x:e.clientX, y:e.clientY, t:performance.now() }; });
  world.addEventListener('pointerup', e => { if (!downAt) return; const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y), dt = performance.now() - downAt.t; downAt = null;
    const r = zoom.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    if (moved > 30 && dt < 600 && Math.abs(e.clientX - (e.clientX - 0)) >= 0){ swoosh(px, py, (e.clientX - (px + r.left)) ); }
    if (moved < 12) tap(px, py); });

  function swoosh(){ gust = 1; }
  function hitAt(px, py){ const x = ax(px) - dxArt(), y = ay(py);
    // bugs first
    for (const b of bugs){ if (Math.hypot(b.x - px, b.y - py) < 26){ return { bug:b }; } }
    for (const h of HOT[place()]){ if (h.box ? (x >= h.box[0] && x <= h.box[2] && y >= h.box[1] && y <= h.box[3]) : Math.hypot(x - h.x, y - h.y) < h.r) return { hot:h }; }
    return null; }
  function tap(px, py){ if (S.asleep){ rex.say('Zzz…', 1200); return; } const hit = hitAt(px, py);
    burst(px, py, 10, 'sparkle');
    if (!hit) return;
    if (hit.bug){ const b = hit.bug; b.scared = 1.4; b.vx += (Math.random()*2 - 1)*6; b.vy -= 5;
      rex.say(pick({ fly:['Butterfly!','Come back!'], bee:['Bzzz! Careful!'], gnat:['Tiny bugs!'], firefly:['A firefly!','So glowy.'], moth:['Hi, moth.','Moths love the lamp.'], ladybug:['A ladybug! Lucky.'] }[b.kind] || ['Bug!']), 1500);
      if (b.kind === 'fly') rex.goTo(Math.max(.1, Math.min(.9, px/W)));
      played(); return; }
    const h = hit.hot; const x = sx((h.x || (h.box[0] + h.box[2])/2) + dxArt()), y = sy(h.y || (h.box[1] + h.box[3])/2);
    act(h.id, x, y); played(); }

  function act(id, x, y){ const ph = artPh();
    switch (id){
      case 'lamp': S.lamp = !lampOn(); save(); SFX.pop(); flick = 1; burst(x, y, 14, 'glow'); rex.say(lampOn() ? pick(['Cozy.','Light on!']) : ph === 'night' ? 'Ooh, spooky. I can see the moon better.' : 'Lamp off.', 1800); seed(); break;
      case 'lantern': flick = 1.5; burst(x, y, 18, 'ember'); rex.say(pick(['The lantern flickered!','Warm little light.']), 1500); break;
      case 'moonlamp': burst(x, y, 16, 'glow'); rex.say('My moon lamp. It\'s a tiny moon!', 1800); break;
      case 'window': rex.goTo(.55, () => { rex.face = 1; rex.say(ph === 'night' ? pick(['So many stars…','The town is sleeping.']) : ph === 'golden' || ph === 'dusk' ? 'The sky\'s on fire!' : pick(['Nice day out.','I can see the river.']), 2200); });
        if (ph === 'night') for (let i = 0; i < 2; i++) setTimeout(() => shootingStar(sx(780 + Math.random()*300), sy(80 + Math.random()*100)), 400 + i*900); break;
      case 'toybox': burst(x, y - 20, 12, 'confetti'); rex.say('Toys!', 1200); setTimeout(ballDrop, 300); break;
      case 'bed': rex.say('Bounce!', 1200); rex.goTo(PLACES.bedroom.bed, () => { rex.hop = 1; setTimeout(() => rex.hop = 1, 450); setTimeout(() => rex.hop = 1, 900); }); break;
      case 'plant': case 'pothos': leaves(x, y, 7); rex.say(pick(['Hi, plant.','Does it need water?','Leafy!']), 1500); break;
      case 'poster': rex.face = -1; rex.shake = 1; rex.sq = .1; rex.say('RAWR! …he roared back. Probably.', 2200); break;
      case 'bunting': for (let i = 0; i < 6; i++) setTimeout(() => burst(x - 120 + i*50, y, 3, 'confetti'), i*60); rex.say('Party flags!', 1300); break;
      case 'house': smoke(sx(1185), sy(358)); rex.say(pick(['That\'s home.','Someone\'s making dinner.']), 1800); break;
      case 'lake': ripple(x, y); setTimeout(() => ripple(x + 30, y + 4), 300); rex.say(pick(['Plop!','I want to skip a stone.']), 1500); break;
      case 'treeL': case 'treeR': leaves(x, y, 10); if (ph !== 'night') bird(x, y); rex.say(pick(['Leaves!','A bird lives up there.']), 1500); break;
      case 'flowersL': case 'flowersR': burst(x, y, 12, 'petal'); if (ph === 'day') bugs.push(Object.assign(bug('fly', 9), { x, y })); rex.say(pick(['Smells nice.','Flowers!']), 1400); break;
      case 'sky': if (ph === 'night') shootingStar(x, y); else { gust = 1; rex.say('Whoosh, wind!', 1200); } break;
    } }

  /* ---------- particle helpers ---------- */
  function burst(x, y, n, kind){ for (let i = 0; i < n; i++){ const a = Math.random()*6.28, sp = 1 + Math.random()*3;
    bits.push({ kind, x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - (kind === 'ember' || kind === 'glow' ? 1.5 : 1), life:1, decay: .012 + Math.random()*.02, r:2 + Math.random()*3, rot:Math.random()*6, c: kind === 'confetti' ? ['#E8775A','#F2B84B','#8DB07A','#7FA6C9'][i%4] : kind === 'petal' ? ['#FFF4EC','#F7C6C9'][i%2] : null }); } }
  function leaves(x, y, n){ for (let i = 0; i < n; i++) bits.push({ kind:'leaf', x: x + (Math.random()*80 - 40), y: y + (Math.random()*40 - 20), vx:(Math.random()*2 - 1), vy:.4 + Math.random(), life:1, decay:.006, r:4 + Math.random()*3, rot:Math.random()*6, c: ['#5E7A45','#7FA35A','#4B6B3A'][i%3] }); }
  function smoke(x, y){ for (let i = 0; i < 8; i++) setTimeout(() => bits.push({ kind:'smoke', x: x + Math.random()*6, y, vx:.2 + Math.random()*.3, vy:-.6 - Math.random()*.4, life:1, decay:.008, r:6 + Math.random()*4 }), i*160); }
  function ripple(x, y){ rings.push({ x, y, r:4, life:1 }); }
  function shootingStar(x, y){ bits.push({ kind:'star', x, y, vx:7, vy:2.5, life:1, decay:.025, r:2 }); }
  function bird(x, y){ bits.push({ kind:'bird', x, y, vx: x < W/2 ? 3 : -3, vy:-1.6, life:1, decay:.006, r:6, t:0 }); }

  /* ---------- per-frame ---------- */
  function step(dt, t){
    if (!W) resize(); mapping();
    const pl = place(), ph = artPh(), night = ph === 'night', K = (LIGHTS[pl][ph] || []).filter(l => !(pl === 'bedroom' && night && l[0] === 500 && !lampOn()));
    const rx = rex.x*W, ry = H - parseFloat(getComputedStyle(zoom).getPropertyValue('--ground') || 60);
    gust = Math.max(0, gust - dt*.6); flick = Math.max(0, flick - dt);
    if (ptr){ ptrV.x *= .85; ptrV.y *= .85; }

    /* dark layer: lamp off at night, gentle vignette */
    dc.setTransform(dpr, 0, 0, dpr, 0, 0); dc.clearRect(0, 0, W, H);
    if (pl === 'bedroom' && night && !lampOn()){ dc.fillStyle = 'rgba(40,52,110,.55)'; dc.fillRect(0, 0, W, H); }
    const vg = dc.createRadialGradient(W/2, H*.55, Math.min(W, H)*.35, W/2, H*.55, Math.max(W, H)*.8); vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, night ? 'rgba(20,24,60,.35)' : 'rgba(80,50,40,.18)');
    dc.fillStyle = vg; dc.fillRect(0, 0, W, H);

    /* light layer: god rays + glows (screen) */
    lc.setTransform(dpr, 0, 0, dpr, 0, 0); lc.clearRect(0, 0, W, H);
    rays(lc, pl, ph, t);
    for (const [x, y, c, s] of K){ const px = sx(x + dxArt()), py = sy(y); const fl = 1 + Math.sin(t*9 + x)*.04 + (flick ? Math.sin(t*40)*.15*flick : 0);
      const R = 140*M.s*s*fl*(night ? 1.25 : 1); const g = lc.createRadialGradient(px, py, 0, px, py, R); g.addColorStop(0, `rgba(${c},${.38*s})`); g.addColorStop(1, `rgba(${c},0)`); lc.fillStyle = g; lc.fillRect(px - R, py - R, R*2, R*2); }

    /* front layer: dust, bugs, bits, grass */
    fc.setTransform(dpr, 0, 0, dpr, 0, 0); fc.clearRect(0, 0, W, H);
    const beam = beamTest(pl, ph);
    for (const d of dust){
      d.p += dt*(.6 + d.z*.4); d.vx += Math.sin(d.p*.7)*.004 + gust*.05; d.vy += Math.cos(d.p*.5)*.003 - .0006;
      if (ptr){ const dx = d.x - ptr.x, dy = d.y - ptr.y, dd = dx*dx + dy*dy; if (dd < 6400){ const f = (1 - dd/6400); d.vx += (dx*.002 + ptrV.x*.04)*f; d.vy += (dy*.002 + ptrV.y*.04)*f; } }
      if (rex.state === 'walk' || rex.hop > 0){ const dx = d.x - rx, dy = d.y - (ry - 30); if (dx*dx + dy*dy < 9000){ d.vx += Math.sign(dx)*.05; d.vy -= .05; } }
      d.vx *= .96; d.vy *= .96; d.x += d.vx; d.y += d.vy;
      if (d.x < -5) d.x = W + 5; if (d.x > W + 5) d.x = -5; if (d.y < -5) d.y = H + 5; if (d.y > H + 5) d.y = -5;
      const lit = beam(d.x, d.y); const a = (pl === 'meadow' ? .35 : .2) + lit*.7; if (a < .05) continue;
      const tw = .6 + .4*Math.sin(d.p*3);
      fc.fillStyle = night ? `rgba(220,230,255,${a*tw*.6})` : ph === 'golden' || ph === 'dusk' ? `rgba(255,214,150,${a*tw})` : `rgba(255,248,225,${a*tw})`;
      fc.beginPath(); fc.arc(d.x, d.y, d.r*d.z, 0, 6.28); fc.fill(); }
    for (const b of bugs) drawBug(b, dt, t, rx, ry);
    if (bugs[0] && bugs[0].kind === 'fly'){ bfly.x = ax(bugs[0].x); bfly.y = ay(bugs[0].y); }
    for (let i = bits.length - 1; i >= 0; i--){ const b = bits[i]; b.life -= b.decay; if (b.life <= 0){ bits.splice(i, 1); continue; } drawBit(b, dt); }
    for (let i = rings.length - 1; i >= 0; i--){ const r = rings[i]; r.r += 40*dt; r.life -= dt*.8; if (r.life <= 0){ rings.splice(i, 1); continue; }
      fc.strokeStyle = `rgba(255,255,255,${r.life*.7})`; fc.lineWidth = 2; fc.beginPath(); fc.ellipse(r.x, r.y, r.r*1.8, r.r*.45, 0, 0, 6.28); fc.stroke(); }
    grass(dt, t, rx, ry);
    edgeLight(K, rx, ry);
  }

  function beamTest(pl, ph){ // how much a point sits inside a light beam (0..1)
    if (pl === 'bedroom'){ if (ph === 'night' && lampOn()){ const lx = sx(500), ly = sy(340), R = 260*M.s; return (x, y) => Math.max(0, 1 - Math.hypot(x - lx, y - ly)/R); }
      const wx0 = sx(745 + dxArt()), wx1 = sx(1185 + dxArt()), wy = sy(60), slope = .55; return (x, y) => { if (y < wy) return 0; const sh = (y - wy)*slope; return (x > wx0 - sh && x < wx1 - sh) ? (ph === 'night' ? .25 : .9) : 0; }; }
    const L = (LIGHTS.meadow[ph] || [])[0]; if (!L) return () => 0; const lx = sx(L[0]), ly = sy(L[1]); return (x, y) => Math.max(0, 1 - Math.hypot(x - lx, y - ly)/(700*M.s)) * (ph === 'night' ? .4 : 1); }

  function rays(c, pl, ph, t){
    c.save();
    if (pl === 'bedroom'){ const night = ph === 'night'; const col = night ? '190,205,255' : ph === 'day' ? '255,232,180' : '255,176,96'; const strength = night ? (lampOn() ? .10 : .22) : ph === 'day' ? .22 : .26;
      const x0 = 745 + dxArt(), x1 = 1185 + dxArt(), y0 = 60, y1 = 430, n = 5;
      for (let i = 0; i < n; i++){ const a = x0 + (x1 - x0)*(i/n), b = x0 + (x1 - x0)*((i + .7)/n); const drift = Math.sin(t*.4 + i*1.7)*.35 + .65;
        const g = c.createLinearGradient(sx(a), sy(y0), sx(a - 380), sy(941)); g.addColorStop(0, `rgba(${col},${strength*drift})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g;
        c.beginPath(); c.moveTo(sx(a), sy(y0)); c.lineTo(sx(b), sy(y0)); c.lineTo(sx(b - 520), sy(941)); c.lineTo(sx(a - 520), sy(941)); c.closePath(); c.fill(); }
    } else { const L = (LIGHTS.meadow[ph] || [])[0]; if (L && ph !== 'night'){ const lx = sx(L[0]), ly = sy(L[1]), col = L[2], n = ph === 'golden' ? 9 : 6, len = Math.max(W, H)*1.4;
      for (let i = 0; i < n; i++){ const ang = (ph === 'day' ? 1.9 : 1.15) + (i/n)*(ph === 'day' ? 1.2 : 2.6) + Math.sin(t*.15 + i)*.03, w = .05 + (i%3)*.025, drift = .55 + .45*Math.sin(t*.35 + i*2.1);
        const g = c.createRadialGradient(lx, ly, 0, lx, ly, len); g.addColorStop(0, `rgba(${col},${(ph === 'golden' ? .28 : .15)*drift})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g;
        c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx + Math.cos(ang - w)*len, ly + Math.sin(ang - w)*len); c.lineTo(lx + Math.cos(ang + w)*len, ly + Math.sin(ang + w)*len); c.closePath(); c.fill(); } } }
    c.restore(); }

  function drawBug(b, dt, t, rx, ry){ b.t += dt; b.scared = Math.max(0, b.scared - dt);
    const flee = (fx, fy, rad, k) => { const dx = b.x - fx, dy = b.y - fy, d = Math.hypot(dx, dy); if (d < rad){ b.vx += dx/d*k; b.vy += dy/d*k; } };
    if (ptr) flee(ptr.x, ptr.y, 90, .35); flee(rx, ry - 40, 70, .15);
    if (b.kind === 'fly' || b.kind === 'bee'){ const tx = W*(.5 + Math.sin(b.t*.23 + b.i*2)*.4), ty = H*(.45 + Math.sin(b.t*.61 + b.i)*.18);
      b.vx += (tx - b.x)*.0015 + Math.sin(b.t*5)*.15; b.vy += (ty - b.y)*.0015 + Math.cos(b.t*6)*.15; b.vx *= .94; b.vy *= .94; b.x += b.vx; b.y += b.vy;
      const s = b.kind === 'bee' ? 5 : 8, fl = Math.abs(Math.sin(b.t*(b.scared ? 40 : 18)));
      fc.save(); fc.translate(b.x, b.y);
      if (b.kind === 'fly'){ fc.fillStyle = '#F2A65A'; fc.beginPath(); fc.ellipse(-s*.6, 0, s*fl, s*.8, -.3, 0, 6.28); fc.fill(); fc.fillStyle = '#F7C46A'; fc.beginPath(); fc.ellipse(s*.6, 0, s*fl, s*.8, .3, 0, 6.28); fc.fill(); fc.fillStyle = '#4A3A2A'; fc.fillRect(-1, -s*.6, 2, s*1.2); }
      else { fc.fillStyle = 'rgba(255,255,255,.75)'; fc.beginPath(); fc.ellipse(-2, -4, 3, 5*fl + 1, -.4, 0, 6.28); fc.ellipse(2, -4, 3, 5*fl + 1, .4, 0, 6.28); fc.fill(); fc.fillStyle = '#F2B84B'; fc.beginPath(); fc.ellipse(0, 0, s, s*.7, 0, 0, 6.28); fc.fill(); fc.fillStyle = '#3A2E22'; fc.fillRect(-1, -4, 2, 8); fc.fillRect(3, -3.5, 2, 7); }
      fc.restore(); return; }
    if (b.kind === 'gnat'){ const cx = sx(720), cy = sy(560); b.vx += (cx + Math.sin(b.t*1.3 + b.i)*120 - b.x)*.002 + (Math.random() - .5)*.4; b.vy += (cy + Math.cos(b.t*1.1 + b.i*2)*60 - b.y)*.002 + (Math.random() - .5)*.4; b.vx *= .9; b.vy *= .9; b.x += b.vx; b.y += b.vy;
      fc.fillStyle = `rgba(255,220,150,${.5 + .5*Math.sin(b.t*9 + b.i)})`; fc.beginPath(); fc.arc(b.x, b.y, 1.6, 0, 6.28); fc.fill(); return; }
    if (b.kind === 'firefly'){ const tx = b.home ? b.home[0] : W*(.1 + (b.i*.0617 % 1)*.8), ty = H*(.48 + (b.i*.137 % 1)*.4);
      if (!rex.state || rex.state !== 'walk'){ /* drift toward Rex when he's still */ }
      b.vx += (tx + Math.sin(b.t*.7 + b.i)*50 - b.x)*.001 + (rex.sleeping || rex.sitting ? (rx - b.x)*.0004 : 0); b.vy += (ty + Math.cos(b.t*.9 + b.i*2)*30 - b.y)*.001 + (rex.sleeping || rex.sitting ? (ry - 120 - b.y)*.0004 : 0);
      b.vx *= .96; b.vy *= .96; b.x += b.vx; b.y += b.vy; const g = Math.max(0, Math.sin(b.t*1.6 + b.i*1.3))**2;
      const R = 14; const gr = fc.createRadialGradient(b.x, b.y, 0, b.x, b.y, R); gr.addColorStop(0, `rgba(255,236,150,${.9*g})`); gr.addColorStop(1, 'rgba(255,236,150,0)'); fc.fillStyle = gr; fc.fillRect(b.x - R, b.y - R, R*2, R*2);
      fc.fillStyle = `rgba(255,250,210,${.4 + .6*g})`; fc.beginPath(); fc.arc(b.x, b.y, 2, 0, 6.28); fc.fill(); return; }
    if (b.kind === 'moth'){ const hx = sx(500), hy = sy(330); const a = b.t*(1.8 + b.i*.5) + b.i*3; b.vx += (hx + Math.cos(a)*55*M.s*2 - b.x)*.02; b.vy += (hy + Math.sin(a*1.3)*35*M.s*2 - b.y)*.02; b.vx *= .82; b.vy *= .82; b.x += b.vx; b.y += b.vy;
      const fl = Math.abs(Math.sin(b.t*30)); fc.fillStyle = 'rgba(235,220,200,.85)'; fc.beginPath(); fc.ellipse(b.x - 3, b.y, 4*fl + 1, 3, 0, 0, 6.28); fc.ellipse(b.x + 3, b.y, 4*fl + 1, 3, 0, 0, 6.28); fc.fill(); return; }
    if (b.kind === 'ladybug'){ const y = sy(438); b.x += b.dir*12*dt*M.s*2; if (b.x > sx(1170) || b.x < sx(760)) b.dir *= -1; if (b.scared){ b.y -= 40*dt; } else b.y += (y - b.y)*.1;
      fc.save(); fc.translate(b.x, b.y); fc.scale(b.dir, 1); fc.fillStyle = '#D9483B'; fc.beginPath(); fc.arc(0, 0, 4, Math.PI, 0); fc.fill(); fc.fillStyle = '#2A2220'; fc.beginPath(); fc.arc(4, -1, 2, 0, 6.28); fc.fill(); fc.fillRect(-.5, -4, 1, 4); fc.restore(); return; }
  }
  function drawBit(b, dt){ const a = Math.max(0, b.life);
    if (b.kind === 'leaf' || b.kind === 'petal' || b.kind === 'confetti'){ b.vy = Math.min(b.vy + .04, 1.4); b.vx += Math.sin(b.life*12)*.06 + gust*.1; b.x += b.vx; b.y += b.vy; b.rot += .08;
      fc.save(); fc.translate(b.x, b.y); fc.rotate(b.rot); fc.globalAlpha = a; fc.fillStyle = b.c || '#fff'; fc.beginPath(); fc.ellipse(0, 0, b.r, b.r*.5, 0, 0, 6.28); fc.fill(); fc.restore(); return; }
    if (b.kind === 'sparkle' || b.kind === 'glow' || b.kind === 'ember'){ b.x += b.vx*.6; b.y += b.vy*.6; b.vx *= .94; b.vy *= .94;
      fc.fillStyle = b.kind === 'ember' ? `rgba(255,170,80,${a})` : b.kind === 'glow' ? `rgba(255,226,160,${a*.8})` : `rgba(255,255,240,${a*.9})`; fc.beginPath(); fc.arc(b.x, b.y, b.r*a + .5, 0, 6.28); fc.fill(); return; }
    if (b.kind === 'smoke'){ b.x += b.vx; b.y += b.vy; b.r += .12; fc.fillStyle = `rgba(235,235,240,${a*.35})`; fc.beginPath(); fc.arc(b.x, b.y, b.r, 0, 6.28); fc.fill(); return; }
    if (b.kind === 'star'){ b.x += b.vx; b.y += b.vy; const g = fc.createLinearGradient(b.x - b.vx*10, b.y - b.vy*10, b.x, b.y); g.addColorStop(0, 'rgba(255,250,220,0)'); g.addColorStop(1, `rgba(255,250,220,${a})`); fc.strokeStyle = g; fc.lineWidth = 2; fc.beginPath(); fc.moveTo(b.x - b.vx*10, b.y - b.vy*10); fc.lineTo(b.x, b.y); fc.stroke(); return; }
    if (b.kind === 'bird'){ b.t += dt; b.x += b.vx; b.y += b.vy; b.vy *= .99; const f = Math.sin(b.t*14)*5; fc.strokeStyle = `rgba(50,45,50,${a})`; fc.lineWidth = 2; fc.beginPath(); fc.moveTo(b.x - 7, b.y - f); fc.quadraticCurveTo(b.x - 3, b.y - 2, b.x, b.y); fc.quadraticCurveTo(b.x + 3, b.y - 2, b.x + 7, b.y - f); fc.stroke(); return; }
  }
  function grass(dt, t, rx, ry){ if (!tufts.length) return; const ph = artPh(); const col = { day:['#6E8A3A','#88A24A'], golden:['#5C4A1C','#7A6226'], dusk:['#3A3A26','#4A4630'], night:['#17323A','#21424A'] }[ph] || ['#6E8A3A','#88A24A'];
    const baseY = H - 2;
    for (const g of tufts){ const x = g.x*W; let force = Math.sin(t*1.3 + g.x*9)*.06 + gust*.5;
      if (ptr && Math.abs(ptr.x - x) < 40 && ptr.y > baseY - 80) force += ptrV.x*.04;
      if (Math.abs(rx - x) < 30 && (rex.state === 'walk')) force += Math.sign(x - rx)*.5;
      g.bv += (force - g.b)*.2 - g.bv*.15; g.b += g.bv*dt*10;
      for (let k = -1; k <= 1; k++){ const h = g.h*(k ? .75 : 1)*Math.max(.7, M.s*1.6), bx = x + k*5; fc.fillStyle = col[(k + 1)%2];
        fc.beginPath(); fc.moveTo(bx - 3, baseY); fc.quadraticCurveTo(bx + g.b*h*.5 + k*2, baseY - h*.55, bx + g.b*h + k*4, baseY - h); fc.quadraticCurveTo(bx + g.b*h*.3 + 1, baseY - h*.4, bx + 3, baseY); fc.fill(); } } }
  function edgeLight(K, rx, ry){ // move Rex's rim light toward the strongest nearby light
    if (!K.length) return; let best = null, bw = 0; for (const [x, y, c, s] of K){ const px = sx(x + dxArt()), py = sy(y), d = Math.hypot(px - rx, py - (ry - 60)); const w = s/(1 + d/(300*M.s*2)); if (w > bw){ bw = w; best = [px, py, c]; } }
    if (!best) return; const dir = (best[0] - rx)*rex.face; const xPct = dir < -20 ? '-8%' : dir > 20 ? '108%' : '50%', yPct = best[1] < ry - 200 ? '-10%' : '30%';
    rexEl.style.setProperty('--rimX', xPct); rexEl.style.setProperty('--rimY', yPct); rexEl.style.setProperty('--rim', `rgb(${best[2]})`);
    const base = +rexEl.style.getPropertyValue('--rimBase') || .3; rexEl.style.setProperty('--rimA', Math.min(.7, base*(.6 + bw*1.2)).toFixed(3)); }

  addEventListener('resize', () => setTimeout(resize, 50));
  new ResizeObserver(() => resize()).observe(zoom);
  return { step, seed, resize, tap };
})();
