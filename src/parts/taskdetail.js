/* ================= task details, custom categories, drag to reorder, motion =================
   Clicking a task opens its details in place: category (with your own), when, time, size, importance, project, repeat.
   Every list change animates: rows slide to their new spots (FLIP), new rows pop in, views slide. */

/* ---------- your own categories ---------- */
const CAT_COLORS = [['#F6DCE6','#9A4467'],['#E7E0F3','#5D4C8A'],['#D7EEEA','#2F6F66'],['#FBEFC5','#86651B'],['#F9DDD3','#9A4A35'],['#E3E9D9','#4D5E3B']];
const CAT_DOT = '<svg viewBox="0 0 24 24" width="12" height="12"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>';
if (!Array.isArray(S.cats)) S.cats = [];
function syncCats(){ for (const k of Object.keys(CAT)) if (CAT[k].custom) delete CAT[k];
  S.cats.forEach(c => { const [bg, fg] = CAT_COLORS[c.color % CAT_COLORS.length]; CAT[c.id] = { label:c.label, bg, icon:CAT_DOT, k:'c', custom:true, style:`style="background:${bg};color:${fg}"` }; }); }
syncCats();
function addCat(label, color){ label = label.trim().slice(0, 18); if (!label) return null; const hit = Object.entries(CAT).find(([, c]) => c.label.toLowerCase() === label.toLowerCase()); if (hit) return hit[0];
  const id = 'c' + Date.now().toString(36); S.cats.push({ id, label, color }); syncCats(); return id; }
function removeCat(id){ S.cats = S.cats.filter(c => c.id !== id); S.tasks.forEach(t => { if (t.cat === id) t.cat = 'self'; }); if (cat === id) cat = 'self'; syncCats(); }

/* ---------- the detail panel ---------- */
let openId = null, newCatOpen = false, newCatColor = 0, detEnter = false, dragEnded = 0;
const SIZES = [[5,'5 min'],[15,'15 min'],[30,'30 min'],[60,'1 hr'],[120,'2 hr+']];
const TIMES = [['morning','Morning',9,0],['afternoon','Afternoon',14,30],['evening','Evening',19,0]];
const dayOf = t => /^\d{4}/.test(t.when) ? t.when : t.when === 'today' ? today() : null;
function timeAt(t, h, m){ const day = dayOf(t) || today(), d = new Date(day + 'T00:00'); d.setHours(h, m, 0, 0);
  const label = (day === today() ? '' : day === tomorrow() ? 'tomorrow, ' : '') + fmtMin(h*60 + m).toLowerCase().replace(' ', ' ');
  t.startAt = { at:d.getTime(), label, day, place: t.startAt && t.startAt.place || null }; t.nudged = false; }
function timeKey(t){ if (!t.startAt || !t.startAt.at) return ''; const d = new Date(t.startAt.at), m = d.getHours()*60 + d.getMinutes(); const hit = TIMES.find(x => x[2]*60 + x[3] === m); return hit ? hit[0] : 'custom'; }
function linkedProj(t){ if (!t.proj) return null; const p = projOf(t.proj); return p || null; }
function detailHTML(t){ const chip = (attr, on, label, extra = '') => `<button type="button" class="dchip ${on ? 'on' : ''}" ${attr} aria-pressed="${on}" ${extra}>${label}</button>`;
  const wk = t.when === 'today' ? 'today' : t.when === tomorrow() ? 'tomorrow' : t.when === 'someday' ? 'someday' : /^\d{4}/.test(t.when) ? 'date' : '';
  const tk = timeKey(t), tm = t.startAt && t.startAt.at ? new Date(t.startAt.at) : null, p = linkedProj(t);
  return `<div class="tdet ${detEnter ? 'enter' : ''}" data-det="${t.id}">
    <div class="drow"><span class="dl">Category</span><div class="dchips">${Object.entries(CAT).map(([k, c]) => chip(`data-dcat="${k}"`, t.cat === k, `${c.icon}${esc(c.label)}${c.custom ? `<i class="dx" data-dcatdel="${k}" role="button" aria-label="Remove ${esc(c.label)}">×</i>` : ''}`, `style="--cb:${c.bg}"`)).join('')}
      ${newCatOpen ? `<span class="dnew"><input id="dCatIn" maxlength="18" placeholder="Name" aria-label="New category name"><span class="dsw">${CAT_COLORS.map(([bg, fg], i) => `<button type="button" class="${i === newCatColor ? 'on' : ''}" data-dcolor="${i}" style="background:${bg};color:${fg}" aria-label="Color ${i + 1}"></button>`).join('')}</span><button type="button" class="dchip go" data-dcatadd>Add</button></span>`
        : chip('data-dcatnew', false, `${IC.plus}New`)}</div></div>
    <div class="drow"><span class="dl">When</span><div class="dchips">${chip('data-dwhen="today"', wk === 'today', 'Today')}${chip('data-dwhen="tomorrow"', wk === 'tomorrow', 'Tomorrow')}<label class="dchip ${wk === 'date' ? 'on' : ''}">${wk === 'date' ? labelDay(t.when) : 'Pick a date'}<input type="date" data-ddate min="${today()}" value="${wk === 'date' ? t.when : ''}"></label>${chip('data-dwhen="someday"', wk === 'someday', 'Someday')}</div></div>
    ${t.when === 'someday' ? '' : `<div class="drow"><span class="dl">Time</span><div class="dchips">${chip('data-dtime="none"', !tk, 'Any time')}${TIMES.map(([k, l]) => chip(`data-dtime="${k}"`, tk === k, l)).join('')}<label class="dchip ${tk === 'custom' ? 'on' : ''}">${tk === 'custom' ? fmtMin(tm.getHours()*60 + tm.getMinutes()) : 'Set a time'}<input type="time" data-dclock value="${tm ? pad(tm.getHours()) + ':' + pad(tm.getMinutes()) : ''}"></label></div></div>`}
    <div class="drow"><span class="dl">Size</span><div class="dchips">${SIZES.map(([m, l]) => chip(`data-dsize="${m}"`, t.est === m, l)).join('')}${chip('data-dhigh', !!t.high, '<b class="imp">!</b>Important', 'class="dchip hi"')}</div></div>
    <div class="drow two"><span class="dl">Project</span><div class="dchips"><span class="dsel"><select data-dproj aria-label="Project"><option value="">None</option>${S.projects.filter(q => !projDone(q) || q.id === t.proj).map(q => `<option value="${q.id}" ${p && p.id === q.id ? 'selected' : ''}>${esc(q.name)}</option>`).join('')}</select>${IC.chev}</span>
      <span class="dl in">Repeat</span><span class="dsel"><select data-drep aria-label="Repeat"><option value="">Never</option>${Object.entries(REPEAT_LABEL).map(([k, l]) => `<option value="${k}" ${t.repeat === k ? 'selected' : ''}>${l}</option>`).join('')}</select>${IC.chev}</span></div></div>
    ${linksRowHTML(t)}
    <div class="dacts"><button type="button" class="pill coral sm" data-dfocus>${IC.play}Work on this</button><button type="button" class="pill ghost sm" data-dsteps>${t.steps.length ? 'Redo the steps' : 'Make it smaller'}</button><span></span><button type="button" class="link danger" data-ddel>Delete</button><button type="button" class="link" data-dclose>Done</button></div>
  </div>`; }

function openDetail(id){ if (openId === id){ closeDetail(); return; } const prev = openId; openId = id; newCatOpen = false; detEnter = true; SFX.pop && SFX.pop();
  render(); detEnter = false; const el = document.querySelector(`.tdet[data-det="${id}"]`); if (!el) return;
  growIn(el); setTimeout(() => { if (openId !== id) return; const row = el.closest('.trow'), r = el.getBoundingClientRect(), top = row.getBoundingClientRect().top, sc = el.closest('.dscroll') || $('#scroll'), sr = sc.getBoundingClientRect(), pad = isDesk() ? 16 : 96;
    // bring the whole panel into view, but never scroll the task's own title off the top
    const need = r.bottom - (sr.bottom - pad); if (need > 0) sc.scrollBy({ top: Math.min(need, top - sr.top - 12), behavior:'smooth' }); }, 300); }
function closeDetail(){ const el = document.querySelector('.tdet'); if (!el){ openId = null; render(); return; }
  const h = el.offsetHeight; el.animate([{ height:h + 'px', opacity:1 }, { height:'0px', opacity:0, paddingTop:'0px', paddingBottom:'0px' }], { duration:170, easing:'cubic-bezier(.4,0,.2,1)' }).onfinish = () => { openId = null; render(); }; el.style.overflow = 'hidden'; }
function growIn(el){ const h = el.scrollHeight; el.style.overflow = 'hidden';
  el.animate([{ height:'0px', opacity:0, transform:'translateY(-6px)' }, { height:(h + 6) + 'px', opacity:1, transform:'translateY(0)', offset:.7 }, { height:h + 'px', opacity:1, transform:'none' }], { duration:300, easing:'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => { el.style.overflow = ''; }; }

// link a Today task to a project: it joins the project's first phase, and finishing either finishes both
function linkProj(t, pid){ const old = linkedProj(t);
  if (old && t.ptask){ old.phases.forEach(ph => { ph.tasks = ph.tasks.filter(x => !(x.id === t.ptask && !x.done)); }); }
  t.proj = null; t.ptask = null; if (!pid) return; const p = projOf(pid); if (!p) return;
  if (!p.phases.length) p.phases.push({ id:pjid(), name:'Tasks', tasks:[] });
  const pt = { id:pjid(), t:t.t, done:!!t.done, due:'', high:!!t.high }; p.phases[0].tasks.push(pt); t.proj = p.id; t.ptask = pt.id; }

$('#scroll').addEventListener('click', e => { const q = s => e.target.closest(s); let el;
  if (!q('.tdet')) return; e.stopImmediatePropagation(); const t = byId(+q('.tdet').dataset.det); if (!t) return;
  const done = (msg) => { touch(); save(); render(); if (msg) toast(msg); };
  if ((el = q('[data-dcatdel]'))){ const c = CAT[el.dataset.dcatdel]; removeCat(el.dataset.dcatdel); done(`Removed ${c ? c.label : 'category'}`); return; }
  if ((el = q('[data-dcat]'))){ t.cat = el.dataset.dcat; S.lastCat = t.cat; SFX.tick(); done(); return; }
  if (q('[data-dcatnew]')){ newCatOpen = true; render(); setTimeout(() => $('#dCatIn')?.focus(), 30); return; }
  if ((el = q('[data-dcolor]'))){ const v = $('#dCatIn')?.value || ''; newCatColor = +el.dataset.dcolor; render(); const i = $('#dCatIn'); if (i){ i.value = v; i.focus(); } return; }
  if (q('[data-dcatadd]')){ const id = addCat($('#dCatIn')?.value || '', newCatColor); newCatOpen = false; if (id){ t.cat = id; newCatColor = (newCatColor + 1) % CAT_COLORS.length; done(); } else render(); return; }
  if ((el = q('[data-dwhen]'))){ const w = el.dataset.dwhen, label = { today:'Today', tomorrow:'tomorrow', someday:'Someday' }[w];
    t.when = w === 'tomorrow' ? tomorrow() : w; if (w === 'someday'){ t.startAt = null; t.carry = 0; } else if (t.startAt) { const d = new Date(t.startAt.at); timeAt(t, d.getHours(), d.getMinutes()); }
    if (w !== 'today'){ if (focusId === t.id) focusId = null; openId = null; } done(w === 'today' ? null : `Moved "${t.t}" to ${label}`); return; }
  if ((el = q('[data-dtime]'))){ const k = el.dataset.dtime; if (k === 'none') t.startAt = null; else { const [, , h, m] = TIMES.find(x => x[0] === k); timeAt(t, h, m); } SFX.tick(); done(); return; }
  if ((el = q('[data-dsize]'))){ const m = +el.dataset.dsize; t.est = t.est === m ? null : m; SFX.tick(); done(); return; }
  if (q('[data-dhigh]')){ t.high = !t.high; if (t.high) { rex.hop = 1; } SFX.tick(); done(); return; }
  if (q('[data-dfocus]')){ openId = null; focusTask(t, 'You picked'); return; }
  if (q('[data-dsteps]')){ openId = null; focusTask(t, 'You picked'); panel = 'smaller'; render(); return; }
  if (q('[data-ddel]')){ openId = null; removeTask(t); return; }
  if (q('[data-dclose]')){ closeDetail(); return; }
}, true);
$('#scroll').addEventListener('change', e => { const det = e.target.closest('.tdet'); if (!det) return; const t = byId(+det.dataset.det); if (!t) return; const el = e.target;
  if (el.matches('[data-ddate]') && el.value){ t.when = el.value === today() ? 'today' : el.value; if (t.startAt){ const d = new Date(t.startAt.at); timeAt(t, d.getHours(), d.getMinutes()); } if (t.when !== 'today'){ if (focusId === t.id) focusId = null; openId = null; } touch(); save(); render(); if (t.when !== 'today') toast(`Moved "${t.t}" to ${labelDay(t.when)}`); }
  if (el.matches('[data-dclock]') && el.value){ const [h, m] = el.value.split(':').map(Number); timeAt(t, h, m); touch(); save(); render(); toast(`Rex will remind you at ${fmtMin(h*60 + m)}`); }
  if (el.matches('[data-dproj]')){ linkProj(t, el.value); touch(); save(); render(); if (el.value) toast(`Linked to ${projOf(el.value).name}`); }
  if (el.matches('[data-drep]')){ t.repeat = el.value; if (t.repeat === 'weekly') t.dow = new Date().getDay(); touch(); save(); render(); }
});
$('#scroll').addEventListener('keydown', e => { if (e.target.id === 'dCatIn' && e.key === 'Enter'){ e.preventDefault(); document.querySelector('[data-dcatadd]')?.click(); } if (e.target.id === 'dCatIn' && e.key === 'Escape'){ newCatOpen = false; render(); } });

/* ---------- motion: rows glide to their new places, new rows pop in, views slide ---------- */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let lastView = '';
function viewKey(){ return [tab, typeof dkMode !== 'undefined' ? dkMode : '', typeof projOpen !== 'undefined' ? projOpen : '', typeof dkTab !== 'undefined' ? dkTab : ''].join('|'); }
const VIEW_ORDER = ['today||', 'projects', 'someday', 'settings', 'stats'];
function snapRows(){ const m = new Map(); document.querySelectorAll('#scroll [data-flip]').forEach(el => m.set(el.dataset.flip, el.getBoundingClientRect())); return m; }
// the button you pressed springs back after the list redraws
let pressKey = null, pressAt = 0;
document.addEventListener('pointerdown', e => { const b = e.target.closest('button,.dchip'); if (!b) { pressKey = null; return; } const a = [...b.attributes].find(x => x.name.startsWith('data-') && x.name !== 'data-flip');
  pressKey = a ? `[${a.name}="${CSS.escape(a.value)}"]` : null; pressAt = Date.now(); }, true);
function springPressed(){ if (!pressKey || Date.now() - pressAt > 1500) return; const el = document.querySelector('#scroll ' + pressKey + ',#scroll .dchip:has(' + pressKey + ')'); pressKey = null;
  el?.animate([{ transform:'scale(.9)' }, { transform:'scale(1.08)', offset:.55 }, { transform:'none' }], { duration:300, easing:'cubic-bezier(.2,.8,.2,1)' }); }
const _render = render;
render = function(){ if (reduceMotion.matches){ _render(); return; }
  const first = snapRows(), vk = viewKey(), prevView = lastView; _render(); lastView = vk; springPressed();
  if (prevView && prevView !== vk){ const [a, b] = [prevView, vk].map(k => k.split('|')), sameTab = a[0] === b[0];
    const dir = sameTab ? (a[1] !== b[1] ? (b[1] === 'projects' ? 1 : -1) : a[2] !== b[2] ? (b[2] ? 1 : -1) : (b[3] === 'habits' ? 1 : -1)) : (b[0] === 'today' ? -1 : 1);
    const target = sameTab && a[1] === b[1] && a[2] === b[2] ? document.querySelector('#scroll .dklater .dscroll') : sameTab ? document.querySelector('#scroll .dkleft') : $('#scroll');
    target?.animate([{ transform:`translateX(${dir*28}px)`, opacity:0 }, { transform:'none', opacity:1 }], { duration:260, easing:'cubic-bezier(.2,1.2,.4,1)' });
    if (sameTab && a[1] !== b[1]) document.querySelector('#scroll .dklater')?.animate([{ transform:`translateY(10px)`, opacity:0 }, { transform:'none', opacity:1 }], { duration:300, delay:40, easing:'cubic-bezier(.2,1.2,.4,1)', fill:'backwards' });
    return; }
  let n = 0; document.querySelectorAll('#scroll [data-flip]').forEach(el => { const f = first.get(el.dataset.flip), l = el.getBoundingClientRect();
    if (!f){ if (first.size) el.animate([{ transform:'scale(.92) translateY(-6px)', opacity:0 }, { transform:'scale(1.02)', opacity:1, offset:.6 }, { transform:'none', opacity:1 }], { duration:300, delay:Math.min(n++, 4)*25, easing:'cubic-bezier(.2,.8,.2,1)', fill:'backwards' }); return; }
    const dy = f.top - l.top; if (Math.abs(dy) < 1) return; el.animate([{ transform:`translateY(${dy}px)` }, { transform:'none' }], { duration:320, easing:'cubic-bezier(.3,1.3,.5,1)' }); }); };

/* ---------- one gesture system for task rows ----------
   Mouse: grab the grip to reorder. Touch: swipe sideways for the swipe actions, or press and hold to reorder.
   The row follows your finger 1:1 (no transition while held), the page never pans sideways,
   and an interrupted gesture (a call, a system swipe) puts everything back. */
const SPRING = 'cubic-bezier(.3,1.3,.5,1)';
let gest = null;
function listRows(){ return [...$('#list').querySelectorAll(':scope > .trow')]; }
function startDrag(g){ const rows = listRows(), i0 = rows.indexOf(g.wrap); if (i0 < 0) return false; if (openId){ openId = null; _render(); return false; }
  const sc = $('#list').closest('.dscroll') || $('#scroll'), r0 = g.wrap.getBoundingClientRect(), gap = rows[1] ? rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().bottom : 0;
  Object.assign(g, { mode:'drag', rows, i0, n:i0, h:r0.height + gap, sc, st0:sc.scrollTop, mids:rows.map(r => { const b = r.getBoundingClientRect(); return b.top + b.height/2; }) });
  g.wrap.classList.add('dragging'); rows.forEach(r => { if (r !== g.wrap) r.style.transition = `transform .22s ${SPRING}`; });
  try { g.cap.setPointerCapture(g.pid); } catch(_){} buzz(10); SFX.pop && SFX.pop(); dragFollow(g, g.lastY); return true; }
function dragFollow(g, y){ const ds = g.sc.scrollTop - g.st0, dy = y - g.y + ds;
  g.wrap.style.transform = `translateY(${dy}px) scale(1.03)`;
  const mid = g.mids[g.i0] + dy, n = g.mids.filter((m, j) => j !== g.i0 && m < mid).length; if (n !== g.n){ g.n = n; buzz(4); }
  g.rows.forEach((r, j) => { if (r === g.wrap) return; const s = g.i0 < j && j <= n ? -g.h : n <= j && j < g.i0 ? g.h : 0; const v = s ? `translateY(${s}px)` : ''; if (r.style.transform !== v) r.style.transform = v; });
  // near the top or bottom edge, the list scrolls along
  const sr = g.sc.getBoundingClientRect(), edge = 56, v = y < sr.top + edge ? -(sr.top + edge - y) : y > sr.bottom - edge - (isDesk() ? 0 : 80) ? (y - (sr.bottom - edge - (isDesk() ? 0 : 80))) : 0;
  cancelAnimationFrame(g.as); if (v) g.as = requestAnimationFrame(() => { if (gest !== g) return; g.sc.scrollTop += v*.25; dragFollow(g, g.lastY); }); }
function endGesture(cancel){ const g = gest; gest = null; if (!g) return; clearTimeout(g.lp); cancelAnimationFrame(g.as); g.wrap.classList.remove('swiping','swing','swr','swl','pressing');
  if (g.mode === 'swipe'){ const act = !cancel && (g.dx > 72 ? S.swipeR : g.dx < -72 ? S.swipeL : null);
    g.row.style.transition = `transform ${act ? '.16s ease-in' : '.3s ' + SPRING}`; g.row.style.transform = act ? `translateX(${g.dx > 0 ? 105 : -105}%)` : '';
    setTimeout(() => { g.row.style.transition = ''; if (act) swipeDo(act, byId(g.id)); }, act ? 150 : 300); }
  if (g.mode === 'drag'){ dragEnded = Date.now(); const { wrap, rows, i0, n, h } = g, ds = g.sc.scrollTop - g.st0;
    wrap.style.transition = `transform .22s ${SPRING}`; wrap.style.transform = cancel ? '' : `translateY(${(n - i0)*h}px)`;
    setTimeout(() => { rows.forEach(r => { r.style.transition = ''; r.style.transform = ''; }); wrap.classList.remove('dragging');
      if (!cancel && n !== i0){ const list = openToday(), [m] = list.splice(i0, 1); list.splice(n, 0, m); list.forEach((t, k) => t.order = k + 1); S.planDay = today(); touch(); save(); }
      _render(); SFX.pop && SFX.pop(); }, 220); } }
$('#scroll').addEventListener('pointerdown', e => { if (gest) endGesture(true);
  const row = e.target.closest('.task'); if (!row || !row.closest('#list') || e.target.closest('button,a,input,select,.tdet')) return;
  const grip = e.target.closest('.grip'), touchy = e.pointerType !== 'mouse';
  if (!grip && !touchy) return;   // a mouse click opens the details; reordering with a mouse uses the grip
  const wrap = row.closest('.trow'); gest = { row, wrap, cap:grip || row, id:+row.dataset.row, pid:e.pointerId, x:e.clientX, y:e.clientY, lastY:e.clientY, dx:0, mode:null, touchy };
  if (grip){ e.preventDefault(); startDrag(gest); return; }
  wrap.classList.add('pressing'); gest.lp = setTimeout(() => { if (gest && !gest.mode){ wrap.classList.remove('pressing'); startDrag(gest); } }, 280); }, true);
addEventListener('pointermove', e => { const g = gest; if (!g || e.pointerId !== g.pid) return; const dx = e.clientX - g.x, dy = e.clientY - g.y; g.lastY = e.clientY;
  if (!g.mode){ if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)*1.2 && g.touchy){ g.mode = 'swipe'; clearTimeout(g.lp); g.wrap.classList.remove('pressing'); g.wrap.classList.add('swiping'); try { g.row.setPointerCapture(g.pid); } catch(_){} }
    else if (Math.abs(dy) > 8 || Math.abs(dx) > 8){ clearTimeout(g.lp); g.wrap.classList.remove('pressing'); gest = null; return; } }
  if (g.mode === 'swipe'){ const side = dx > 0 ? S.swipeR : S.swipeL; let x = side === 'none' ? 0 : dx; if (Math.abs(x) > 110) x = Math.sign(x)*(110 + (Math.abs(x) - 110)*.35);   // rubber band past the action point
    g.dx = x; g.row.style.transform = `translateX(${x}px)`; g.wrap.dataset.sw = side; g.wrap.dataset.dir = x > 0 ? 'r' : 'l';
    const past = Math.abs(x) > 72; if (past !== g.past){ g.past = past; if (past) buzz(6); } g.wrap.classList.toggle('swr', x > 72); g.wrap.classList.toggle('swl', x < -72); g.wrap.classList.toggle('swing', x !== 0); }
  if (g.mode === 'drag') dragFollow(g, e.clientY); }, { passive:true });
addEventListener('pointerup', e => { if (gest && e.pointerId === gest.pid) endGesture(false); });
addEventListener('pointercancel', e => { if (gest && e.pointerId === gest.pid) endGesture(true); });
// while a row is held or swiped, the page doesn't scroll or pan under your finger
$('#scroll').addEventListener('touchmove', e => { if (gest && gest.mode) e.preventDefault(); }, { passive:false });
addEventListener('blur', () => endGesture(true));
