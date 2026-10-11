/* ================= the day: tasks, focus, habits ================= */
const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today = () => dayKey(new Date());
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate()+1); return dayKey(d); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const REPEAT_LABEL = { daily:'Every day', weekdays:'Weekdays', weekly:'Every week' };
const EFF = { e:'Easy', m:'Medium', h:'Hard' };
const KEEP_NAMES = ['an acorn','a jar of jam','a paper star','a little carved bird','a pinecone','a tiny sprout pot','a painted stone','a pressed leaf','a drawing','a little scarf','a paper boat','a candle','a seashell','a birdhouse','a sprout mug','some dried flowers'];
let tab = 'today', cat = 'work', focusId = null, focusWhy = '', panel = null, session = null, picking = false, nudges = [], kbIndex = -1;
let lastTaskAct = Date.now(), lastStall = 0, snow = 0;
const touch = () => { lastTaskAct = Date.now(); };
const tasks = () => S.tasks;
const todays = () => S.tasks.filter(t => t.when === 'today');
function ensureOrder(){ let m = Math.max(0, ...S.tasks.map(t => t.order || 0)); S.tasks.forEach(t => { if (!t.order) t.order = ++m; }); }
const openToday = () => { ensureOrder(); return todays().filter(t => !t.done).sort((a, b) => a.order - b.order); };
const byId = id => S.tasks.find(t => t.id === id);
const newId = () => Math.max(0, ...S.tasks.map(t => t.id)) + 1;
function addTask(o){ const t = { id:newId(), t:o.t, when:o.when||'today', repeat:o.repeat||'', dow:o.dow, high:!!o.high, steps:(o.steps||[]).map(s => typeof s==='string' ? { t:s, done:false } : s), done:!!o.done, carry:0, startAt:o.startAt||null, cat:o.cat||cat, order:0 };
  ensureOrder(); t.order = Math.min(0, ...S.tasks.map(x => x.order||0)) - 1; S.tasks.push(t); return t; }

/* ---------- sounds + haptics ---------- */
const SND = { ctx:null };
function beep(spec){ if (!S.sound) return; try { SND.ctx = SND.ctx || new (window.AudioContext || window.webkitAudioContext)(); const c = SND.ctx, t0 = c.currentTime;
  spec.forEach(([f, dt, st, type, vol]) => { const o = c.createOscillator(), g = c.createGain(); o.type = type||'sine'; o.frequency.setValueAtTime(f, t0+st); g.gain.setValueAtTime(0, t0+st); g.gain.linearRampToValueAtTime(vol||.08, t0+st+.012); g.gain.exponentialRampToValueAtTime(.0005, t0+st+dt); o.connect(g); g.connect(c.destination); o.start(t0+st); o.stop(t0+st+dt+.02); }); } catch(_){} }
function buzz(p){ try { navigator.vibrate && navigator.vibrate(p); } catch(_){} }
const SFX = {
  tick(){ beep([[880,.09,0,'triangle',.06],[1320,.14,.06,'sine',.05]]); buzz(10); },
  untick(){ beep([[660,.1,0,'triangle',.04]]); },
  add(){ beep([[520,.08,0,'sine',.05],[780,.1,.05,'sine',.04]]); buzz(6); },
  del(){ beep([[300,.14,0,'triangle',.05]]); buzz(8); },
  done(){ beep([[523,.12,0,'sine',.07],[659,.12,.1,'sine',.07],[784,.12,.2,'sine',.07],[1047,.3,.3,'sine',.08]]); buzz([20,40,30]); },
  session(){ beep([[440,.35,0,'sine',.06],[554,.35,.25,'sine',.06],[659,.6,.5,'sine',.07]]); buzz([30,60,30,60,60]); },
  pop(){ beep([[900,.06,0,'sine',.035]]); },
};
document.addEventListener('pointerdown', () => { if (SND.ctx && SND.ctx.state === 'suspended') SND.ctx.resume(); }, { passive:true });

/* ---------- a new day ---------- */
function isDue(t, d = new Date()){ const w = d.getDay(); return t.repeat==='daily' || (t.repeat==='weekdays' && w>0 && w<6) || (t.repeat==='weekly' && w===t.dow); }
function rollover(){
  const td = today(); if (S.lastDay === td) return false;
  const first = !S.lastDay;
  S.tasks = S.tasks.filter(t => !(t.done && !t.repeat));
  for (const t of S.tasks){
    if (t.repeat){ t.done = false; t.when = isDue(t) ? 'today' : 'rest'; t.nudged = false; t.steps.forEach(s => s.done = false); continue; }
    if (/^\d{4}-\d\d-\d\d$/.test(t.when) && t.when <= td) t.when = 'today';
    else if (t.when === 'today' && !first) t.carry = (t.carry||0) + 1;
    if (t.startAt && t.startAt.day && t.startAt.day < td) t.startAt = null;
  }
  S.greet = !first && (Date.now() - (S.lastOpen||Date.now())) > 36*36e5;
  if (!first && S.asleep === false && new Date().getHours() < 5) {}
  S.lastDay = td; S.days = Array.from(new Set([...(S.days||[]), td])); save(); return true;
}

/* ---------- quick add that understands dates and times ---------- */
const DOWS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
function nextDow(d, strict){ const n = new Date(); let diff = (d - n.getDay() + 7) % 7; if (diff===0 && strict) diff = 7; n.setDate(n.getDate()+diff); return n; }
function fmtMin(m){ const h = Math.floor(m/60), mm = m%60; return (h%12||12) + (mm ? ':'+pad(mm) : '') + (h<12 ? ' AM' : ' PM'); }
function startAtFor(when, at){ if (at == null) return null; const d = when==='today' ? new Date() : new Date(when+'T12:00'); d.setHours(Math.floor(at/60), at%60, 0, 0); return { at:d.getTime(), label:fmtMin(at).toLowerCase(), day: when==='today' ? today() : when, place:null }; }
function labelDay(k){ if (k===tomorrow()) return 'Tomorrow'; const d = new Date(k+'T12:00'), diff = Math.round((d - new Date(today()+'T12:00'))/864e5); return diff<7 ? d.toLocaleDateString([], { weekday:'long' }) : d.toLocaleDateString([], { month:'short', day:'numeric' }); }
function parseQuick(raw){
  let v = ' ' + raw.trim() + ' ', when = null, at = null, repeat = '', dow, high = false; const bits = [];
  const eat = (re, fn) => { const m = v.match(re); if (m){ fn(m); v = v.replace(re, ' '); return true; } return false; };
  const plus = n => { const d = new Date(); d.setDate(d.getDate()+n); return d; };
  if (eat(/(^|\s)!+(\s|$)/, () => {}) || /\burgent\b/i.test(v)){ high = true; v = v.replace(/\burgent\b/i, ' '); }
  eat(/\b(every ?day|daily)\b/i, () => { repeat = 'daily'; bits.push('every day'); });
  eat(/\b(every )?weekdays?\b/i, () => { repeat = 'weekdays'; bits.push('weekdays'); });
  eat(/\bevery (week|(sun|mon|tues?|wed(nes)?|thu(rs)?|fri|sat(ur)?)(day)?)\b/i, m => { repeat = 'weekly'; const d = m[2] ? DOWS.findIndex(x => x.startsWith(m[2].slice(0,3).toLowerCase())) : new Date().getDay(); dow = d; bits.push('every '+DOWS[d].slice(0,3)); when = when || dayKey(nextDow(d, false)); });
  eat(/\b(tomorrow|tmrw|tmr)\b/i, () => { when = dayKey(plus(1)); bits.push('tomorrow'); });
  eat(/\b(today|tonight)\b/i, m => { when = 'today'; if (/tonight/i.test(m[0]) && at == null) at = 19*60; bits.push(m[0].toLowerCase()); });
  eat(/\bday after tomorrow\b/i, () => { when = dayKey(plus(2)); bits.push('in 2 days'); });
  eat(/\bin (\d+|a|an|one|two|three|four|five|six|seven) (day|days|week|weeks)\b/i, m => { const n = { a:1, an:1, one:1, two:2, three:3, four:4, five:5, six:6, seven:7 }[m[1].toLowerCase()] || +m[1]; when = dayKey(plus(/week/i.test(m[2]) ? n*7 : n)); bits.push('in '+n+' '+m[2].toLowerCase()); });
  eat(/\bnext week\b/i, () => { when = dayKey(nextDow(1, true)); bits.push('next week'); });
  eat(/\b(next |this |on )?(sun|mon|tues?|wed(nes)?|thu(rs)?|fri|sat(ur)?)(day)?\b/i, m => { const d = DOWS.findIndex(x => x.startsWith(m[2].slice(0,3).toLowerCase())); when = when || dayKey(nextDow(d, /next/i.test(m[1]||''))); bits.push(DOWS[d].slice(0,3)); });
  eat(/\b(on )?(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]* (\d{1,2})(st|nd|rd|th)?\b/i, m => { const mo = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].slice(0,3).toLowerCase()); const d = new Date(); d.setMonth(mo, +m[3]); if (d < new Date(Date.now()-864e5)) d.setFullYear(d.getFullYear()+1); when = dayKey(d); bits.push(m[2].slice(0,3)+' '+m[3]); });
  eat(/\b(\d{1,2})\/(\d{1,2})\b/, m => { const d = new Date(); d.setMonth(+m[1]-1, +m[2]); if (d < new Date(Date.now()-864e5)) d.setFullYear(d.getFullYear()+1); when = dayKey(d); bits.push(m[1]+'/'+m[2]); });
  eat(/\b(at |@ ?)?(\d{1,2})(?::(\d{2}))? ?(am|pm|a\.m\.|p\.m\.)\b/i, m => { let h = +m[2] % 12; if (/p/i.test(m[4])) h += 12; at = h*60 + (+m[3]||0); bits.push(fmtMin(at)); });
  eat(/\b(at |@ ?)(\d{1,2})(?::(\d{2}))?\b/, m => { let h = +m[2]; if (h < 7) h += 12; at = h*60 + (+m[3]||0); bits.push(fmtMin(at)); });
  eat(/\b(at |@ ?)?noon\b/i, () => { at = 12*60; bits.push('noon'); });
  eat(/\b(in the |this )?(morning|afternoon|evening)\b/i, m => { at = { morning:9*60, afternoon:14*60, evening:19*60 }[m[2].toLowerCase()]; bits.push(m[2].toLowerCase()); });
  eat(/\b(someday|later)\b/i, () => { when = 'someday'; bits.push('someday'); });
  v = v.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim().replace(/[,\s]+$/, '');
  if (at != null && !when) when = (at > new Date().getHours()*60 + new Date().getMinutes()) ? 'today' : dayKey(plus(1));
  if (when === today()) when = 'today';
  return { text:v, when, at, repeat, dow, high, bits };
}
const BIG = /\b(taxes?|clean|organi[sz]e|plan|project|finish|write|prepare|sort|apply|fix|research|report|garage|closet|budget|move|declutter|study|essay|paperwork|resume|portfolio|website)\b/i;
const isBig = t => BIG.test(t.t) || t.t.length > 48;

/* ---------- import (brain dump) ---------- */
const IMPORT_FORMAT = `Format a to-do list for Dino Day so I can paste it straight in.

Rules:
- One task per line. Start each task with "- ".
- Group tasks under these headings, each on its own line: "Today:", "Tomorrow:", "Someday:", "Every day:", "Weekdays:", "Every week:". Tasks with no heading go to Today.
- Indent a line with 4 spaces under a task to make it a step of that task. Steps start with "- " too. Use 3 to 6 small, concrete steps for big or vague tasks, and make the first step take under 2 minutes.
- Put " !" at the end of a task that is important or urgent.
- Keep each task short (under 80 characters), starting with a verb.
- Output only the list. No numbering, no extra commentary.

Example:
Today:
- Reply to Dana about Friday !
- Do my taxes
    - Find last year's return
    - Open the tax site and log in
    - Fill in the easy parts
Tomorrow:
- Call the dentist
Someday:
- Clean out the garage
Every day:
- Take meds

You can also send JSON instead: [{"title": "Do my taxes", "when": "today|tomorrow|someday", "repeat": "daily|weekdays|weekly", "important": true, "steps": ["Find last year's return"]}]

Here's what I need turned into a list:
`;
function parseImport(text){
  text = text.trim(); if (!text) return [];
  const t0 = text.replace(/^```\w*\n?|```$/g, '').trim();
  if (t0[0] === '[' || t0[0] === '{'){
    try { let j = JSON.parse(t0); if (!Array.isArray(j)) j = j.tasks || [j];
      return j.filter(x => x && (x.title || x.task || x.name)).map(x => ({ t:String(x.title||x.task||x.name).trim().slice(0,90),
        when: /tom/i.test(x.when) ? 'tomorrow' : /some|later/i.test(x.when) ? 'someday' : 'today', repeat: ({ daily:'daily', 'every day':'daily', weekdays:'weekdays', weekly:'weekly', 'every week':'weekly' })[String(x.repeat||'').toLowerCase()] || '',
        high: !!(x.important || x.urgent || x.priority==='high'), steps:(x.steps||[]).map(s => String(s.title||s).trim()).filter(Boolean).slice(0,8), done:!!x.done })); } catch(e){}
  }
  const out = []; let when = 'today', repeat = '', last = null;
  for (const raw of t0.split(/\r?\n/)){
    if (!raw.trim()) continue;
    const indent = raw.match(/^\s*/)[0].replace(/\t/g, '    ').length; let line = raw.trim();
    const head = line.replace(/[:#*]/g, '').trim().toLowerCase();
    if (/:$/.test(line) || /^#+\s/.test(line)){
      const H = { today:['today',''], tomorrow:['tomorrow',''], someday:['someday',''], later:['someday',''], 'every day':['today','daily'], daily:['today','daily'], weekdays:['today','weekdays'], 'every week':['today','weekly'], weekly:['today','weekly'] }[head];
      if (H){ [when, repeat] = H; last = null; continue; }
    }
    let done = false; line = line.replace(/^([-*•·]|\d+[.)])\s+/, '');
    const box = line.match(/^\[( |x|X)\]\s*/); if (box){ done = box[1] !== ' '; line = line.slice(box[0].length); }
    if (!line) continue;
    if (indent >= 2 && last){ if (last.steps.length < 8) last.steps.push(line.replace(/\s*!+$/, '').slice(0,80)); continue; }
    let high = false; if (/(^!|\s!+$|\burgent\b)/i.test(line)){ high = true; line = line.replace(/^!+\s*|\s*!+$/g, '').trim(); }
    last = { t:line.slice(0,90), when, repeat, high, steps:[], done }; out.push(last);
  }
  return out;
}

/* ---------- make it smaller ---------- */
const TEMPLATES = [
  [/email|reply|inbox|message|text\b/i, ['Open your inbox','Find the first email','Write one sentence back','Finish and send it','Do the next one']],
  [/laundry|fold|clothes|wash/i, ['Bring the basket to the bed','Fold just the shirts','Fold everything else','Put it all away']],
  [/clean|tidy|declutter|organi[sz]e|closet|garage|room/i, ['Set a 5-minute timer','Pick up 5 things','Clear one surface','Put things back where they live']],
  [/tax|bill|form|paperwork|budget|insurance/i, ['Find the folder or login','Open last year\'s version','Fill in the easy parts','Note what\'s missing','Finish one section']],
  [/write|essay|report|post|resume|article|outline/i, ['Open a blank document','Write the title','Jot 3 bullet points','Turn one bullet into a paragraph']],
  [/call|phone|appointment|book/i, ['Find the number','Write what you want to say','Dial','Note the outcome']],
  [/walk|run|exercise|gym|stretch/i, ['Put on your shoes','Step outside','Walk to the end of the street','Keep going for 10 minutes']],
];
function templateSteps(text, n){ const hit = TEMPLATES.find(([re]) => re.test(text));
  let steps = hit ? hit[1].slice() : ['Open what you need','Do the smallest first bit','Keep going for 5 minutes','Decide the next bit'];
  return n >= 6 ? ['Get up and get set up'].concat(steps).concat(['Take a short break']) : steps.slice(0, n); }
function smaller(t, n){ touch(); t.steps = templateSteps(t.t, n).map(s => ({ t:s, done:false })); focusTask(t, focusWhy || 'You picked'); panel = null; save(); render();
  rex.hop = 1; rex.say(`First step: ${t.steps[0].t}. That's it.`, 3200, [['Start with Rex', () => startSession(t)], ['Okay', null, true]]); }

/* ---------- picking what's next ---------- */
function pickThree(){ const now = Date.now(), list = openToday(); const due = t => t.startAt && t.startAt.at && t.startAt.at < now + 30*60e3 ? 1 : 0;
  if (S.planDay === today()) return list.slice().sort((a, b) => (due(b) - due(a)) || (a.order - b.order)).slice(0, 3);
  return list.slice().sort((a, b) => (due(b) - due(a)) || ((b.high?1:0) - (a.high?1:0)) || ((b.carry||0) - (a.carry||0)) || ((b.steps.length?1:0) - (a.steps.length?1:0)) || (a.t.length - b.t.length)).slice(0, 3); }
function focusTask(t, why){ focusId = t ? t.id : null; focusWhy = why || 'You picked'; picking = false; render(); }
function focused(){ const f = focusId && byId(focusId); if (f && !f.done && f.when === 'today') return [f, focusWhy];
  if (S.suggest === false) return [null]; const p = pickThree()[0]; return p ? [p, 'Up next'] : [null]; }
function pickOne(){ if (openToday().length < 2){ const p = openToday()[0]; if (p) focusTask(p, 'Rex suggested'); return; } picking = true; panel = null; render();
  rex.say('I picked three. Which one first?', 2600); setExpandedIf(false); }

/* ---------- complete, delete, undo ---------- */
let undoFn = null;
function snack(text, fn){ const s = $('#snack'); s.querySelector('span').textContent = text; undoFn = fn; s.querySelector('button').hidden = !fn; s.classList.add('on'); clearTimeout(s._t); s._t = setTimeout(() => s.classList.remove('on'), 4200); }
function doUndo(){ const s = $('#snack'); if (undoFn){ const f = undoFn; undoFn = null; f(); save(); render(); } s.classList.remove('on'); }
function logDone(n){ S.log = S.log || {}; S.log[today()] = Math.max(0, (S.log[today()]||0) + n); }
function toggle(t){
  touch(); const was = t.done; t.done = !t.done; t.doneAt = t.done ? Date.now() : null;
  if (t.done){ t.steps.forEach(s => s.done = true); logDone(1); SFX.tick(); if (focusId === t.id) focusId = null; if (session && session.id === t.id) endSession(false);
    snack(`Nice. "${t.t}" is done`, () => { t.done = false; t.doneAt = null; logDone(-1); });
    bus.emit('task_done', t);
    if (!openToday().length && todays().length) setTimeout(celebrate, 700);
  } else { logDone(-1); SFX.untick(); if (talk(.6)) rex.say('Oh! Back on the list.', 1400); }
  save(); render(); }
function removeTask(t){ touch(); const i = S.tasks.indexOf(t); S.tasks.splice(i, 1); if (focusId === t.id) focusId = null; SFX.del(); save(); render();
  snack(`Deleted "${t.t}"`, () => { S.tasks.splice(i, 0, t); }); bus.emit('task_deleted', t); }
function celebrate(){ if (S.allDoneDay === today()) return; S.allDoneDay = today(); S.pendingKeep = true; save(); SFX.done();
  rex.hop = 1; const b = rexBox(); for (let i = 0; i < 10; i++) setTimeout(() => heart(b.x - 40 + Math.random()*80, b.y + 10), i*90);
  rex.say('All done! I\'ll make you something tonight.', 3200); }

/* ---------- 5 minutes with Rex ---------- */
const SESSION_MIN = 5;
function startSession(t){ if (!t) return; touch(); focusId = t.id; focusWhy = focusWhy || 'You picked'; panel = null; session = { id:t.id, end: Date.now() + SESSION_MIN*60e3, over:false }; S.sessions = (S.sessions||0) + 1; save(); render();
  setExpandedIf(false); rex.say(pick(['Let\'s do it together.','Five minutes. I\'ll be right here.','Ready when you are.']), 2000); rex.goTo(.3, () => read()); }
function endSession(stretch){ if (!session) return; session = null; rex.reading = false; rex.sitting = 0; clearProp('book'); render();
  if (stretch && S.habits.stretch) setTimeout(() => rex.say('Stretch with me?', 3000, [['Okay', () => { rex.hop = 1; rex.say('Reach up high…', 1600); }], ['Not now', null, true]]), 1600); }
function sessionTick(){ if (!session) return; const left = session.end - Date.now(), el = $('#sTime'), ring = $('#ringFill');
  if (left <= 0 && !session.over){ session.over = true; SFX.session(); render(); rex.hop = 1; rex.say('Five minutes! You started, and that\'s the hard part.', 3400); return; }
  if (el) el.textContent = session.over ? '0:00' : `${Math.floor(left/60e3)}:${pad(Math.floor(left/1000)%60)}`;
  if (ring){ const f = Math.max(0, left)/(SESSION_MIN*60e3); ring.style.strokeDashoffset = String(113 * (1 - f)); } }
setInterval(sessionTick, 500);
function stepDone(t, i){ touch(); t.steps[i].done = !t.steps[i].done; SFX.tick(); const next = t.steps.find(s => !s.done);
  if (!next){ toggle(t); return; } if (t.steps[i].done) rex.say(`Next: ${next.t}`, 2200); rex.hop = t.steps[i].done ? 1 : 0; save(); render(); }

/* ---------- when + where ---------- */
const WHEN_OPTS = [['In 15 minutes', () => Date.now() + 15*60e3, 'in 15 min'], ['After lunch', () => at(13,0), 'after lunch'], ['This afternoon', () => at(14,30), 'this afternoon'], ['This evening', () => at(19,0), 'this evening'], ['Tomorrow morning', () => at(9,0,1), 'tomorrow morning']];
const PLACES_OPTS = ['At my desk','On the couch','In the kitchen','Out and about'];
function at(h, m, plusDays = 0){ const d = new Date(); d.setDate(d.getDate()+plusDays); d.setHours(h, m, 0, 0); return d.getTime(); }
function setWhen(t, i){ const [, f, label] = WHEN_OPTS[i]; const ms = f(); const d = new Date(ms); const day = dayKey(d);
  t.startAt = { at:ms, label, day, place: t.startAt && t.startAt.place || null }; t.nudged = false; if (day !== today()){ t.when = day; if (focusId === t.id) focusId = null; } save(); render(); toast(`Rex will remind you ${label}`); }

/* ---------- nudges (cards in the list) ---------- */
function nudge(k, text, buttons){ nudges = nudges.filter(n => n.k !== k); nudges.push({ k, text, buttons }); render(); }
function dropNudge(k){ nudges = nudges.filter(n => n.k !== k); render(); }

/* ---------- keepsakes, morning, evening ---------- */
function giveKeepsake(){ S.keeps = S.keeps || []; const k = S.keeps.length; S.keeps.push({ k, day:today() }); S.pendingKeep = false; save(); return KEEP_NAMES[k % KEEP_NAMES.length]; }
function morning(){
  if (S.morningDay === today() || S.asleep) return; S.morningDay = today(); save();
  let delay = 900;
  if (S.pendingKeep){ setTimeout(() => { const n = giveKeepsake(); rex.hop = 1; rex.say(`I made you ${n} last night.`, 3400); }, delay); delay += 3800; }
  else if (S.greet){ S.greet = false; save(); setTimeout(() => rex.say('Hey! Good to see you.', 2400), delay); delay += 2800; }
  if (S.habits.water && S.waterDay !== today()){ S.waterDay = today(); save(); setTimeout(() => { rex.say('*sip* Water first.', 1800); nudge('water', 'Rex had a glass of water. Want one too?', [['Done', () => { rex.hop = 1; }], ['Skip', null, true]]); }, delay); delay += 2600; }
  if (openToday().length > 1) setTimeout(() => rex.say('What\'s first today?', 4200, [['Pick one with me', pickOne], ['I\'ve got it', null, true]]), delay);
  delay += 5000;
  if (triageNeeded()) setTimeout(() => nudge('sort', 'Want to sort today\'s list? It takes a minute.', [['Sort it', triageStart], ['Not now', null, true]]), delay);
}
function wrapUp(thenBed){
  S.wrapDay = today(); save(); const open = openToday();
  if (!open.length){ if (thenBed) goToBed(); return; }
  wrapChoice = new Map(open.map(t => [t.id, t.repeat ? 'keep' : 'tomorrow'])); nudges = nudges.filter(n => n.k !== 'wrap'); nudges.push({ k:'wrap', wrap:true }); tab = 'today'; render();
  rex.say('*yawn* Ready to call it a day?', 2400);
}
let wrapChoice = new Map();
function goToBed(){ endSession(false); for (const [id, v] of wrapChoice){ const t = byId(id); if (!t || t.done) continue; if (v === 'tomorrow' && !t.repeat){ t.when = tomorrow(); t.carry = (t.carry||0) + 1; } else if (v === 'someday'){ t.when = 'someday'; t.carry = 0; } }
  wrapChoice = new Map(); dropNudge('wrap'); focusId = null;
  if (S.log && S.log[today()] > 0 && S.keptDay !== today()){ S.pendingKeep = true; }
  S.asleep = true; save(); render(); paintWake();
  const go = () => { rex.sleeping = true; rex.sitting = 1; rex.say(S.pendingKeep ? 'I\'ll make you something tonight. Night!' : 'Good night!', 2600); };
  if (place() === 'bedroom') rex.goTo(PLACES.bedroom.bed, go); else go(); }
function wake(){ S.asleep = false; save(); rex.sleeping = false; rex.sitting = 0; rex.hop = 1; paintWake(); rex.say('*yawn* Good morning!', 2000); morning(); }
function paintWake(){ $('#wakeChip').hidden = !S.asleep; }
$('#wakeChip').onclick = e => { e.stopPropagation(); wake(); };

/* ---------- morning sort: effort + today's frog ---------- */
const untagged = () => openToday().filter(t => !t.eff && !t.repeat);
function triageNeeded(){ return S.triageDay !== today() && openToday().length > 1 && untagged().length > 0; }
function frogGuess(){ const rank = t => (t.eff==='h'?3:t.eff==='m'?1:0) + (t.high?1:0) + Math.min(2, t.carry||0)*.5 + (t.steps.length?.5:0); return openToday().slice().sort((a, b) => rank(b) - rank(a))[0] || null; }
function applyPlan(){ const f = S.frogDay === today() ? S.frogId : null; ensureOrder();
  const w = t => t.id === f ? 1 : t.eff==='e' ? 0 : t.eff==='m' ? 2 : t.eff==='h' ? 3 : 2.5;
  let n = 0; openToday().sort((a, b) => (w(a) - w(b)) || (a.order - b.order)).forEach(t => t.order = ++n); S.planDay = today(); save(); render(); }
function triageStart(){
  dropNudge('sort'); const queue = untagged(); let i = 0;
  const ov = overlay(`<div class="card ob"><img class="obimg" src="${REX_SRC}" alt=""><div class="obbody"></div><div class="tribtns"></div><div class="dots"></div><button class="link" data-x>Skip for today</button></div>`);
  const body = ov.querySelector('.obbody'), btns = ov.querySelector('.tribtns'), dots = ov.querySelector('.dots');
  const finish = planned => { S.triageDay = today(); save(); closeOverlay(); if (planned){ applyPlan(); rex.say('Easy ones first, then the frog. Then it\'s downhill.', 3000); } };
  ov.querySelector('[data-x]').onclick = () => finish(false);
  const paintDots = () => { dots.innerHTML = queue.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'on' : ''}"></i>`).join(''); };
  const askFrog = () => { dots.innerHTML = ''; const g = frogGuess(); if (!g || S.frogDay === today()){ finish(true); return; }
    body.innerHTML = `<h2>The heavy one</h2><p>This looks like today's frog: <b>${esc(g.t)}</b>. Do it right after the easy ones?</p>`;
    btns.innerHTML = `<button class="pill coral" data-f="${g.id}">That's the one</button><button class="pill ghost" data-other>Pick another</button><button class="link" data-none>No frog today</button>`;
    btns.onclick = e => { const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.f){ S.frogDay = today(); S.frogId = +b.dataset.f; save(); SFX.pop(); finish(true); }
      else if ('other' in b.dataset){ body.innerHTML = '<h2>Which one is the frog?</h2>'; btns.innerHTML = openToday().filter(t => t.id !== g.id).slice(0, 6).map(t => `<button class="tript" data-f="${t.id}">${esc(t.t)}</button>`).join('') + '<button class="link" data-none>No frog today</button>'; }
      else if ('none' in b.dataset){ S.frogDay = today(); S.frogId = null; save(); finish(true); } }; };
  const show = () => { if (i >= queue.length){ askFrog(); return; } const t = queue[i]; paintDots();
    body.innerHTML = `<div class="trilbl">${i+1} of ${queue.length} · How much effort?</div><h2>${esc(t.t)}</h2>`;
    btns.innerHTML = [['e','Easy','A few minutes, no dread'],['m','Medium','Takes some focus'],['h','Hard','Big, fuzzy, or dreaded']].map(([k, l, h]) => `<button class="trieff ${k}" data-e="${k}"><b>${l}</b><span>${h}</span></button>`).join('');
    btns.onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; t.eff = b.dataset.e; save(); SFX.tick(); i++; show(); }; };
  show();
}

/* ---------- overlays ---------- */
function overlay(html){ closeOverlay(); const o = document.createElement('div'); o.className = 'ov'; o.innerHTML = html; app.appendChild(o); requestAnimationFrame(() => o.classList.add('on')); o.addEventListener('click', e => { if (e.target === o) closeOverlay(); }); return o; }
function closeOverlay(){ const o = app.querySelector('.ov'); if (o){ o.classList.remove('on'); setTimeout(() => o.remove(), 250); } }
function openImport(){ const o = overlay(`<div class="card sheetcard"><div class="sh"><h2>Paste a list</h2><button class="x" data-x aria-label="Close">×</button></div>
  <p class="hint">One task per line. Headings like <b>Today:</b>, <b>Tomorrow:</b>, <b>Someday:</b>, or <b>Every day:</b> sort the lines below them. Indent a line to make it a step. End a task with <b>!</b> to mark it important.</p>
  <textarea id="impText" rows="9" placeholder="Today:&#10;- Reply to Dana !&#10;- Do my taxes&#10;    - Find last year's return&#10;Someday:&#10;- Clean out the garage"></textarea>
  <div class="imprev" id="impPrev"></div><div class="row2"><button class="pill ghost" id="copyFmt">Copy format for an AI</button><button class="pill coral" id="impGo" disabled>Add tasks</button></div></div>`);
  const ta = o.querySelector('#impText'), go = o.querySelector('#impGo'), pv = o.querySelector('#impPrev');
  const upd = () => { const list = parseImport(ta.value), n = list.length; go.disabled = !n; go.textContent = n ? `Add ${n} ${n===1?'task':'tasks'}` : 'Add tasks';
    if (!n){ pv.textContent = ta.value.trim() ? 'Nothing Rex can read yet.' : ''; return; }
    const c = w => list.filter(x => x.when === w && !x.repeat).length, r = list.filter(x => x.repeat).length, st = list.reduce((a, x) => a + x.steps.length, 0);
    pv.innerHTML = [c('today') && `<b>${c('today')}</b> today`, c('tomorrow') && `<b>${c('tomorrow')}</b> tomorrow`, c('someday') && `<b>${c('someday')}</b> someday`, r && `<b>${r}</b> repeating`, st && `<b>${st}</b> steps`].filter(Boolean).join(' · '); };
  ta.oninput = upd; o.querySelector('[data-x]').onclick = closeOverlay; o.querySelector('#copyFmt').onclick = copyFormat;
  go.onclick = () => { const list = parseImport(ta.value); list.forEach(x => { const t = addTask({ t:x.t, when: x.when === 'tomorrow' ? tomorrow() : x.when, repeat:x.repeat, dow: x.repeat==='weekly' ? new Date().getDay() : undefined, high:x.high, steps:x.steps, done:x.done }); if (t.repeat && !isDue(t)) t.when = 'rest'; });
    save(); closeOverlay(); tab = 'today'; render(); SFX.add(); rex.hop = 1; rex.say(`Got all ${list.length}. They're on the list.`, 2600); };
  setTimeout(() => ta.focus(), 60); }
function copyFormat(){ const done = () => toast('Copied. Paste it into any AI with your list.'); try { navigator.clipboard.writeText(IMPORT_FORMAT).then(done, () => showCopy(IMPORT_FORMAT)); } catch(e){ showCopy(IMPORT_FORMAT); } }
function showCopy(text){ const o = overlay(`<div class="card sheetcard"><div class="sh"><h2>Copy this</h2><button class="x" data-x aria-label="Close">×</button></div><textarea rows="10" readonly>${esc(text)}</textarea></div>`); o.querySelector('[data-x]').onclick = closeOverlay; const ta = o.querySelector('textarea'); setTimeout(() => { ta.focus(); ta.select(); }, 60); }
function backup(){ const data = JSON.stringify({ app:'dino-day', v:3, at:new Date().toISOString(), S }, null, 0);
  try { navigator.clipboard.writeText(data).then(() => toast('Backup copied. Paste it somewhere safe.'), () => showCopy(data)); } catch(e){ showCopy(data); } }
function restore(){ const o = overlay(`<div class="card sheetcard"><div class="sh"><h2>Restore a backup</h2><button class="x" data-x aria-label="Close">×</button></div><p class="hint">Paste a Dino Day backup. It replaces what's here.</p><textarea id="rsText" rows="8"></textarea><div class="row2"><span class="hint" id="rsMsg"></span><button class="pill coral" id="rsGo">Restore</button></div></div>`);
  o.querySelector('[data-x]').onclick = closeOverlay;
  o.querySelector('#rsGo').onclick = () => { try { const j = JSON.parse(o.querySelector('#rsText').value); if (j.app !== 'dino-day' || !j.S) throw 0; S = { ...S, ...j.S }; save(); closeOverlay(); drawScene(); render(); toast('Restored'); } catch(e){ o.querySelector('#rsMsg').textContent = 'That doesn\'t look like a Dino Day backup.'; } }; }
function onboard(){ if (S.onboarded) return;
  const steps = [['Hi, I\'m Rex.', 'I live up here. Tap me, pet me, or pull my world down to play. I\'ll keep myself busy either way.'],
    ['One small thing.', 'Add a task below. You can type things like "call mom tomorrow at 3." Big ones can be made smaller. Nothing is scored, and nothing you skip costs anything.'],
    ['Start with me.', 'When a task feels heavy, press Start with Rex. We work for five minutes together, and that\'s usually enough to get going.']];
  let i = 0; const o = overlay(`<div class="card ob"><img class="obimg" src="${REX_SRC}" alt=""><div class="obbody"></div><div class="dots"></div><div class="row2"><button class="link" data-skip>Skip</button><button class="pill coral" data-next>Next</button></div></div>`);
  const paint = () => { const [h, p] = steps[i]; o.querySelector('.obbody').innerHTML = `<h2>${h}</h2><p>${p}</p>`; o.querySelector('.dots').innerHTML = steps.map((_, k) => `<i class="${k===i?'on':''}"></i>`).join(''); o.querySelector('[data-next]').textContent = i === 2 ? 'Let\'s go' : 'Next'; };
  const finish = () => { S.onboarded = true; save(); closeOverlay(); SFX.pop(); setTimeout(morning, 400); };
  o.querySelector('[data-skip]').onclick = finish; o.querySelector('[data-next]').onclick = () => { if (i < 2){ i++; paint(); } else finish(); }; paint(); }

/* ---------- rendering ---------- */
function greet(){ const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
function meta(t){ const c = CAT[t.cat]; const bits = [];
  if (S.frogDay === today() && S.frogId === t.id && !t.done) bits.push('<span class="frog">Today\'s frog</span>');
  if (c) bits.push(c.label);
  if (t.startAt && t.startAt.label && t.when === 'today') bits.push(t.startAt.label + (t.startAt.place ? ', ' + t.startAt.place.toLowerCase() : ''));
  if (t.repeat) bits.push(REPEAT_LABEL[t.repeat]);
  if (t.eff && !(S.frogDay === today() && S.frogId === t.id)) bits.push(EFF[t.eff]);
  if (t.steps.length) bits.push(`${t.steps.filter(s => s.done).length} of ${t.steps.length} steps`);
  return bits.join(' · '); }
function row(t, opts = {}){ const c = CAT[t.cat] || CAT.self; const prog = t.steps.length ? t.steps.filter(s => s.done).length / t.steps.length : 0;
  return `<div class="trow" data-id="${t.id}"><button class="del" data-del="${t.id}" tabindex="-1">Delete</button>
  <div class="task ${t.done?'done':''} ${t.high?'hi':''} ${focusId===t.id?'sel':''}" data-row="${t.id}" tabindex="0">
    <div class="tile" style="background:${c.bg}">${c.icon}</div>
    <div class="tt"><div class="title">${t.high ? '<span class="imp" aria-label="Important">!</span>' : ''}${esc(t.t)}</div><div class="meta">${meta(t)}</div>${t.steps.length && !t.done ? `<div class="bar"><i style="width:${prog*100}%"></i></div>` : ''}</div>
    ${opts.bring ? `<button class="pill ghost mint" data-bring="${t.id}">Today</button>` : `<button class="more" aria-label="More options for ${esc(t.t)}" data-more="${t.id}">${IC.more}</button>
    <button class="check" aria-label="${t.done?'Mark not done':'Mark done'}: ${esc(t.t)}" data-check="${t.id}">${IC.check}</button>`}
  </div>${!t.done && !opts.bring && (t.carry||0) >= 4 && t.parkDay !== today() ? `<div class="park">This one keeps rolling over. Park it in Someday? <button class="pill ghost" data-park="${t.id}">Park it</button><button class="link" data-keep="${t.id}">Keep it</button></div>` : ''}</div>`; }
function focusCard(){
  if (picking){ const three = pickThree(); return `<div class="fcard pickc"><div class="k">Rex is holding up three. Which one first?</div><div class="stickies">${three.map((t, i) => `<button class="sticky s${i}" data-pick="${t.id}">${esc(t.t)}</button>`).join('')}</div><button class="link" data-cancelpick>Never mind</button></div>`; }
  const [f, why] = focused(); if (!f) return '';
  const next = f.steps.find(s => !s.done), inS = session && session.id === f.id;
  let body = '';
  if (inS){ body = `<div class="sess"><svg class="ring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" class="rbg"/><circle cx="20" cy="20" r="18" class="rfill" id="ringFill" style="stroke-dasharray:113;stroke-dashoffset:0"/></svg><div><div class="stime" id="sTime">${SESSION_MIN}:00</div><div class="hint">${session.over ? 'Time\'s up. How did it go?' : 'Working on it with Rex'}</div></div></div>
    <div class="acts">${session.over ? `<button class="pill ghost" data-act="more5">Keep going</button><button class="pill ghost" data-act="break">Take a break</button><button class="pill coral" data-act="done">I finished it</button>`
      : `${next ? '<button class="pill ghost" data-act="step">Did that step</button>' : ''}<button class="pill coral" data-act="done">I did it</button><button class="link" data-act="stop">Stop for now</button>`}</div>`; }
  else if (panel === 'when'){ body = `<div class="opts"><div class="olbl">When?</div>${WHEN_OPTS.map(([l], i) => `<button class="chip" data-when="${i}">${l}</button>`).join('')}${f.startAt ? '<button class="chip" data-when="clear">No time</button>' : ''}
    <div class="olbl">Where?</div>${PLACES_OPTS.map(p => `<button class="chip ${f.startAt && f.startAt.place === p ? 'on' : ''}" data-place="${esc(p)}">${p}</button>`).join('')}</div><div class="acts"><button class="link" data-act="closepanel">Done</button></div>`; }
  else if (panel === 'smaller'){ body = `<div class="opts"><div class="olbl">How small?</div><button class="chip" data-small="6">Tiny steps</button><button class="chip" data-small="4">Small</button><button class="chip" data-small="3">A few</button></div><div class="acts"><button class="link" data-act="closepanel">Never mind</button></div>`; }
  else { body = `<div class="acts"><button class="pill coral" data-act="start">Start with Rex · 5 min</button><button class="pill ghost" data-act="done">Done</button></div>
    <div class="acts small"><button class="link" data-act="smaller">${f.steps.length ? 'Redo the steps' : 'Make it smaller'}</button><button class="link" data-act="when">When?</button><button class="link" data-act="another">Pick another</button></div>`; }
  return `<div class="fcard ${inS ? 'insess' : ''}"><div class="fhead"><div class="who"><img src="${REX_SRC}" alt=""></div><div class="txt"><div class="k">${esc(why)}</div><div class="ft">${esc(f.t)}</div>${f.startAt && f.startAt.label ? `<div class="hint">${esc(f.startAt.label)}${f.startAt.place ? ', ' + esc(f.startAt.place.toLowerCase()) : ''}</div>` : ''}</div></div>
    ${f.steps.length ? `<div class="steps">${f.steps.map((s, i) => `<button class="step ${s.done?'done':''} ${s === next ? 'next' : ''}" data-step="${i}"><span class="sb">${s.done ? IC.check : ''}</span>${esc(s.t)}</button>`).join('')}</div>` : ''}
    ${body}</div>`; }
function timeline(){ if (S.timeline === false) return '';
  const T0 = 7*60, T1 = 23*60, now = new Date(), nm = now.getHours()*60 + now.getMinutes();
  const items = todays().filter(t => t.startAt && t.startAt.at && t.startAt.day === today()).map(t => { const d = new Date(t.startAt.at); return { m:d.getHours()*60 + d.getMinutes(), l:t.t, id:t.id, done:t.done }; });
  if (S.habits.water) items.push({ m:9*60+30, l:'Water', hab:true }); if (S.habits.lunch){ const [h, m] = (S.habits.lunchAt||'12:30').split(':').map(Number); items.push({ m:h*60+m, l:'Lunch', hab:true }); } if (S.habits.winddown) items.push({ m:21*60, l:'Wind down', hab:true });
  if (!items.length) return '';
  const pos = m => Math.max(0, Math.min(100, (m - T0) / (T1 - T0) * 100));
  return `<div class="tline"><div class="tlhead"><b>Your day</b><span>${now.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}</span></div><div class="tltrack">
    ${[9,12,15,18,21].map(h => `<span class="tick" style="left:${pos(h*60)}%">${h>12?h-12:h}${h<12?'a':'p'}</span>`).join('')}
    ${items.map(it => `<button class="tlitem ${it.hab?'hab':''} ${it.done?'done':''}" style="left:${pos(it.m)}%" ${it.id ? `data-tl="${it.id}"` : ''} title="${esc(it.l)} · ${fmtMin(it.m)}"><i></i><span>${esc(it.l)}</span></button>`).join('')}
    ${nm >= T0 && nm <= T1 ? `<div class="tlnow" style="left:${pos(nm)}%"></div>` : ''}</div></div>`; }
function nudgeCards(){ return nudges.map(n => {
  if (n.wrap){ const open = openToday(); return `<div class="nudge wrap"><div class="nt">Ready to call it a day? Where should these go?</div>${open.map(t => `<div class="wrow"><span>${esc(t.t)}</span><span class="seg">${[['Tomorrow','tomorrow'],['Someday','someday'],['Keep','keep']].map(([l, v]) => `<button data-wrap="${t.id}" data-v="${v}" aria-pressed="${(wrapChoice.get(t.id)||'tomorrow') === v}">${l}</button>`).join('')}</span></div>`).join('')}
    <div class="acts"><button class="pill coral" data-gn>Good night, Rex</button><button class="link" data-notyet>Not yet</button></div></div>`; }
  return `<div class="nudge" data-nk="${n.k}"><span class="nt">${esc(n.text)}</span>${n.buttons.map(([l, , g], i) => `<button class="pill ${g ? 'ghost' : 'coral'} sm" data-nb="${i}">${esc(l)}</button>`).join('')}</div>`; }).join(''); }
function myHabits(){ if (!S.habitsOn) return '';
  const wk = weekKeys(), L = ['M','T','W','T','F','S','S'];
  return `<div class="section"><span>My habits</span></div><div class="habs">${(S.myHabits||[]).map(h => `<div class="hab"><div class="hn">${esc(h.n)}<button class="x" data-hdel="${h.id}" aria-label="Remove ${esc(h.n)}">×</button></div><div class="hw">${wk.map((k, i) => `<button class="hd ${h.log[k]?'on':''} ${k===today()?'td':''}" data-hk="${h.id}" data-day="${k}" aria-label="${L[i]} ${k}" ${k > today() ? 'disabled' : ''}>${L[i]}</button>`).join('')}</div></div>`).join('')}
    <form class="add mh" id="mhForm"><input id="mhIn" placeholder="Add a habit, like Drink water" aria-label="New habit" maxlength="40"><button aria-label="Add habit">${IC.plus}</button></form></div>`; }
function weekKeys(){ const d = new Date(); const dow = (d.getDay()+6)%7; d.setDate(d.getDate()-dow); return Array.from({ length:7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate()+i); return dayKey(x); }); }
function streakOf(h){ let n = 0; const d = new Date(); if (!h.log[dayKey(d)]) d.setDate(d.getDate()-1); while (h.log[dayKey(d)]){ n++; d.setDate(d.getDate()-1); } return n; }

function render(){
  const sc = $('#scroll'), keepScroll = sc.scrollTop;
  const dateStr = new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
  if (tab === 'today'){
    const open = openToday(), done = todays().filter(t => t.done).sort((a, b) => (b.doneAt||0) - (a.doneAt||0));
    sc.innerHTML = `
      <div class="hello"><div><h1>${greet()}, ${esc(S.name)}</h1><div class="date">${dateStr}</div></div>${open.length > 1 ? `<button class="pill ghost mint" data-pickone>Pick one with Rex</button>` : ''}</div>
      ${nudgeCards()}
      ${focusCard()}
      ${timeline()}
      <form class="add" id="addForm"><input id="addInput" placeholder="Add a task" autocomplete="off" maxlength="90" aria-label="New task"><button aria-label="Add task">${IC.plus}</button></form>
      <div class="qprev" id="qPrev"></div>
      <div class="addopts" id="addOpts">
        <div class="cats" role="group" aria-label="Category">${Object.entries(CAT).map(([k, c]) => `<button type="button" data-cat="${k}" aria-pressed="${k===cat}">${c.label}</button>`).join('')}</div>
        <button type="button" class="link" data-import>Paste a list</button>
      </div>
      <div class="list" id="list">${open.length ? open.map(t => row(t)).join('') : `<div class="empty">${todays().length ? 'Nothing left for today. Rex is happy to just hang out.' : 'Nothing here yet. Add one small thing.'}</div>`}</div>
      ${done.length ? `<button class="section toggle" data-showdone>${S.showDone ? 'Hide completed' : 'Completed'}</button>${S.showDone ? `<div class="list">${done.map(t => row(t)).join('')}</div>` : ''}` : ''}
      ${myHabits()}`;
  } else if (tab === 'someday'){
    const later = S.tasks.filter(t => /^\d{4}/.test(t.when)).sort((a, b) => a.when < b.when ? -1 : 1), sd = S.tasks.filter(t => t.when === 'someday'), rest = S.tasks.filter(t => t.when === 'rest');
    sc.innerHTML = `<div class="hello"><div><h1>Later</h1><div class="date">No pressure. Bring something back when you're ready.</div></div></div>
      ${later.length ? `<div class="section"><span>Coming up</span></div><div class="list">${later.map(t => row(t, { bring:true }).replace('class="meta">', `class="meta">${labelDay(t.when)} · `)).join('')}</div>` : ''}
      <div class="section"><span>Someday</span><button class="link" data-import>Paste a list</button></div><div class="list">${sd.length ? sd.map(t => row(t, { bring:true })).join('') : '<div class="empty">Your Someday box is empty.</div>'}</div>
      ${rest.length ? `<div class="section"><span>Resting until their day</span></div><div class="list">${rest.map(t => row(t, { bring:true })).join('')}</div>` : ''}`;
  } else if (tab === 'settings'){ sc.innerHTML = settingsHTML();
  } else if (tab === 'stats'){ sc.innerHTML = statsHTML(); }
  $('#tabs').innerHTML = [['today','Today',IC.today],['someday','Later',IC.someday],['rex','Rex',IC.paw],['settings','Settings',IC.gear]].map(([k, l, i]) => `<button data-tab="${k}" ${tab===k || (tab==='stats' && k==='settings') ? 'aria-current="page"' : ''}>${i}<span>${l}</span><span class="dot"></span></button>`).join('');
  sc.scrollTop = keepScroll; sessionTick(); paintQuick();
}
function seg(key, opts, obj = S){ return `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-set="${key}" data-val="${v}" aria-pressed="${String(key.includes('.') ? key.split('.').reduce((o, k) => o && o[k], S) : obj[key]) === String(v)}">${l}</button>`).join('')}</div>`; }
function settingsHTML(){ const H = S.habits; const hrow = (k, l, hint) => `<div class="row"><div><div class="lab">${l}</div><div class="hint">${hint}</div></div>${seg('habits.'+k, [[true,'On'],[false,'Off']])}</div>`;
  return `<div class="hello"><div><h1>Settings</h1><div class="date">Make Dino Day yours.</div></div></div>
  <div class="glabel">You</div><div class="group">
    <div class="row"><div><div class="lab">Your name</div><div class="hint">Rex uses it to greet you.</div></div><input type="text" id="setName" value="${esc(S.name)}" aria-label="Your name" autocomplete="given-name"></div>
    <div class="row"><div><div class="lab">Your stats</div><div class="hint">What you've done, sessions, keepsakes. Only here, never on Today.</div></div><button class="pill ghost mint" data-stats>Open</button></div></div>
  <div class="glabel">Rex</div><div class="group">
    <div class="row"><div><div class="lab">Rex's spot</div><div class="hint">Where he hangs out.</div></div>${seg('place', [['meadow','Meadow'],['bedroom','Bedroom']])}</div>
    <div class="row"><div><div class="lab">Chattiness</div><div class="hint">How often Rex talks and reacts.</div></div>${seg('chat', [['often','Often'],['sometimes','Some'],['quiet','Quiet']])}</div>
    <div class="row"><div><div class="lab">Suggests what's next</div><div class="hint">Rex's pick at the top of Today.</div></div>${seg('suggest', [[true,'On'],[false,'Off']])}</div>
    <div class="row"><div><div class="lab">Day and night</div><div class="hint">${S.asleep ? 'Rex is asleep.' : 'Rex is awake.'}</div></div><button class="pill ghost mint" data-daybtn>${S.asleep ? 'Start my day' : 'Bedtime'}</button></div></div>
  <div class="glabel">Rex's habits</div><div class="group">
    ${hrow('water','Water','He drinks a glass in the morning and asks if you want one.')}
    <div class="row"><div><div class="lab">Lunch</div><div class="hint">He asks you to eat with him.</div></div><div class="rowr"><input type="time" id="lunchAt" value="${H.lunchAt||'12:30'}" aria-label="Lunch time">${seg('habits.lunch', [[true,'On'],[false,'Off']])}</div></div>
    ${hrow('stretch','Stretch','After a focus session.')}
    ${hrow('plants','Plants','He waters his plant in the afternoon.')}
    ${hrow('walk','Walk','He invites you out in the late afternoon.')}
    ${hrow('winddown','Wind-down','At 9 PM he gets sleepy and helps you wrap up.')}</div>
  <div class="glabel">Features</div><div class="group">
    <div class="row"><div><div class="lab">My habits</div><div class="hint">A simple weekly check-off grid on Today.</div></div>${seg('habitsOn', [[true,'On'],[false,'Off']])}</div>
    <div class="row"><div><div class="lab">Your day timeline</div><div class="hint">Timed tasks and habits from 7 AM to 11 PM.</div></div>${seg('timeline', [[true,'On'],[false,'Off']])}</div>
    <div class="row"><div><div class="lab">Sounds</div><div class="hint">Soft chimes when you add and finish things.</div></div>${seg('sound', [[true,'On'],[false,'Off']])}</div>
    <div class="row"><div><div class="lab">Time of day</div><div class="hint">Follow your clock, or keep it sunny.</div></div>${seg('lockDay', [[false,'My clock'],[true,'Always day']])}</div></div>
  <div class="glabel">Tasks</div><div class="group">
    <div class="row"><div><div class="lab">Sort today's list</div><div class="hint">Tag effort and pick today's frog.</div></div><button class="pill ghost mint" data-sort>Sort</button></div>
    <div class="row"><div><div class="lab">Import tasks</div><div class="hint">Paste a list from anywhere.</div></div><button class="pill ghost mint" data-import>Paste</button></div>
    <div class="row"><div><div class="lab">Format for AI</div><div class="hint">Copy instructions so any AI writes a list Rex can read.</div></div><button class="pill ghost mint" data-copyfmt>Copy</button></div></div>
  <div class="glabel">Data</div><div class="group">
    <div class="row"><div><div class="lab">Backup</div><div class="hint">Copies everything as text you can keep.</div></div><div class="rowr"><button class="pill ghost mint" data-backup>Copy</button><button class="pill ghost mint" data-restore>Restore</button></div></div>
    <div class="row"><button class="danger" id="resetBtn">${S._confirmReset ? 'Tap again to replace everything with the examples' : 'Start over with example tasks'}</button></div></div>
  <div class="glabel">Prototype tools</div><div class="group">
    <div class="row"><div><div class="lab">Try it now</div><div class="hint">Skip ahead to see how Rex behaves.</div></div><div class="rowr wrapb"><button class="pill ghost mint" data-sim="stall">A stall</button><button class="pill ghost mint" data-sim="wrap">Evening</button><button class="pill ghost mint" data-sim="day">Next day</button><button class="pill ghost mint" data-sim="onb">Intro</button></div></div></div>`; }
function statsHTML(){ const log = S.log || {}, wk = weekKeys(); const week = wk.reduce((a, k) => a + (log[k]||0), 0);
  const tile = (n, l) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`;
  return `<div class="hello"><div><h1>Your stats</h1><div class="date">Just for you. Rex doesn't keep score.</div></div><button class="pill ghost mint" data-tab="settings">Back</button></div>
  <div class="stats">${tile(log[today()]||0, 'done today')}${tile(week, 'done this week')}${tile((S.days||[]).length, (S.days||[]).length === 1 ? 'day with Rex' : 'days with Rex')}${tile(S.sessions||0, 'focus sessions')}</div>
  <div class="glabel">This week</div><div class="group weekbars">${wk.map((k, i) => { const n = log[k]||0, mx = Math.max(1, ...wk.map(x => log[x]||0)); return `<div class="wb ${k===today()?'td':''}"><i style="height:${n/mx*100}%"></i><span>${'MTWTFSS'[i]}</span><em>${n||''}</em></div>`; }).join('')}</div>
  <div class="glabel">Keepsakes</div><div class="group keeps">${(S.keeps||[]).length ? S.keeps.map(x => `<div class="keep"><span>${KEEP_ICONS[x.k % KEEP_ICONS.length]}</span>${esc(KEEP_NAMES[x.k % KEEP_NAMES.length])}<em>${new Date(x.day+'T12:00').toLocaleDateString([], { month:'short', day:'numeric' })}</em></div>`).join('') : '<div class="hint pad">Finish everything on a day and Rex makes you something overnight.</div>'}</div>
  ${(S.myHabits||[]).length ? `<div class="glabel">My habits</div><div class="group">${S.myHabits.map(h => `<div class="row"><div class="lab">${esc(h.n)}</div><div class="hint">${wk.filter(k => h.log[k]).length} of 7 this week · ${streakOf(h)} ${streakOf(h) === 1 ? 'day' : 'days'} running</div></div>`).join('')}</div>` : ''}`; }
const KEEP_ICONS = ['🌰','🍓','⭐','🐦','🌲','🌱','🪨','🍂','🖍️','🧣','⛵','🕯️','🐚','🏠','☕','💐'];

/* ---------- events ---------- */
$('#scroll').addEventListener('click', e => {
  const q = s => e.target.closest(s), g = (s, k) => { const el = q(s); return el ? el.dataset[k] : null; };
  closeMenu();
  let el;
  if ((el = q('[data-check]'))){ toggle(byId(+el.dataset.check)); return; }
  if ((el = q('[data-more]'))){ openMenu(+el.dataset.more, el); return; }
  if ((el = q('[data-del]'))){ removeTask(byId(+el.dataset.del)); return; }
  if ((el = q('[data-bring]'))){ const t = byId(+el.dataset.bring); t.when = 'today'; t.carry = 0; save(); render(); toast('Moved to Today'); bus.emit('task_today', t); return; }
  if ((el = q('[data-park]'))){ const t = byId(+el.dataset.park); t.when = 'someday'; t.carry = 0; save(); render(); bus.emit('task_someday', t); return; }
  if ((el = q('[data-keep]'))){ const t = byId(+el.dataset.keep); t.parkDay = today(); save(); render(); return; }
  if ((el = q('[data-cat]'))){ cat = el.dataset.cat; render(); $('#addInput').focus(); return; }
  if ((el = q('[data-step]'))){ const [f] = focused(); stepDone(f, +el.dataset.step); return; }
  if ((el = q('[data-pick]'))){ const t = byId(+el.dataset.pick); focusTask(t, 'You picked'); rex.hop = 1; rex.say('Good choice.', 1400); return; }
  if (q('[data-cancelpick]')){ picking = false; render(); return; }
  if (q('[data-pickone]')){ pickOne(); return; }
  if ((el = q('[data-act]'))){ const [f] = focused(); const a = el.dataset.act; if (!f) return;
    if (a === 'start') startSession(f);
    else if (a === 'done'){ endSession(true); toggle(f); }
    else if (a === 'step'){ const i = f.steps.findIndex(s => !s.done); if (i >= 0) stepDone(f, i); }
    else if (a === 'stop'){ endSession(false); rex.say('That counts. You started.', 2200); }
    else if (a === 'more5'){ session.end = Date.now() + SESSION_MIN*60e3; session.over = false; render(); rex.say('Five more. Let\'s go.', 1600); }
    else if (a === 'break'){ endSession(true); rex.say('Good idea. I\'ll be here.', 2000); }
    else if (a === 'smaller'){ panel = panel === 'smaller' ? null : 'smaller'; render(); }
    else if (a === 'when'){ panel = panel === 'when' ? null : 'when'; render(); }
    else if (a === 'closepanel'){ panel = null; render(); }
    else if (a === 'another'){ const three = pickThree().filter(t => t.id !== f.id); if (three.length){ focusTask(three[0], 'Rex suggested'); rex.say(pick(['How about this one?','Or maybe this?','This one looks quick.']), 1500); } else toast('That\'s the only one left'); }
    touch(); return; }
  if ((el = q('[data-when]'))){ const [f] = focused(); if (el.dataset.when === 'clear'){ f.startAt = null; save(); render(); } else setWhen(f, +el.dataset.when); return; }
  if ((el = q('[data-place]'))){ const [f] = focused(); f.startAt = f.startAt || { at:null, label:'', day:today(), place:null }; f.startAt.place = f.startAt.place === el.dataset.place ? null : el.dataset.place; save(); render(); return; }
  if ((el = q('[data-small]'))){ const [f] = focused(); smaller(f, +el.dataset.small); return; }
  if ((el = q('[data-tl]'))){ focusTask(byId(+el.dataset.tl), 'You picked'); return; }
  if ((el = q('[data-nb]'))){ const k = el.closest('[data-nk]').dataset.nk, n = nudges.find(x => x.k === k), fn = n && n.buttons[+el.dataset.nb][1]; dropNudge(k); fn && fn(); return; }
  if ((el = q('[data-wrap]'))){ wrapChoice.set(+el.dataset.wrap, el.dataset.v); render(); return; }
  if (q('[data-gn]')){ goToBed(); return; }
  if (q('[data-notyet]')){ dropNudge('wrap'); return; }
  if (q('[data-showdone]')){ S.showDone = !S.showDone; save(); render(); return; }
  if (q('[data-import]')){ openImport(); return; }
  if (q('[data-copyfmt]')){ copyFormat(); return; }
  if (q('[data-sort]')){ if (openToday().length < 2){ toast('Add a couple of tasks first'); return; } openToday().forEach(t => { if (!t.repeat) delete t.eff; }); S.frogDay = null; S.triageDay = null; save(); triageStart(); return; }
  if (q('[data-backup]')){ backup(); return; }
  if (q('[data-restore]')){ restore(); return; }
  if (q('[data-stats]')){ tab = 'stats'; render(); $('#scroll').scrollTop = 0; return; }
  if ((el = q('.hello [data-tab]'))){ tab = el.dataset.tab; render(); return; }
  if (q('[data-daybtn]')){ if (S.asleep) wake(); else if (openToday().length){ tab = 'today'; wrapUp(true); } else goToBed(); render(); return; }
  if ((el = q('[data-sim]'))){ const s = el.dataset.sim;
    if (s === 'stall'){ lastTaskAct = 0; lastStall = 0; checkStall(true); }
    if (s === 'wrap'){ tab = 'today'; wrapUp(false); }
    if (s === 'day'){ S.lastDay = '2000-01-01'; S.morningDay = null; rollover(); if (S.asleep) wake(); else morning(); tab = 'today'; render(); toast('It\'s a new day'); }
    if (s === 'onb'){ S.onboarded = false; onboard(); }
    return; }
  if ((el = q('[data-hk]'))){ const h = S.myHabits.find(x => x.id === +el.dataset.hk); const k = el.dataset.day; if (h.log[k]) delete h.log[k]; else { h.log[k] = true; SFX.tick(); if (k === today() && talk(.7)){ rex.hop = 1; rex.say(pick(['Nice one!','That\'s a good habit.','Yay!']), 1400); } } save(); render(); return; }
  if ((el = q('[data-hdel]'))){ const i = S.myHabits.findIndex(x => x.id === +el.dataset.hdel), h = S.myHabits[i]; S.myHabits.splice(i, 1); save(); render(); snack(`Removed "${h.n}"`, () => S.myHabits.splice(i, 0, h)); return; }
  const st = q('[data-set]');
  if (st){ let v = st.dataset.val; if (v === 'true') v = true; else if (v === 'false') v = false; const key = st.dataset.set;
    if (key.includes('.')){ const [a, b] = key.split('.'); S[a][b] = v; } else S[key] = v;
    if (key === 'lockDay'){ preview = null; drawScene(); }
    if (key === 'place'){ clearAllProps(); drawScene(); rex.x = rex.tx = .5; }
    SFX.pop(); save(); render(); return; }
  if (e.target.id === 'resetBtn'){ if (S._confirmReset){ S.tasks = sampleTasks(); S._confirmReset = false; focusId = null; save(); render(); toast('Example tasks restored'); } else { S._confirmReset = true; render(); setTimeout(() => { S._confirmReset = false; if (tab === 'settings') render(); }, 4000); } return; }
  const r = q('[data-row]'); if (r && !q('button')){ focusTask(byId(+r.dataset.row), 'You picked'); }
});
$('#scroll').addEventListener('input', e => {
  if (e.target.id === 'setName'){ S.name = e.target.value.trim() || 'friend'; save(); }
  if (e.target.id === 'addInput'){ paintQuick(); $('#addOpts').classList.toggle('on', !!e.target.value.trim()); }
  if (e.target.id === 'lunchAt'){ S.habits.lunchAt = e.target.value; save(); }
});
$('#scroll').addEventListener('change', e => { if (e.target.id === 'setName') rex.say(`Nice to meet you, ${S.name}!`, 1800); });
$('#scroll').addEventListener('focusin', e => { if (e.target.id === 'addInput') $('#addOpts').classList.add('on'); });
$('#scroll').addEventListener('submit', e => { e.preventDefault();
  if (e.target.id === 'mhForm'){ const v = $('#mhIn').value.trim(); if (!v) return; S.myHabits = S.myHabits || []; S.myHabits.push({ id:Date.now(), n:v.slice(0,40), log:{} }); save(); render(); setTimeout(() => $('#mhIn') && $('#mhIn').focus(), 0); return; }
  const inp = $('#addInput'), v = inp.value.trim(); if (!v) return; const q = parseQuick(v); if (!q.text){ toast('Add a few words for the task'); return; }
  const t = addTask({ t:q.text.slice(0,90), when:q.when || 'today', repeat:q.repeat, dow:q.dow, high:q.high, startAt: startAtFor(q.when || 'today', q.at) });
  if (t.repeat && !isDue(t) && t.when === 'today') t.when = 'rest';
  save(); render(); SFX.add(); touch(); const ni = $('#addInput'); ni.focus(); $('#addOpts').classList.add('on');
  if (t.when !== 'today') toast(t.when === 'someday' ? 'Saved to Someday' : t.when === 'rest' ? `Repeats ${REPEAT_LABEL[t.repeat].toLowerCase()}` : `Saved for ${labelDay(t.when)}`);
  bus.emit('task_added', t); });
function paintQuick(){ const inp = $('#addInput'), pv = $('#qPrev'); if (!inp || !pv) return; const v = inp.value; if (!v.trim()){ pv.innerHTML = ''; pv.classList.remove('on'); return; }
  const q = parseQuick(v); if (!q.bits.length && !q.high){ pv.innerHTML = ''; pv.classList.remove('on'); return; }
  const chips = []; if (q.when && q.when !== 'today') chips.push(q.when === 'someday' ? 'Someday' : labelDay(q.when)); if (q.at != null) chips.push(fmtMin(q.at)); if (q.repeat) chips.push(REPEAT_LABEL[q.repeat]); if (q.high) chips.push('Important');
  pv.innerHTML = chips.map(c => `<span class="qchip">${esc(c)}</span>`).join('') + `<span class="qtext">"${esc(q.text)}"</span>`; pv.classList.add('on'); }
function openMenu(id, btn){ const t = byId(id); const m = document.createElement('div'); m.className = 'menu'; m.id = 'menu';
  m.innerHTML = `<button data-m="focus">Work on this</button><button data-m="high">${t.high ? 'Not important' : 'Mark important'}</button><button data-m="smaller">${t.steps.length ? 'Redo the steps' : 'Make it smaller'}</button><button data-m="tomorrow">Move to tomorrow</button><button data-m="someday">Move to Someday</button><button data-m="delete" class="dz">Delete</button>`;
  const r = btn.getBoundingClientRect(), s = $('#sheet').getBoundingClientRect(); const top = r.bottom - s.top + 4; m.style.top = Math.min(top, s.height - 290) + 'px'; $('#sheet').appendChild(m);
  m.onclick = ev => { const a = ev.target.dataset.m; if (!a) return; closeMenu();
    if (a === 'focus') focusTask(t, 'You picked');
    if (a === 'high'){ t.high = !t.high; save(); render(); }
    if (a === 'smaller'){ focusTask(t, 'You picked'); panel = 'smaller'; render(); }
    if (a === 'tomorrow'){ t.when = tomorrow(); if (focusId === t.id) focusId = null; save(); render(); snack(`Moved "${t.t}" to tomorrow`, () => { t.when = 'today'; }); }
    if (a === 'someday'){ t.when = 'someday'; t.carry = 0; if (focusId === t.id) focusId = null; save(); render(); bus.emit('task_someday', t); snack(`Saved "${t.t}" for later`, () => { t.when = 'today'; }); }
    if (a === 'delete') removeTask(t); };
  setTimeout(() => addEventListener('click', closeMenuOutside, { once:true }), 0); }
function closeMenu(){ $('#menu')?.remove(); }
function closeMenuOutside(e){ if (!e.target.closest('#menu')) closeMenu(); }
$('#tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (!b) return; if (b.dataset.tab === 'rex'){ setExpanded(true); return; } tab = b.dataset.tab; panel = null; render(); $('#scroll').scrollTop = 0; };
$('#snack button').onclick = doUndo;

/* swipe to complete or delete, long-press to reorder */
(function gestures(){
  let g = null;
  $('#scroll').addEventListener('pointerdown', e => { const row = e.target.closest('.task'); if (!row || e.target.closest('button') || !row.closest('#list')) return;
    const wrap = row.parentNode; g = { row, wrap, x:e.clientX, y:e.clientY, dx:0, mode:null, id:+row.dataset.row, pid:e.pointerId };
    g.lp = setTimeout(() => { if (!g || g.mode) return; g.mode = 'drag'; row.classList.add('lift'); buzz(8); try { row.setPointerCapture(g.pid); } catch(_){} }, 340); });
  addEventListener('pointermove', e => { if (!g) return; const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.mode){ if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)){ g.mode = 'swipe'; clearTimeout(g.lp); try { g.row.setPointerCapture(g.pid); } catch(_){} } else if (Math.abs(dy) > 10){ clearTimeout(g.lp); g = null; return; } }
    if (g.mode === 'swipe'){ g.dx = Math.max(-110, Math.min(140, dx)); g.row.style.transform = `translateX(${g.dx}px)`; g.wrap.classList.toggle('swr', g.dx > 70); }
    if (g.mode === 'drag'){ e.preventDefault(); g.row.style.transform = `translateY(${dy}px) scale(1.02)`; const rows = [...$('#list').querySelectorAll('.trow')];
      const midY = g.row.getBoundingClientRect().top + g.row.offsetHeight/2; rows.forEach(r => r.classList.remove('dropa','dropb'));
      const target = rows.find(r => r !== g.wrap && midY < r.getBoundingClientRect().top + r.offsetHeight/2); g.before = target ? +target.dataset.id : null; if (target) target.classList.add('dropa'); } }, { passive:false });
  addEventListener('pointerup', () => { if (!g) return; clearTimeout(g.lp); const { row, wrap, mode, dx, id } = g; g = null;
    if (mode === 'swipe'){ wrap.classList.remove('swr'); if (dx > 70){ row.style.transform = 'translateX(110%)'; setTimeout(() => toggle(byId(id)), 160); } else if (dx < -60){ row.style.transform = 'translateX(-96px)'; wrap.classList.add('open'); } else { row.style.transform = ''; wrap.classList.remove('open'); } }
    else if (mode === 'drag'){ const list = openToday().filter(t => t.id !== id), me = byId(id); const i = g === null && arguments ? (list.findIndex(t => t.id === (window._before ?? -1))) : -1; }
    if (mode === 'drag'){ row.classList.remove('lift'); row.style.transform = ''; const before = dragBefore(); const list = openToday().filter(t => t.id !== id); let idx = before == null ? list.length : list.findIndex(t => t.id === before); if (idx < 0) idx = list.length; list.splice(idx, 0, byId(id)); list.forEach((t, k) => t.order = k + 1); S.planDay = today(); save(); render(); SFX.pop(); }
  });
  function dragBefore(){ const el = $('#list .dropa'); return el ? +el.dataset.id : null; }
})();

/* keyboard */
document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea';
  if (e.key === 'Escape'){ closeOverlay(); closeMenu(); if (app.classList.contains('expanded')) setExpanded(false); panel = null; picking = false; return; }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing){ e.preventDefault(); doUndo(); return; }
  if (typing){ if (e.key === 'ArrowDown' && e.target.id === 'addInput'){ e.preventDefault(); kbIndex = 0; focusRow(); } return; }
  if (app.querySelector('.ov')) return;
  const rows = [...document.querySelectorAll('#list .task')];
  if (e.key === 'n' || e.key === '/'){ e.preventDefault(); tab = 'today'; render(); $('#addInput').focus(); return; }
  if (e.key === 'r'){ roar(); return; }
  if (e.key === 'z'){ setExpanded(!app.classList.contains('expanded')); return; }
  const cur = document.activeElement && document.activeElement.closest && document.activeElement.closest('#list .task'); if (cur) kbIndex = rows.indexOf(cur);
  if (e.key === 'ArrowDown' || e.key === 'j'){ e.preventDefault(); kbIndex = Math.min(rows.length - 1, kbIndex + 1); focusRow(); }
  else if (e.key === 'ArrowUp' || e.key === 'k'){ e.preventDefault(); if (kbIndex <= 0){ $('#addInput') && $('#addInput').focus(); kbIndex = -1; } else { kbIndex--; focusRow(); } }
  else if (cur){ const t = byId(+cur.dataset.row);
    if (e.key === ' '){ e.preventDefault(); toggle(t); setTimeout(focusRow, 50); }
    else if (e.key === 'Enter'){ focusTask(t, 'You picked'); }
    else if (e.key === 's'){ startSession(t); }
    else if (e.key === 'Delete' || e.key === 'Backspace'){ removeTask(t); setTimeout(focusRow, 50); } }
});
function focusRow(){ const rows = [...document.querySelectorAll('#list .task')]; if (!rows.length) return; kbIndex = Math.max(0, Math.min(rows.length - 1, kbIndex)); rows[kbIndex].focus(); }

/* ---------- Rex keeps an eye on the day ---------- */
function checkStall(force){
  if (!force && (S.asleep || session || document.hidden || Date.now() - lastTaskAct < 3*60e3 || Date.now() - lastStall < 10*60e3)) return;
  const p = pickThree()[0]; if (!p) return; lastStall = Date.now();
  rex.hop = 1; rex.say(`Maybe this one? "${p.t}"`, 7000, [['Let\'s do it', () => { focusTask(p, 'Rex suggested'); startSession(p); }], ['Show me', () => focusTask(p, 'Rex suggested')], ['Not now', () => { lastStall = Date.now(); }, true]]); }
setInterval(() => checkStall(false), 30000);
setInterval(() => { if (S.asleep) return;
  for (const t of openToday()){ if (t.startAt && t.startAt.at && !t.nudged && Date.now() >= t.startAt.at){ t.nudged = true; save();
    rex.hop = 1; rex.say(`It's ${t.startAt.label}. Time for "${t.t}"${t.startAt.place ? ', ' + t.startAt.place.toLowerCase() : ''}.`, 9000, [['Start with Rex', () => startSession(t)], ['Later', () => { t.startAt.at = Date.now() + 30*60e3; t.startAt.label = 'in a bit'; t.nudged = false; save(); render(); }, true]]); render(); break; } } }, 20000);
function hm(str){ const [h, m] = str.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime(); }
setInterval(() => { if (S.asleep || session) return; const now = Date.now(), h = new Date().getHours(), H = S.habits;
  if (H.lunch && S.lunchDay !== today() && now >= hm(H.lunchAt||'12:30') && h < 16 && !(S.lunchSnooze > now)){ S.lunchDay = today(); save(); feed();
    setTimeout(() => rex.say('Lunch time. Eat with me?', 6000, [['Okay', () => { rex.hop = 1; }], ['Later', () => { S.lunchDay = null; S.lunchSnooze = Date.now() + 30*60e3; save(); }, true]]), 3200); return; }
  if (H.plants && S.plantDay !== today() && h >= 10 && h < 18){ S.plantDay = today(); save(); rex.say('Watered my plant. Got any of your own?', 5000, [['Watered mine', () => { rex.hop = 1; }], ['Not now', null, true]]); return; }
  if (H.walk && S.walkDay !== today() && h >= 15 && h < 19){ S.walkDay = today(); save(); rex.goTo(rex.x < .5 ? .85 : .15); rex.say('Going for a little walk. Come with me?', 5000, [['Let\'s go', () => { rex.hop = 1; rex.say('Fresh air!', 1500); }], ['Not now', null, true]]); return; }
  if (H.winddown && S.windDay !== today() && h >= 21){ S.windDay = today(); save(); rex.say('Getting sleepy. Wrap up soon?', 6000, [['Wrap up', () => wrapUp(true)], ['Not yet', null, true]]); return; }
  if (S.wrapDay !== today() && h >= 19 && openToday().length && !nudges.some(n => n.k === 'wrap')) wrapUp(false);
}, 30000);
setInterval(() => { if (!document.hidden){ S.lastOpen = Date.now(); if (rollover()){ render(); morning(); } save(); } }, 60000);

/* ---------- Rex listens to the day (sometimes, never every time) ---------- */
bus.on('task_added', t => { if (S.asleep) return; if (isBig(t) && !t.steps.length){ rex.say('That one sounds big. Want to make it smaller?', 6000, [['Make it smaller', () => { focusTask(t, 'You picked'); panel = 'smaller'; render(); }], ['It\'s fine', null, true]]); return; }
  if (talk(.5)){ rex.hop = 1; rex.say(pick(['Got it.','On the list!','Okay!','Noted!']), 1300); } });
bus.on('task_done', t => { if (S.asleep) return;
  const frog = S.frogDay === today() && S.frogId === t.id;
  if (frog){ snow = 0; setTimeout(() => { rex.hop = 1; rex.say('That was the frog. The rest of today is downhill.', 3000); }, 500); return; }
  if (t.eff === 'e'){ snow++; if (snow === 2){ setTimeout(() => rex.say('Two easy ones down. It\'s rolling now.', 2400), 500); return; } if (snow === 3){ setTimeout(() => rex.say('Three in a row. Keep the snowball going.', 2400), 500); return; } } else snow = 0;
  if (isBig(t) || t.steps.length >= 3){ rex.shake = 1; rex.sq = .12; rex.say(pick(['RAWR! That was a big one!','That was a big one!']), 2200); return; }
  if (talk(.6)){ rex.hop = 1; const b = rexBox(); heart(b.x, b.y + 10); rex.say(pick(['Nice!','You did it.','One less thing!','Yay!']), 1400); } });
bus.on('task_someday', () => { rex.say('Saved it for later.', 1500); });
bus.on('task_deleted', () => { if (talk(.35)) rex.say('Bye-bye, task.', 1200); });

function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 1900); }
function setExpandedIf(on){ if (app.classList.contains('expanded') !== on) setExpanded(on); }
