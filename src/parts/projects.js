/* ================= projects (desktop and wide web) =================
   A project has phases; a phase has tasks. "Send" copies a project task to Today and keeps them linked:
   finishing either one finishes both. Projects live in S.projects, so they sync with the rest of your day.
   Shape: { id, name, client, due:'YYYY-MM-DD'|'', done:false, phases:[{ id, name, tasks:[{ id, t, done, due, high }] }] } */
const ICAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
let dkMode = 'today', projOpen = null, showDoneProj = false;
const pjOpenPh = {};
const pjid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
if (!Array.isArray(S.projects)) S.projects = Array.isArray(S.legacyProjects) ? S.legacyProjects : [];   // the old app's projects come across as they were
S.projects.forEach(p => { p.phases = Array.isArray(p.phases) ? p.phases : []; p.phases.forEach(ph => { ph.id = ph.id || pjid(); ph.tasks = Array.isArray(ph.tasks) ? ph.tasks : []; }); p.id = p.id || pjid(); });
const projOf = id => S.projects.find(p => p.id === id);
function projStats(p){ let n = 0, d = 0; p.phases.forEach(ph => ph.tasks.forEach(t => { n++; if (t.done) d++; })); return { n, d, pct: n ? Math.round(100*d/n) : 0 }; }
function projNext(p){ for (const ph of p.phases){ const t = ph.tasks.find(t => !t.done); if (t) return { ph, t }; } return null; }
const projDone = p => { const s = projStats(p); return s.n > 0 && s.d === s.n; };
function dueLabel(k, short){ if (!k) return ''; const d = new Date(k + 'T12:00'), days = Math.round((d - new Date(today() + 'T12:00'))/864e5);
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} over`; if (days === 0) return short ? 'Today' : 'Due today'; if (days === 1) return short ? 'Tomorrow' : 'Due tomorrow';
  const w = days < 7 ? d.toLocaleDateString([], { weekday: short ? 'short' : 'long' }) : d.toLocaleDateString([], { month:'short', day:'numeric' }); return short ? w : 'Due ' + w; }
const overdue = k => k && k < today();
const sentFor = pt => S.tasks.find(q => q.ptask === pt.id && !q.done);
function pjSend(p, t){ if (sentFor(t)) return; const q = addTask({ t:t.t, when:'today', high:t.high }); q.cat = 'work'; q.ptask = t.id; q.proj = p.id;
  save(); render(); SFX.add(); toast(`Added to Today from ${p.name}`); if (talk(.6)) rex.say(pick(['On today\'s list!','One step closer.']), 1400); }
function pjSet(p, t, done){ t.done = done; if (done) SFX.tick(); else SFX.untick(); const m = S.tasks.find(q => q.ptask === t.id); if (m && m.done !== done){ m.done = done; m.doneAt = done ? Date.now() : null; }
  save(); render(); if (done && projDone(p)){ rig()?.face('excited', 2000); rig()?.hearts(5); rex.hop = 1; rex.say(`That's all of "${p.name}". Nicely done!`, 2600); } }
// finishing the Today copy finishes the project task
bus.on('task_done', q => { if (!q.ptask) return; for (const p of S.projects) for (const ph of p.phases){ const t = ph.tasks.find(x => x.id === q.ptask); if (t && !t.done){ t.done = true; save(); } } });

// "Paste a plan": phases end with a colon; tasks start with "- "; "(due 2026-10-20)" sets a date; a trailing "!" marks it important
const PROJECT_FORMAT = `Format a project plan for Dino Day so I can paste it straight in.
Rules:
- Phases are headings that end with a colon, in the order they happen.
- One task per line under each phase, starting with "- ".
- Keep tasks small and concrete (one sitting each). Big tasks get split.
- Add a due date on a task as "(due 2026-10-20)" when there is one.
- Mark a task important with "!" at the end.
Example:
Discovery:
- Read the brief (due 2026-10-07)
- List open questions for the client
Design:
- Rough three layout directions
- Pick one with the client !`;
function parsePlan(txt){ const phases = []; let cur = null;
  for (let line of String(txt || '').split(/\r?\n/)){ line = line.trim(); if (!line) continue;
    const isTask = /^([-*•]|\d+[.)])\s+/.test(line);
    if (!isTask && /:$/.test(line)){ cur = { id:pjid(), name:line.replace(/:$/, '').replace(/^#+\s*/, '').trim(), tasks:[] }; phases.push(cur); continue; }
    let t = line.replace(/^([-*•]|\d+[.)])\s+/, ''), due = '', high = false;
    const m = t.match(/\(due (\d{4}-\d{2}-\d{2})\)/i); if (m){ due = m[1]; t = t.replace(m[0], '').trim(); }
    if (/!\s*$/.test(t)){ high = true; t = t.replace(/\s*!+\s*$/, ''); }
    if (!cur){ cur = { id:pjid(), name:'Tasks', tasks:[] }; phases.push(cur); }
    if (t) cur.tasks.push({ id:pjid(), t:t.slice(0, 90), done:false, due, high }); }
  return phases; }

function pjSheet(p){ const ed = !!p;
  const o = overlay(`<div class="card sheetcard pjsheet"><div class="sh"><h2>${ed ? 'Edit project' : 'New project'}</h2><button class="x" data-x aria-label="Close">×</button></div>
    <label class="pjf">Name<input id="pjName" maxlength="60" value="${esc(ed ? p.name : '')}" placeholder="Hillside Bakery rebrand"></label>
    <div class="pjrow"><label class="pjf">Client or area<input id="pjClient" maxlength="40" value="${esc(ed ? p.client || '' : '')}" placeholder="Personal"></label>
    <label class="pjf">Due<input id="pjDue" type="date" value="${ed ? p.due || '' : ''}"></label></div>
    <label class="pjf">${ed ? 'Add phases and tasks' : 'Phases and tasks'} <span class="hint">Optional. Paste a plan, one task per line.</span><textarea id="pjPlan" rows="7" placeholder="Discovery:&#10;- Read the brief&#10;Design:&#10;- Rough three directions"></textarea></label>
    <div class="row2"><button class="pill ghost" id="pjFmt">Copy format for an AI</button><button class="pill coral" id="pjGo">${ed ? 'Save' : 'Create project'}</button></div></div>`);
  o.querySelector('[data-x]').onclick = closeOverlay;
  o.querySelector('#pjFmt').onclick = () => { try { navigator.clipboard.writeText(PROJECT_FORMAT).then(() => toast('Copied. Paste it into any AI with your notes.'), () => showCopy(PROJECT_FORMAT)); } catch(e){ showCopy(PROJECT_FORMAT); } };
  o.querySelector('#pjGo').onclick = () => { const name = o.querySelector('#pjName').value.trim(); if (!name){ o.querySelector('#pjName').focus(); return; }
    const phases = parsePlan(o.querySelector('#pjPlan').value), client = o.querySelector('#pjClient').value.trim(), due = o.querySelector('#pjDue').value;
    if (ed){ Object.assign(p, { name, client, due }); p.phases.push(...phases); }
    else { p = { id:pjid(), name, client, due, phases: phases.length ? phases : [{ id:pjid(), name:'Tasks', tasks:[] }] }; S.projects.push(p); }
    projOpen = p.id; dkMode = 'projects'; save(); closeOverlay(); render(); SFX.add(); };
  setTimeout(() => o.querySelector(ed ? '#pjPlan' : '#pjName').focus(), 60); }

/* ---------- views ---------- */
const pjDue = (k, cls = '') => k ? `<span class="pjdue ${overdue(k) ? 'over' : ''} ${cls}">${ICAL}${dueLabel(k, true)}</span>` : '';
function pjBar(p){ const s = projStats(p); return `<div class="pjbar"><i style="width:${s.pct}%"></i></div><span class="pjcount">${s.d} of ${s.n} done</span>`; }
function projectsLeft(){ const p = projOf(projOpen); return p ? projectPage(p) : projectsOverview(); }
function projectsOverview(){ const act = S.projects.filter(p => !projDone(p)), done = S.projects.filter(projDone), over = act.filter(p => overdue(p.due)).length;
  const sorted = act.slice().sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
  return `<div class="pjhead"><div><h1>Projects</h1><div class="date">${act.length} active${over ? ` · ${over} overdue` : ''}</div></div>
      <span class="pjacts"><button class="link" data-pjpaste>Paste a plan</button><button class="pill coral" data-pjnew>${IC.plus}New project</button></span></div>
    <div class="dscroll pjscroll" id="dProj">${sorted.length ? `<div class="pjgrid">${sorted.map(p => { const n = projNext(p);
      return `<div class="pjcard" data-pjopen="${p.id}" tabindex="0" role="button" aria-label="Open ${esc(p.name)}"><div class="pjct"><b>${esc(p.name)}</b>${p.due ? `<span class="pjdue ${overdue(p.due) ? 'over' : ''}">${dueLabel(p.due)}</span>` : ''}</div>
        ${p.client ? `<div class="pjclient">${esc(p.client)}</div>` : ''}<div class="pjprog">${pjBar(p)}</div>
        ${n ? `<div class="pjnext"><div><div class="k">Next step</div><div class="pjnt">${esc(n.t.t)}</div></div>${sentFor(n.t) ? '<span class="pjon">On today</span>' : `<button class="pill ghost mint sm" data-pjsend="${p.id}:${n.t.id}">Send to Today</button>`}</div>`
          : `<div class="pjnext empty"><div class="pjnt">No tasks yet. Open it to add some.</div></div>`}</div>`; }).join('')}</div>`
      : `<div class="dkempty big">${pose('think', 90)}<div><b>No projects yet.</b><span>Start one, or paste a plan from your notes or an AI.</span></div></div>`}
      ${done.length ? `<button class="pjdonebtn" data-pjshowdone>${IC.check}Done projects · ${done.length}<span class="chev">${showDoneProj ? IC.chevup : IC.chev}</span></button>
        ${showDoneProj ? `<div class="pjdonelist">${done.map(p => `<button class="pjdrow" data-pjopen="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.client || '')}</span></button>`).join('')}</div>` : ''}` : ''}</div>`; }
function projectPage(p){ const n = projNext(p), s = projStats(p);
  return `<button class="link pjback" data-pjback>${IC.back || '←'}All projects</button>
    <div class="pjhead"><div><h1>${esc(p.name)}</h1><div class="date">${[esc(p.client || ''), p.due ? dueLabel(p.due) : ''].filter(Boolean).join(' · ')}</div></div>
      <span class="pjacts"><button class="pill ghost" data-pjedit="${p.id}">Edit</button><button class="pill ghost" data-pjpaste="${p.id}">Paste a plan</button><button class="pjmore" data-pjmenu="${p.id}" aria-label="More for ${esc(p.name)}">${IC.more}</button></span></div>
    <div class="pjprog wide">${pjBar(p)}</div>
    <div class="dscroll pjscroll" id="dProj">
    ${n ? `<div class="fcard pjstep"><div class="pjsrow"><div><div class="k">Next small step</div><div class="ft">${esc(n.t.t)}</div><div class="fmeta"><span>${IC.folder}${esc(n.ph.name)}</span>${n.t.due ? `<span>${dueLabel(n.t.due)}</span>` : ''}</div></div>
      <div class="pjsact">${sentFor(n.t) ? '<span class="pjon">On today</span>' : `<button class="pill coral" data-pjsend="${p.id}:${n.t.id}">${IC.play}Send to Today</button>`}<button class="link" data-pjcheck="${p.id}:${n.t.id}">Mark done</button></div></div></div>`
      : `<div class="fcard pjstep"><div class="dkempty">${pose(s.n ? 'happy' : 'read', 64)}<div><b>${s.n ? 'Nothing left in this project.' : 'No tasks yet.'}</b><span>${s.n ? 'Every step is done.' : 'Add tasks to a phase below, or paste a plan.'}</span></div></div></div>`}
    ${p.phases.map(ph => { const open = pjOpenPh[ph.id] ?? !!(n && n.ph === ph), d = ph.tasks.filter(t => t.done).length;
      return `<section class="pjphase ${open ? 'open' : ''}"><button class="pjph" data-pjphase="${ph.id}" aria-expanded="${open}"><span class="chev">${IC.chev}</span><b>${esc(ph.name)}</b><span class="pjn">${d}/${ph.tasks.length}</span></button>
        ${open ? `<div class="pjtasks">${ph.tasks.map(t => { const sent = sentFor(t);
          return `<div class="pjt ${t.done ? 'done' : ''}"><button class="pjchk" data-pjcheck="${p.id}:${t.id}" aria-label="${t.done ? 'Mark not done' : 'Mark done'}: ${esc(t.t)}">${t.done ? IC.check : ''}</button>
            <span class="pjtt">${t.high && !t.done ? '<span class="imp">!</span>' : ''}${esc(t.t)}</span>${t.done ? '' : pjDue(t.due)}
            ${t.done ? '' : sent ? '<span class="pjon">On today</span>' : `<button class="pill ghost mint sm" data-pjsend="${p.id}:${t.id}">Send</button>`}
            <button class="pjx" data-pjtdel="${p.id}:${ph.id}:${t.id}" aria-label="Delete ${esc(t.t)}">×</button></div>`; }).join('')}
          <form class="pjadd" data-pjadd="${p.id}:${ph.id}"><span>${IC.plus}</span><input placeholder="Add a task to ${esc(ph.name)}…" maxlength="90" aria-label="New task in ${esc(ph.name)}"></form></div>` : ''}</section>`; }).join('')}
    <form class="pjadd pjphadd" data-pjphadd="${p.id}"><span>${IC.plus}</span><input placeholder="New phase" maxlength="60" aria-label="New phase"></form></div>`; }
function projectsRight(){ const p = projOf(projOpen);
  if (p) return `<div class="dklater"><div class="dkhrow"><b class="pjrh">Projects</b><button class="link" data-pjnew>${IC.plus}New project</button></div>
    <div class="dscroll" id="dLater">${S.projects.filter(q => !projDone(q) || q.id === p.id).map(q => { const s = projStats(q);
      return `<button class="pjli ${q.id === p.id ? 'on' : ''}" data-pjopen="${q.id}"><span class="pjlt"><b>${esc(q.name)}</b><span>${esc(q.client || '')}</span></span><span class="pjlb"><span class="pjbar"><i style="width:${s.pct}%"></i></span><span class="pjcount">${s.d} of ${s.n}</span></span>${q.due ? `<span class="pjdue ${overdue(q.due) ? 'over' : ''}">${ICAL}${dueLabel(q.due)}</span>` : '<span></span>'}</button>`; }).join('')}</div></div>`;
  const wk = dayKey(new Date(Date.now() + 7*864e5)), due = [];
  for (const q of S.projects) for (const ph of q.phases) for (const t of ph.tasks) if (!t.done && t.due && t.due <= wk) due.push({ q, t });
  due.sort((a, b) => a.t.due < b.t.due ? -1 : 1);
  return `<div class="dklater"><div class="dkhrow"><b class="pjrh">Due this week</b></div><div class="dscroll" id="dLater">${due.length ? due.map(({ q, t }) =>
    `<div class="pjt"><button class="pjchk" data-pjcheck="${q.id}:${t.id}" aria-label="Mark done: ${esc(t.t)}"></button><span class="pjtt">${esc(t.t)}<span class="pjtag">${esc(q.name)}</span></span><span class="pjwhen ${overdue(t.due) ? 'over' : ''}">${dueLabel(t.due, true)}</span>${sentFor(t) ? '<span class="pjon">On today</span>' : `<button class="pill ghost mint sm" data-pjsend="${q.id}:${t.id}">Send</button>`}</div>`).join('')
    : `<div class="dkempty">${pose('read', 56)}<span>Nothing due in the next seven days.</span></div>`}</div></div>`; }

/* ---------- clicks and forms ---------- */
const pjFind = (pid, tid) => { const p = projOf(pid); if (!p) return {}; for (const ph of p.phases){ const t = ph.tasks.find(x => x.id === tid); if (t) return { p, ph, t }; } return { p }; };
document.addEventListener('click', e => { const g = s => e.target.closest(s); let el;
  if ((el = g('[data-pjmode]'))){ dkMode = el.dataset.pjmode; tab = 'today'; render(); return; }
  if (!g('#scroll') && !g('.ov')) return;
  if ((el = g('[data-pjsend]'))){ const [a, b] = el.dataset.pjsend.split(':'), { p, t } = pjFind(a, b); if (t) pjSend(p, t); return; }
  if ((el = g('[data-pjcheck]'))){ const [a, b] = el.dataset.pjcheck.split(':'), { p, t } = pjFind(a, b); if (t) pjSet(p, t, !t.done); return; }
  if ((el = g('[data-pjtdel]'))){ const [a, h, b] = el.dataset.pjtdel.split(':'), p = projOf(a), ph = p && p.phases.find(x => x.id === h); if (!ph) return; const i = ph.tasks.findIndex(x => x.id === b), t = ph.tasks[i];
    ph.tasks.splice(i, 1); save(); render(); snack(`Deleted "${t.t}"`, () => { ph.tasks.splice(i, 0, t); save(); render(); }); return; }
  if ((el = g('[data-pjphase]'))){ const id = el.dataset.pjphase; pjOpenPh[id] = el.getAttribute('aria-expanded') !== 'true'; render(); return; }
  if ((el = g('[data-pjopen]'))){ projOpen = el.dataset.pjopen; dkMode = 'projects'; render(); const sc = document.getElementById('dProj'); if (sc) sc.scrollTop = 0; return; }
  if (g('[data-pjback]')){ projOpen = null; render(); return; }
  if (g('[data-pjnew]')){ pjSheet(); return; }
  if ((el = g('[data-pjedit]'))){ pjSheet(projOf(el.dataset.pjedit)); return; }
  if ((el = g('[data-pjpaste]'))){ const p = projOf(el.dataset.pjpaste); pjSheet(p || undefined); setTimeout(() => { const ta = document.getElementById('pjPlan'); if (ta) ta.focus(); }, 80); return; }
  if (g('[data-pjshowdone]')){ showDoneProj = !showDoneProj; render(); return; }
  if ((el = g('[data-pjmenu]'))){ const p = projOf(el.dataset.pjmenu); if (!p) return;
    const o = overlay(`<div class="card sheetcard"><div class="sh"><h2>${esc(p.name)}</h2><button class="x" data-x aria-label="Close">×</button></div>
      <button class="pill ghost" id="pjDupe">Duplicate</button><button class="pill ghost" id="pjDel" style="color:#C2492F">Delete project</button></div>`);
    o.querySelector('[data-x]').onclick = closeOverlay;
    o.querySelector('#pjDupe').onclick = () => { const c = JSON.parse(JSON.stringify(p)); c.id = pjid(); c.name = p.name + ' (copy)'; c.phases.forEach(ph => { ph.id = pjid(); ph.tasks.forEach(t => { t.id = pjid(); t.done = false; }); }); S.projects.push(c); projOpen = c.id; save(); closeOverlay(); render(); };
    o.querySelector('#pjDel').onclick = () => { const i = S.projects.indexOf(p); S.projects.splice(i, 1); projOpen = null; save(); closeOverlay(); render(); snack(`Deleted "${p.name}"`, () => { S.projects.splice(i, 0, p); save(); render(); }); };
    return; }
});
document.addEventListener('keydown', e => { if (e.key !== 'Enter') return; const c = e.target.closest && e.target.closest('[data-pjopen].pjcard'); if (c){ e.preventDefault(); c.click(); } });
document.addEventListener('submit', e => { const f = e.target; if (!f.matches('[data-pjadd],[data-pjphadd]')) return; e.preventDefault(); e.stopPropagation(); const inp = f.querySelector('input'), v = inp.value.trim(); if (!v) return;
  if (f.dataset.pjadd){ const [a, h] = f.dataset.pjadd.split(':'), p = projOf(a), ph = p && p.phases.find(x => x.id === h); if (!ph) return;
    const q = parseQuick(v), due = /^\d{4}-/.test(q.when || '') ? q.when : q.when === 'tomorrow' ? tomorrow() : '';
    ph.tasks.push({ id:pjid(), t:(q.text || v).slice(0, 90), done:false, due, high:false }); pjOpenPh[ph.id] = true; }
  else { const p = projOf(f.dataset.pjphadd); if (!p) return; const ph = { id:pjid(), name:v, tasks:[] }; p.phases.push(ph); pjOpenPh[ph.id] = true; }
  save(); render(); SFX.add(); const again = document.querySelector(f.dataset.pjadd ? `[data-pjadd="${f.dataset.pjadd}"] input` : `[data-pjphadd="${f.dataset.pjphadd}"] input`); if (again) again.focus(); }, true);
