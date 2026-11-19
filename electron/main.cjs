// Vaulty Link desktop shell: opens the official web app in a dedicated window.
const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const START_URL = "https://vaultylink.com/vault";
const ALLOWED = ["vaultylink.com", "www.vaultylink.com"];

function isInternal(url) {
  try { const u = new URL(url); return ALLOWED.includes(u.hostname) || u.pathname.startsWith("/~oauth"); } catch { return false; }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 380, minHeight: 600,
    backgroundColor: "#0b0f14", title: "Vaulty Link",
    icon: path.join(__dirname, "icon.png"), autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url) || /accounts\.google\.com|appleid\.apple\.com|checkout\.stripe\.com|billing\.stripe\.com/.test(url)) return { action: "allow" };
    shell.openExternal(url); return { action: "deny" };
  });
  win.loadURL(START_URL);
}

if (!app.requestSingleInstanceLock()) app.quit();
app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
