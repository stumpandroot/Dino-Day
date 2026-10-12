/* ================= platform: account sync, the old app's data, native features, updates, Mac desk pet =================
   One account for the web, iPhone, and Mac. The save is one `saves` row per user in Supabase (project qwwvrvjdvfzfnkhmbdla).
   This app writes the save as { v:3, at, h, s:<state> }. The older Rex's Room app wrote { v:1, at, tasks, keeps, state, ... };
   this app reads that shape too and converts it, so devices that haven't updated yet still hand their tasks over. */
const ACCT = window.DINO_ACCOUNT || null, CLOUD_AT = 'dinoday.cloudAt', CLOUD_H = 'dinoday.cloudHash';
let sb = null, acctUser = null, acctChan = null, cloudTimer = 0, cloudBusy = false, cloudDirty = false, cloudState = 'local', cloudForce = false;
const LOCAL_ONLY = ['lastOpen', '_confirmReset', 'rexSpot', 'tlOpen'];   // per-device things that shouldn't sync
function syncState(){ const s = {}; for (const k in S) if (!LOCAL_ONLY.includes(k)) s[k] = S[k]; return s; }
function hashOf(s){ const j = JSON.stringify(s); let h = 5381; for (let i = 0; i < j.length; i++) h = ((h << 5) + h + j.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function paintSync(){ const el = document.getElementById('syncNote'); if (el) el.textContent = cloudState === 'synced' ? 'Saved to your account.' : cloudState === 'error' ? 'Couldn’t reach your account. Kept on this device.' : acctUser ? 'Saving…' : 'Saved on this device only.'; }
function cloudQueue(){ if (!acctUser) return; cloudDirty = true; clearTimeout(cloudTimer); cloudTimer = setTimeout(cloudFlush, 1500); }
async function cloudFlush(){
  if (!sb || !acctUser || cloudBusy || !cloudDirty) return; cloudBusy = true; cloudDirty = false;
  try { const s = syncState(), h = hashOf(s);
    if (h === localStorage.getItem(CLOUD_H) && !cloudForce){ cloudState = 'synced'; } else {
      cloudForce = false; const at = Date.now(), body = { v:3, at, h, s };
      const { error } = await sb.from('saves').upsert({ user_id:acctUser.id, body, at, updated_at:new Date().toISOString() }); if (error) throw error;
      try { localStorage.setItem(CLOUD_AT, String(at)); localStorage.setItem(CLOUD_H, h); } catch(_){} cloudState = 'synced'; } }
  catch(e){ cloudDirty = true; cloudState = 'error'; }
  cloudBusy = false; paintSync(); if (cloudDirty) cloudQueue(); }
// the older app's save -> this app's state
function fromOld(o){ const out = {}; const st = o.state || {};
  if (Array.isArray(o.tasks)) out.tasks = o.tasks.filter(t => t && t.t).map((t, i) => ({ id:t.id || i + 1, t:t.t, done:!!t.done, when:t.when || 'today', repeat:t.repeat || '', dow:t.dow,
    high:!!(t.high || t.imp), carry:t.carry || 0, startAt:t.startAt || null, est:t.est || null, eff:t.eff, cat:t.cat || 'self', order:i + 1, doneAt:t.doneAt || null,
    steps:(t.steps || []).map(s => typeof s === 'string' ? { t:s, done:false } : { t:s.t, done:!!s.done }) }));
  if (Array.isArray(o.keeps)) out.keeps = o.keeps.map(k => typeof k === 'object' ? k : { k, day:st.keptDay || new Date().toISOString().slice(0, 10) });
  if (st.habits) out.habits = Object.assign({}, S.habits, st.habits);
  for (const k of ['frogDay','frogId','waterDay','lunchDay','windDay','garden','bake']) if (st[k] != null) out[k] = st[k];
  if (Array.isArray(st.myHabits)) out.myHabits = st.myHabits.filter(h => h && (h.n || h.name)).map(h => ({ id:h.id || Date.now(), n:String(h.n || h.name).slice(0, 40), log:h.log || {} }));
  if (st.habitsOn != null) out.habitsOn = !!st.habitsOn; else if (out.myHabits && out.myHabits.length) out.habitsOn = true;
  if (Array.isArray(o.projects) && o.projects.length) out.legacyProjects = o.projects;   // Pro projects: kept so nothing is lost
  out.onboarded = true; out.importedOld = Date.now(); return out; }
// Rex's Room on the web kept its save in the artifact's database (data/users/<uid>/save). Bring it over once.
(async function artImport(){
  if (window.IS_APP || !window.claude || !claude.use) return;
  try { if (localStorage.getItem('dinoday.artImport')) return;
    const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]); if (!db || !user) return;
    const uid = await user.id(); if (!uid) return;
    const snap = await db.doc('data/users/' + uid + '/save').get(); localStorage.setItem('dinoday.artImport', '1');
    if (!snap.exists) return; const d = snap.data(); if (!d || !Array.isArray(d.tasks) || !d.tasks.length) return;
    if (S.importedOld && (S.tasks || []).length) return;   // already brought over from this device's storage
    const o = fromOld(d); S = { ...S, ...o, habits:{ ...S.habits, ...(o.habits || {}) } }; S.tasks.forEach((t, i) => t.order = i + 1);
    save(); syncedRender(); toast('Brought over your tasks from Rex’s Room');
  } catch(e){} })();
// take a newer save; true when something changed
function applyBody(d){
  if (!d || !d.at) return false; const mine = +(localStorage.getItem(CLOUD_AT) || 0); if (!(d.at > mine + 1000)) return false;
  let s = null, old = false; if (d.v === 3 && d.s) s = d.s; else if (d.tasks){ s = fromOld(d); old = true; } if (!s) return false;
  try { localStorage.setItem(CLOUD_AT, String(d.at)); } catch(_){}
  if (!old && d.h && d.h === localStorage.getItem(CLOUD_H)) return false;
  const keep = {}; for (const k of LOCAL_ONLY) if (k in S) keep[k] = S[k];
  S = { ...S, ...s, ...keep, habits:{ ...S.habits, ...(s.habits || {}) } }; save0();
  if (d.h && !old) try { localStorage.setItem(CLOUD_H, d.h); } catch(_){}
  if (old){ cloudDirty = true; cloudForce = true; setTimeout(cloudFlush, 500); }   // rewrite the row in the new shape
  return true; }
function syncedRender(){ try { render(); drawScene(); paintPlaybar(); } catch(_){} }
async function acctPull(){ if (!sb || !acctUser) return false;
  try { const { data } = await sb.from('saves').select('body').eq('user_id', acctUser.id).maybeSingle(); const d = data && data.body;
    if (!d){ cloudDirty = true; cloudForce = true; cloudFlush(); return false; }
    if (applyBody(d)){ syncedRender(); toast('Synced from your account'); return true; }
    if (+(localStorage.getItem(CLOUD_AT) || 0) > d.at + 1000 || hashOf(syncState()) !== localStorage.getItem(CLOUD_H)){ cloudDirty = true; cloudFlush(); }
    return false; } catch(_){ cloudState = 'error'; paintSync(); return false; } }
async function acctAttach(){
  cloudState = 'synced'; paintSync(); await acctPull();
  if (acctChan) try { sb.removeChannel(acctChan); } catch(_){}
  acctChan = sb.channel('saves-' + acctUser.id).on('postgres_changes', { event:'*', schema:'public', table:'saves', filter:'user_id=eq.' + acctUser.id },
    p => { const d = p.new && p.new.body; if (d && applyBody(d)) syncedRender(); }).subscribe(); }
function acctDetach(){ if (acctChan) try { sb.removeChannel(acctChan); } catch(_){} acctChan = null; cloudState = 'local'; paintSync(); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && acctUser) acctPull(); });
(async function acctInit(){
  if (!ACCT || !ACCT.url || !ACCT.anonKey || !window.supabase) return;
  try { sb = supabase.createClient(ACCT.url, ACCT.anonKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } }); } catch(_){ sb = null; return; }
  const { data } = await sb.auth.getSession(); acctUser = data && data.session ? data.session.user : null; if (tab === 'settings') render();
  if (acctUser) await acctAttach();
  sb.auth.onAuthStateChange(async (ev, session) => { const u = session ? session.user : null, was = acctUser && acctUser.id; acctUser = u; if (tab === 'settings') render();
    if (u && u.id !== was) await acctAttach(); if (!u && was) acctDetach(); });
})();
const save0 = save;
save = function(){ save0(); cloudQueue(); notesQueue(); deskPlanSoon(); };
function openAcct(){
  const o = overlay(`<div class="card sheetcard"><div class="sh"><h2>Sign in</h2><button class="x" data-x aria-label="Close">×</button></div>
    <p class="hint">One account for your iPhone, Mac, and the web. Use the same email and password you use in the Dino Day app.</p>
    <form id="acctForm" class="acctf"><label>Email<input id="acctEmail" type="email" autocomplete="email" required></label>
    <label>Password<input id="acctPw" type="password" autocomplete="current-password" minlength="6" required></label>
    <p class="hint" id="acctErr" role="alert"></p>
    <div class="acctb"><button class="pill coral big" type="submit">Sign in</button><button class="link" type="button" id="acctUp">Create an account</button></div></form></div>`);
  o.querySelector('[data-x]').onclick = closeOverlay; setTimeout(() => o.querySelector('#acctEmail').focus(), 60);
  const go = async (mode) => { const email = o.querySelector('#acctEmail').value.trim(), pw = o.querySelector('#acctPw').value, err = o.querySelector('#acctErr'); err.textContent = '';
    if (!email || pw.length < 6){ err.textContent = 'Enter your email and a password of at least 6 characters.'; return; }
    o.querySelectorAll('button').forEach(b => b.disabled = true);
    try { const r = mode === 'up' ? await sb.auth.signUp({ email, password:pw }) : await sb.auth.signInWithPassword({ email, password:pw }); if (r.error) throw r.error;
      if (mode === 'up' && r.data && !r.data.session) err.textContent = 'Check your email to confirm, then sign in.'; else { closeOverlay(); toast('Signed in. Syncing…'); } }
    catch(e){ err.textContent = (e && e.message) || 'That didn’t work.'; }
    o.querySelectorAll('button').forEach(b => b.disabled = false); };
  o.querySelector('#acctForm').onsubmit = e => { e.preventDefault(); go('in'); }; o.querySelector('#acctUp').onclick = () => go('up'); }
function accountRows(){
  const acct = sb ? `<div class="row"><div><div class="lab">Account</div><div class="hint">${acctUser ? `Signed in as ${esc(acctUser.email)}. Your tasks follow you to every device.` : 'Sign in to keep your tasks in step on your iPhone, Mac, and the web.'}</div></div><button class="pill ghost mint" data-acct>${acctUser ? 'Sign out' : 'Sign in'}</button></div>` : '';
  const sync = `<div class="row"><div><div class="lab">Sync</div><div class="hint" id="syncNote">${cloudState === 'synced' ? 'Saved to your account.' : cloudState === 'error' ? 'Couldn’t reach your account. Kept on this device.' : 'Saved on this device only.'}</div></div></div>`;
  const upd = window.IS_APP ? `<div class="row"><div><div class="lab">Updates</div><div class="hint" id="updTxt">${updText()}</div></div><button class="pill ghost mint" data-upd>${updReady() ? 'Restart' : 'Check'}</button></div>` : '';
  return `<div class="glabel">Account</div><div class="group">${acct}${sync}${upd}</div>`; }
document.getElementById('scroll').addEventListener('click', async e => {
  if (e.target.closest('[data-acct]')){ if (!sb) return; if (acctUser){ await sb.auth.signOut(); toast('Signed out. Your tasks stay on this device.'); } else openAcct(); }
  const u = e.target.closest('[data-upd]'); if (u){ if (updReady()){ location.reload(); return; } u.disabled = true; const t = document.getElementById('updTxt'); if (t) t.textContent = 'Checking…'; LAST_UPD = await otaCheck(false); u.disabled = false; render(); if (LAST_UPD === 'none') toast('You’re up to date'); } });

/* ---------- over-the-air page updates (iPhone and Mac) ----------
   The bucket `app` holds index.html and version.json ({ v:<build>, packs:'rig1' }). A newer page downloads in the background and
   replaces this one the next time the app opens. `packs` changes only when the native shell has to be reinstalled. */
const OTA_BASE = ACCT && ACCT.url ? ACCT.url + '/storage/v1/object/public/app/' : null;
let LAST_UPD = '';
const updReady = () => { try { const o = JSON.parse(localStorage.getItem('dinoday.ota') || 'null'); return !!(o && o.v > (window.DINO_BUILD || 0)); } catch(_){ return false; } };
function updText(){ const b = new Date((window.DINO_BUILD || 0)*1000).toLocaleString([], { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
  return updReady() ? 'A new version is downloaded. Restart to use it.' : (LAST_UPD === 'big' ? 'A bigger update is out. It needs a fresh install. ' : LAST_UPD === 'error' ? 'Couldn’t reach the update server. ' : LAST_UPD === 'none' ? 'You’re on the newest version. ' : '') + 'Build from ' + b + '.'; }
async function otaCheck(quiet){
  if (!window.IS_APP || !OTA_BASE) return 'web';
  try { const r = await fetch(OTA_BASE + 'version.json?t=' + Date.now(), { cache:'no-store' }); if (!r.ok) return 'error'; const v = await r.json(), cur = window.DINO_BUILD || 0;
    if (updReady()) return 'ready'; if (!(v.v > cur)) return 'none';
    if (v.packs !== window.DINO_PACKV) return 'big';
    const h = await fetch(OTA_BASE + 'index.html?t=' + Date.now(), { cache:'no-store' }); if (!h.ok) return 'error'; const html = await h.text(); if (!/<\/html>\s*$/i.test(html.trim())) return 'error';
    localStorage.setItem('dinoday.ota', JSON.stringify({ v:v.v, packs:v.packs, html })); if (quiet) toast('Update ready. It arrives next time you open the app.'); return 'ready'; }
  catch(_){ return 'error'; } }
setTimeout(() => otaCheck(true).then(s => { LAST_UPD = s; }), 8000);

/* ---------- native features (iPhone through Capacitor) ---------- */
const NATIVE = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
const NP = n => { try { return NATIVE ? Capacitor.registerPlugin(n) : null; } catch(_){ return null; } };
const HapticsP = NP('Haptics'), NotesP = NP('LocalNotifications'), AppP = NP('App');
if (NATIVE) document.documentElement.classList.add('native', Capacitor.getPlatform());
if (NATIVE && HapticsP) buzz = function(p){ try { const big = Array.isArray(p) ? Math.max(...p) : p; if (Array.isArray(p) && p.length > 2) HapticsP.notification({ type:'SUCCESS' }); else HapticsP.impact({ style:big >= 40 ? 'MEDIUM' : 'LIGHT' }); } catch(_){} };
let notesOK = false, notesTimer = 0;
function notesQueue(){ if (!NATIVE || !NotesP || !notesOK) return; clearTimeout(notesTimer); notesTimer = setTimeout(notesPlan, 2000); }
async function notesPlan(){
  if (!NATIVE || !NotesP || !notesOK) return;
  try { const pend = await NotesP.getPending(); if (pend && pend.notifications && pend.notifications.length) await NotesP.cancel({ notifications:pend.notifications.map(n => ({ id:n.id })) }); } catch(_){}
  const list = [], now = Date.now(), H = S.habits || {}, daily = (id, hh, mm, title, body) => list.push({ id, title, body, schedule:{ on:{ hour:hh, minute:mm }, repeats:true, allowWhileIdle:true } });
  if (H.water) daily(1, 9, 30, 'Rex is having some water', 'Want one too?');
  if (H.lunch){ const [h, m] = (H.lunchAt || '12:30').split(':').map(Number); daily(2, h, m, 'Lunch time', 'Rex is eating. Come join him.'); }
  if (H.winddown) daily(3, 21, 0, 'Rex is getting sleepy', 'Wrap up the day when you’re ready.');
  for (const t of S.tasks){ if (t.done || !t.startAt || !t.startAt.at || t.startAt.at < now + 20000) continue;
    list.push({ id:1000 + (t.id % 100000), title:'It’s time', body:t.t, schedule:{ at:new Date(t.startAt.at), allowWhileIdle:true }, extra:{ taskId:t.id } }); }
  if (list.length) try { await NotesP.schedule({ notifications:list }); } catch(_){} }
if (NATIVE && NotesP){
  (async () => { try { let p = await NotesP.checkPermissions(); if (p.display === 'prompt') p = await NotesP.requestPermissions(); notesOK = p.display === 'granted'; if (notesOK) notesPlan(); } catch(_){} })();
  try { NotesP.addListener('localNotificationActionPerformed', ev => { const id = ev && ev.notification && ev.notification.extra && ev.notification.extra.taskId; const t = id != null && S.tasks.find(q => q.id === id && !q.done); if (t) focusTask(t, 'From your reminder'); }); } catch(_){}
}
if (NATIVE && AppP) try { AppP.addListener('appStateChange', s => { if (s.isActive && acctUser) acctPull(); }); } catch(_){}

/* ---------- Mac: the desk pet and reminders ---------- */
let deskPlanSoon = () => {};
if (window.desk && window.desk.isDesk){
  const D = window.desk;
  const btn = document.createElement('button'); btn.className = 'deskbtn'; btn.title = 'Shrink Rex to your desk (⌘⇧D)'; btn.setAttribute('aria-label', 'Shrink Rex to your desk');
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M10 14l-6 6M14 10l6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  btn.onclick = () => D.shrink(); document.querySelector('.chips-r').prepend(btn);
  const deskState = () => { const n = pickThree()[0]; D.state({ next:n ? { id:n.id, t:n.t, label:S.frogDay === today() && S.frogId === n.id ? 'Today’s frog' : 'Up next' } : null,
    asleep:!!S.asleep, open:S.tasks.filter(t => t.when === 'today' && !t.done).length, phase:phase() }); };
  const _render = render; render = function(){ _render(); try { deskState(); } catch(_){} };
  D.onWantState(() => { try { deskState(); } catch(_){} });
  D.onToggle(id => { const t = S.tasks.find(q => q.id === id && !q.done); if (t) toggle(t); });
  let timers = [];
  const atT = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime(); };
  const remind = (when, title, body, opts) => { const ms = when - Date.now(); if (ms < 1000 || ms > 36e5*26) return; timers.push(setTimeout(() => { D.notify(title, body); D.say(body, Object.assign({ label:title }, opts || {})); }, ms)); };
  const plan = () => { timers.forEach(clearTimeout); timers = []; const H = S.habits || {}, tk = today();
    if (H.water && S.waterDay !== tk) remind(atT(9, 30), 'Rex is having some water', 'Want one too?');
    if (H.lunch && S.lunchDay !== tk){ const [h, m] = (H.lunchAt || '12:30').split(':').map(Number); remind(atT(h, m), 'Lunch time', 'Rex is eating. Come join him.'); }
    if (H.stretch) remind(atT(15, 0), 'Stretch break', 'Rex is stretching. Thirty seconds, then back to it.');
    if (H.winddown && S.windDay !== tk) remind(atT(21, 0), 'Rex is getting sleepy', 'Wrap up the day when you’re ready.');
    for (const t of S.tasks){ if (!t.done && t.startAt && t.startAt.at) remind(t.startAt.at, 'It’s time', t.t, { taskId:t.id, ms:60000 }); } };
  let pt = 0; deskPlanSoon = () => { clearTimeout(pt); pt = setTimeout(plan, 2000); };
  plan(); setInterval(plan, 36e5); setInterval(() => { try { deskState(); } catch(_){} }, 30000); setTimeout(deskState, 1500);
}
