const { contextBridge, ipcRenderer } = require('electron');
// One small bridge for both windows. The app page uses the desk:* side; the pet page uses the pet:* side.
contextBridge.exposeInMainWorld('desk', {
  isDesk: true,
  shrink: () => ipcRenderer.send('desk:shrink'),
  expand: () => ipcRenderer.send('desk:expand'),
  notify: (title, body, tag) => ipcRenderer.send('desk:notify', title, body, tag),
  state: (st) => ipcRenderer.send('desk:state', st),
  say: (text, opts) => ipcRenderer.send('desk:say', text, opts),
  onToggle: (cb) => ipcRenderer.on('desk:toggle', (e, id) => cb(id)),
  onWantState: (cb) => ipcRenderer.on('desk:wantState', () => cb()),
  onMode: (cb) => ipcRenderer.on('desk:mode', (e, m) => cb(m)),
  // pet side
  pet: {
    ready: () => ipcRenderer.send('pet:ready'),
    open: () => ipcRenderer.send('pet:open'),
    menu: () => ipcRenderer.send('pet:menu'),
    dragStart: () => ipcRenderer.send('pet:dragStart'),
    dragEnd: () => ipcRenderer.send('pet:dragEnd'),
    toggle: (id) => ipcRenderer.send('pet:toggle', id),
    onState: (cb) => ipcRenderer.on('pet:state', (e, st) => cb(st)),
    onSay: (cb) => ipcRenderer.on('pet:say', (e, text, opts) => cb(text, opts)),
    onMode: (cb) => ipcRenderer.on('pet:mode', (e, m) => cb(m)),
  },
});
