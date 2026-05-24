/**
 * Vaulty Link — background service worker
 * Context menu "Salva in Vaulty Link" + badge updates
 */
const api = (typeof browser !== "undefined") ? browser : chrome;

const SUPABASE_URL = "https://ejeodmaptmgdfguierdn.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZW9kbWFwdG1nZGZndWllcmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1Nzg0NDEsImV4cCI6MjA4OTE1NDQ0MX0.w087HdkGHxr6qIN43f8JpGSJvwePsQwy6YE4XGycVhI";

const storage = {
  get: (keys) => new Promise((res) => api.storage.local.get(keys, res)),
  set: (obj) => new Promise((res) => api.storage.local.set(obj, res)),
};

async function getSession() {
  const { session } = await storage.get("session");
  if (!session) return null;
  const exp = (session.expires_at || 0) * 1000;
  if (exp > Date.now() + 60_000) return session;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!r.ok) return null;
    const refreshed = await r.json();
    await storage.set({ session: refreshed });
    return refreshed;
  } catch (_) {
    return null;
  }
}

async function pushToCloud(session, item) {
  await fetch(`${SUPABASE_URL}/rest/v1/extension_queue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${session.access_token}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      user_id: session.user.id,
      url: item.url,
      title: item.title,
      favicon: item.favicon,
      source: "extension-contextmenu",
    }),
  });
}

async function saveLink({ url, title, favicon }) {
  const item = { url, title: title || url, favicon: favicon || null, created_at: new Date().toISOString() };
  const { queue = [] } = await storage.get("queue");
  queue.unshift(item);
  await storage.set({ queue: queue.slice(0, 200) });

  const session = await getSession();
  if (session) {
    try { await pushToCloud(session, item); } catch (_) {}
  }
  updateBadge();
  notify(session ? "Link salvato e sincronizzato" : "Link salvato in locale");
}

async function updateBadge() {
  const { queue = [] } = await storage.get("queue");
  api.action.setBadgeText({ text: queue.length ? String(queue.length) : "" });
  api.action.setBadgeBackgroundColor({ color: "#0fa968" });
}

function notify(message) {
  try {
    api.notifications.create({
      type: "basic",
      iconUrl: "icon-128.png",
      title: "Vaulty Link",
      message,
    });
  } catch (_) {}
}

// ============ Context menus ============
api.runtime.onInstalled.addListener(() => {
  api.contextMenus.create({
    id: "vl-save-page",
    title: "💎 Salva questa pagina in Vaulty Link",
    contexts: ["page"],
  });
  api.contextMenus.create({
    id: "vl-save-link",
    title: "💎 Salva il link in Vaulty Link",
    contexts: ["link"],
  });
  updateBadge();
});

api.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "vl-save-page" && tab) {
    saveLink({ url: tab.url, title: tab.title, favicon: tab.favIconUrl });
  } else if (info.menuItemId === "vl-save-link") {
    saveLink({ url: info.linkUrl, title: info.linkUrl, favicon: null });
  }
});

api.runtime.onStartup?.addListener(updateBadge);
