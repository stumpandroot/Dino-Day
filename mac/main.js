const { app, BrowserWindow, protocol, net, shell, Menu, ipcMain, screen, Notification, Tray, nativeImage } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// The page fetches its image packs, which file:// pages are not allowed to do, so the app serves itself over app://
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

const WWW = path.join(__dirname, 'www');
function serve(){
  protocol.handle('app', (req) => {
    const u = new URL(req.url); let p = decodeURIComponent(u.pathname); if (p === '/' || p === '') p = '/index.html';
    const file = path.normalize(path.join(WWW, p)); if (!file.startsWith(WWW)) return new Response('', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

let main = null, pet = null, quitting = false, tray = null;
const PRELOAD = path.join(__dirname, 'preload.js');

function createMain(){
  main = new BrowserWindow({
    width: 1280, height: 820, minWidth: 380, minHeight: 600,   // wide windows get the desktop layout; narrow ones get the phone layout show: false,
    title: 'Dino Day', backgroundColor: '#f6efe2',
    webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true, spellcheck: false },
  });
  main.loadURL('app://dino/index.html');
  main.once('ready-to-show', () => main.show());
  main.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  main.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); shell.openExternal(url); } });
  // closing the window shrinks Rex to the desk instead of quitting, so reminders keep coming
  main.on('close', (e) => { if (quitting) return; e.preventDefault(); shrink(); });
}

// ---- the floating Rex ----
function createPet(){
  if (pet) return pet;
  const { workArea } = screen.getPrimaryDisplay();
  pet = new BrowserWindow({
    width: 300, height: 320, x: workArea.x + workArea.width - 330, y: workArea.y + workArea.height - 340,
    transparent: true, frame: false, alwaysOnTop: true, resizable: false, hasShadow: false, skipTaskbar: true,
    focusable: true, show: false, backgroundColor: '#00000000',
    webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true },
  });
  pet.setAlwaysOnTop(true, 'floating');
  pet.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  pet.loadURL('app://dino/pet.html');
  pet.on('closed', () => { pet = null; });
  return pet;
}
function shrink(){ createPet(); pet.show(); if (main) main.hide(); pet.webContents.send('pet:mode', 'desk'); if (main) main.webContents.send('desk:mode', 'desk'); }
function expand(){ if (!main || main.isDestroyed()) createMain(); else main.show(); main.focus(); if (pet) pet.hide(); if (main) main.webContents.send('desk:mode', 'app'); }

// drag: the pet asks the main process to follow the cursor, since a frameless transparent window has no title bar
let dragTimer = null, dragOff = null;
ipcMain.on('pet:dragStart', () => { if (!pet) return; const c = screen.getCursorScreenPoint(), [wx, wy] = pet.getPosition(); dragOff = { x: c.x - wx, y: c.y - wy };
  clearInterval(dragTimer); dragTimer = setInterval(() => { const p = screen.getCursorScreenPoint(); pet.setPosition(Math.round(p.x - dragOff.x), Math.round(p.y - dragOff.y)); }, 16); });
ipcMain.on('pet:dragEnd', () => { clearInterval(dragTimer); dragTimer = null; });
ipcMain.on('pet:open', () => expand());
ipcMain.on('desk:shrink', () => shrink());
ipcMain.on('desk:expand', () => expand());
// the app page keeps the pet informed: what's next, whether Rex is asleep
ipcMain.on('desk:state', (e, st) => { if (pet && !pet.isDestroyed()) pet.webContents.send('pet:state', st); });
ipcMain.on('desk:say', (e, text, opts) => { if (pet && !pet.isDestroyed()) pet.webContents.send('pet:say', text, opts || {}); });
// the pet ticks a task; the app page owns the data
ipcMain.on('pet:toggle', (e, id) => { if (main && !main.isDestroyed()) main.webContents.send('desk:toggle', id); });
ipcMain.on('pet:ready', () => { if (main && !main.isDestroyed()) main.webContents.send('desk:wantState'); });
// system notifications, clicking one opens the app
ipcMain.on('desk:notify', (e, title, body, tag) => { if (!Notification.isSupported()) return; const n = new Notification({ title, body, silent: false }); n.on('click', () => expand()); n.show(); });

app.whenReady().then(() => {
  serve();
  app.setName('Dino Day');
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Dino Day', submenu: [{ role: 'about' }, { type: 'separator' }, { label: 'Shrink to desk', accelerator: 'CmdOrCtrl+Shift+D', click: shrink }, { label: 'Open Dino Day', click: expand }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { label: 'Quit Dino Day', accelerator: 'CmdOrCtrl+Q', click: () => { quitting = true; app.quit(); } }] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }] },
  ]));
  try { const ic = nativeImage.createFromPath(path.join(__dirname, 'trayTemplate.png')); if (!ic.isEmpty()){ tray = new Tray(ic); tray.setToolTip('Dino Day');
    tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Open Dino Day', click: expand }, { label: 'Shrink to desk', click: shrink }, { type: 'separator' }, { label: 'Quit', click: () => { quitting = true; app.quit(); } }])); tray.on('click', expand); } } catch(_){}
  createMain(); createPet();
  app.on('activate', () => expand());
});
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => { /* stay alive for the pet and reminders */ });
