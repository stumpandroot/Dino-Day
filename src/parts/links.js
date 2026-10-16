/* ================= links on tasks, and "ask AI" =================
   A task can carry links: a Claude or ChatGPT chat, a Google Doc, a Gmail draft, any website. They show as chips on the task
   and on the Up next card; tapping one opens it (on iPhone, Claude and ChatGPT links open in their apps when installed).
   Paste a link while adding a task and it becomes a link. "Ask Claude" and "Ask ChatGPT" start a new chat about the task. */
const L_IC = {
  claude:'<svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M12 2.5l1.6 6.2 5.9-2.6-4.1 5 5.2 3-6.3.2 1.5 6.2-3.8-5.1-3.8 5.1 1.5-6.2-6.3-.2 5.2-3-4.1-5 5.9 2.6z"/></svg>',
  gpt:'<svg viewBox="0 0 24 24" width="13" height="13"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  mail:'<svg viewBox="0 0 24 24" width="13" height="13"><rect x="3" y="5.5" width="18" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 7.5l8 6 8-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  doc:'<svg viewBox="0 0 24 24" width="13" height="13"><path d="M6 3h8l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 12h6M9 16h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  web:'<svg viewBox="0 0 24 24" width="13" height="13"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' };
function normUrl(s){ s = String(s || '').trim().replace(/[),.;!?]+$/, ''); if (!s) return null; if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
  try { const u = new URL(s); return /^(https?|mailto):$/.test(u.protocol) ? u.href : null; } catch(_){ return null; } }
function linkInfo(href){ let u; try { u = new URL(href); } catch(_){ return { name:'Link', ic:'web', k:'web' }; }
  const h = u.hostname.replace(/^www\./, ''), p = u.pathname;
  if (h === 'claude.ai') return { name: /\/project\//.test(p) ? 'Claude project' : /\/artifact|\/public\//.test(p) ? 'Claude artifact' : 'Claude chat', ic:'claude', k:'claude' };
  if (h === 'chatgpt.com' || h === 'chat.openai.com') return { name: /\/g\/|\/project/.test(p) ? 'ChatGPT project' : 'ChatGPT chat', ic:'gpt', k:'gpt' };
  if (u.protocol === 'mailto:' || h === 'mail.google.com' || /outlook\.(live|office)\.com/.test(h)) return { name:'Email', ic:'mail', k:'mail' };
  if (h === 'docs.google.com') return { name: /spreadsheets/.test(p) ? 'Google Sheet' : /presentation/.test(p) ? 'Google Slides' : /forms/.test(p) ? 'Google Form' : 'Google Doc', ic:'doc', k:'doc' };
  if (h === 'drive.google.com') return { name:'Drive file', ic:'doc', k:'doc' };
  if (/notion\.(so|site)$/.test(h)) return { name:'Notion', ic:'doc', k:'doc' };
  if (/dropbox\.com$/.test(h)) return { name:'Dropbox', ic:'doc', k:'doc' };
  if (/figma\.com$/.test(h)) return { name:'Figma', ic:'doc', k:'doc' };
  const base = h.split('.').slice(-2, -1)[0] || h; return { name: base.charAt(0).toUpperCase() + base.slice(1), ic:'web', k:'web' }; }
function linkChips(t, cls = ''){ const L = t.links || []; if (!L.length) return '';
  return `<span class="tlinks ${cls}">${L.map(x => { const i = linkInfo(x.u); return `<a class="lchip ${i.k}" href="${esc(x.u)}" target="_blank" rel="noopener noreferrer" title="${esc(x.u)}">${L_IC[i.ic]}${esc(x.l || i.name)}</a>`; }).join('')}</span>`; }
// pull links out of what you typed: "Send proposal https://claude.ai/chat/…" → task "Send proposal" with a Claude chat link
function splitLinks(text){ const links = []; const rest = text.replace(/\b((?:https?:\/\/|www\.)[^\s<>"]+|(?:claude\.ai|chatgpt\.com|docs\.google\.com|mail\.google\.com)\/[^\s<>"]*)/gi, m => { const u = normUrl(m); if (u) { links.push({ u }); return ' '; } return m; });
  return { text: rest.replace(/\s{2,}/g, ' ').trim(), links }; }
function aiPrompt(t){ const steps = (t.steps || []).filter(s => !s.done).map(s => '- ' + s.t).join('\n');
  return `Help me get this done: ${t.t}` + (steps ? `\n\nSteps I have so far:\n${steps}` : '') + `\n\nAsk me anything you need, then help me finish it.`; }
const AI_URL = { claude: q => 'https://claude.ai/new?q=' + encodeURIComponent(q), gpt: q => 'https://chatgpt.com/?q=' + encodeURIComponent(q) };
function linksRowHTML(t){ const L = t.links || [];
  return `<div class="drow"><span class="dl">Links</span><div class="dchips">${L.map((x, i) => { const n = linkInfo(x.u); return `<span class="dlink"><a class="lchip ${n.k}" href="${esc(x.u)}" target="_blank" rel="noopener noreferrer" title="${esc(x.u)}">${L_IC[n.ic]}${esc(x.l || n.name)}</a><button type="button" class="dx2" data-dlinkdel="${i}" aria-label="Remove link">×</button></span>`; }).join('')}
      <span class="dlinkadd"><input type="url" inputmode="url" id="dLinkIn" placeholder="Paste a link: chat, doc, email…" aria-label="Add a link" autocomplete="off"><button type="button" class="dchip" data-dlinkadd>${IC.plus}Add</button></span></div></div>
    <div class="drow"><span class="dl">Ask AI</span><div class="dchips"><a class="dchip ai claude" href="${AI_URL.claude(aiPrompt(t))}" target="_blank" rel="noopener noreferrer">${L_IC.claude}Ask Claude</a><a class="dchip ai gpt" href="${AI_URL.gpt(aiPrompt(t))}" target="_blank" rel="noopener noreferrer">${L_IC.gpt}Ask ChatGPT</a><span class="dhint">Starts a new chat about this task. Paste that chat's link above to come back to it.</span></div></div>`; }
function addLinkFromInput(t){ const i = document.getElementById('dLinkIn'); if (!i) return; const u = normUrl(i.value); if (!u){ if (i.value.trim()) toast('That doesn’t look like a link'); return; }
  t.links = t.links || []; if (!t.links.some(x => x.u === u)) t.links.push({ u }); touch(); save(); render(); SFX.tick && SFX.tick(); toast(`Added ${linkInfo(u).name}`); }
$('#scroll').addEventListener('click', e => { const det = e.target.closest('.tdet'); if (!det) return; const t = byId(+det.dataset.det); if (!t) return; let el;
  if ((el = e.target.closest('[data-dlinkdel]'))){ e.stopImmediatePropagation(); t.links.splice(+el.dataset.dlinkdel, 1); touch(); save(); render(); return; }
  if (e.target.closest('[data-dlinkadd]')){ e.stopImmediatePropagation(); addLinkFromInput(t); return; }
  if (e.target.closest('a[href]')) e.stopImmediatePropagation(); }, true);
$('#scroll').addEventListener('keydown', e => { if (e.target.id === 'dLinkIn' && e.key === 'Enter'){ e.preventDefault(); const det = e.target.closest('.tdet'), t = det && byId(+det.dataset.det); if (t) addLinkFromInput(t); } });
// a pasted link in the detail panel adds itself
$('#scroll').addEventListener('paste', e => { if (e.target.id !== 'dLinkIn') return; setTimeout(() => { const det = e.target.closest('.tdet'), t = det && byId(+det.dataset.det); if (t && normUrl(e.target.value)) addLinkFromInput(t); }, 0); });
