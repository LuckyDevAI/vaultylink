/**
 * Vaulty Link — popup logic
 * Multi-browser (Chrome/Edge/Brave/Opera/Arc/Firefox)
 */

// Cross-browser polyfill
const api = (typeof browser !== "undefined") ? browser : chrome;

const SUPABASE_URL = "https://ejeodmaptmgdfguierdn.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZW9kbWFwdG1nZGZndWllcmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1Nzg0NDEsImV4cCI6MjA4OTE1NDQ0MX0.w087HdkGHxr6qIN43f8JpGSJvwePsQwy6YE4XGycVhI";
const APP_URL = "https://vaultylink.com";

// ============ Storage helpers ============
const storage = {
  get: (keys) => new Promise((res) => api.storage.local.get(keys, res)),
  set: (obj) => new Promise((res) => api.storage.local.set(obj, res)),
  remove: (keys) => new Promise((res) => api.storage.local.remove(keys, res)),
};

// ============ Supabase REST helpers ============
async function sbLogin(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error_description || data.msg || "Login fallito");
  return data; // { access_token, refresh_token, user, expires_at }
}

async function sbRefresh(refresh_token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON },
    body: JSON.stringify({ refresh_token }),
  });
  if (!r.ok) return null;
  return r.json();
}

async function sbInsertQueue(session, payload) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/extension_queue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${session.access_token}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ ...payload, user_id: session.user.id }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Sync fallita (${r.status}): ${err}`);
  }
}

async function getValidSession() {
  const { session } = await storage.get("session");
  if (!session) return null;
  const exp = (session.expires_at || 0) * 1000;
  if (exp > Date.now() + 60_000) return session;
  // refresh
  const refreshed = await sbRefresh(session.refresh_token);
  if (!refreshed) {
    await storage.remove("session");
    return null;
  }
  await storage.set({ session: refreshed });
  return refreshed;
}

// ============ UI ============
const $ = (id) => document.getElementById(id);

async function getCurrentTab() {
  const tabs = await new Promise((res) => api.tabs.query({ active: true, currentWindow: true }, res));
  return tabs[0];
}

function renderTab(tab) {
  if (!tab || !tab.url || /^chrome|^edge|^about|^moz-extension/.test(tab.url)) {
    $("ct-title").textContent = "Pagina non salvabile";
    $("ct-url").textContent = "Apri una pagina web";
    $("save-btn").disabled = true;
    return;
  }
  $("ct-title").textContent = tab.title || tab.url;
  $("ct-url").textContent = tab.url;
  if (tab.favIconUrl) $("ct-favicon").src = tab.favIconUrl;
}

async function refreshQueue() {
  const { queue = [] } = await storage.get("queue");
  $("queue-count").textContent = queue.length;
  const section = $("queue-list-section");
  if (queue.length === 0) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  const list = $("queue-list");
  list.innerHTML = "";
  queue.slice(0, 8).forEach((item) => {
    const li = document.createElement("li");
    const img = document.createElement("img");
    img.src = item.favicon || "icon-48.png";
    img.onerror = () => (img.src = "icon-48.png");
    const span = document.createElement("span");
    span.className = "ttl";
    span.textContent = item.title || item.url;
    span.title = item.url;
    li.appendChild(img);
    li.appendChild(span);
    list.appendChild(li);
  });
}

async function renderAuthState() {
  const session = await getValidSession();
  const dot = $("status-dot");
  if (session) {
    $("login-form").hidden = true;
    $("logged-in").hidden = false;
    $("user-email").textContent = session.user?.email || "";
    $("auth-summary").textContent = "✓ Connesso · sync attivo";
    dot.classList.add("vl-dot--online");
    dot.classList.remove("vl-dot--offline");
    dot.title = "Connesso";
  } else {
    $("login-form").hidden = false;
    $("logged-in").hidden = true;
    $("auth-summary").textContent = "🔌 Connetti il tuo account (consigliato)";
    dot.classList.remove("vl-dot--online");
    dot.classList.add("vl-dot--offline");
    dot.title = "Solo locale";
  }
}

async function saveLink() {
  const btn = $("save-btn");
  const fb = $("save-feedback");
  btn.disabled = true;
  fb.textContent = "Salvataggio…";
  fb.className = "vl-feedback";
  try {
    const tab = await getCurrentTab();
    if (!tab?.url) throw new Error("Nessun tab attivo");
    const item = {
      url: tab.url,
      title: tab.title || tab.url,
      favicon: tab.favIconUrl || null,
      created_at: new Date().toISOString(),
    };

    // 1) salva sempre in coda locale
    const { queue = [] } = await storage.get("queue");
    queue.unshift(item);
    await storage.set({ queue: queue.slice(0, 200) });

    // 2) se loggato, push diretto a Supabase
    const session = await getValidSession();
    if (session) {
      try {
        await sbInsertQueue(session, {
          url: item.url, title: item.title, favicon: item.favicon, source: "extension",
        });
        fb.textContent = "✓ Salvato e sincronizzato col vault";
      } catch (e) {
        fb.textContent = "✓ Salvato in locale (sync fallita)";
      }
    } else {
      fb.textContent = "✓ Salvato in locale · accedi per sincronizzare";
    }
    fb.classList.add("is-success");
    await refreshQueue();
    updateBadge();
  } catch (e) {
    fb.textContent = "✗ " + (e.message || "Errore");
    fb.classList.add("is-error");
  } finally {
    setTimeout(() => { btn.disabled = false; }, 1200);
  }
}

async function updateBadge() {
  try {
    const { queue = [] } = await storage.get("queue");
    api.action.setBadgeText({ text: queue.length ? String(queue.length) : "" });
    api.action.setBadgeBackgroundColor({ color: "#0fa968" });
  } catch (_) {}
}

// ============ Event wiring ============
document.addEventListener("DOMContentLoaded", async () => {
  const tab = await getCurrentTab();
  renderTab(tab);
  await renderAuthState();
  await refreshQueue();

  $("save-btn").addEventListener("click", saveLink);

  $("open-app").addEventListener("click", () => {
    api.tabs.create({ url: APP_URL + "/vault" });
  });

  $("clear-queue").addEventListener("click", async () => {
    await storage.set({ queue: [] });
    await refreshQueue();
    updateBadge();
  });

  $("login-btn").addEventListener("click", async () => {
    const fb = $("login-feedback");
    fb.textContent = "Accesso in corso…";
    fb.className = "vl-feedback";
    try {
      const data = await sbLogin($("email").value.trim(), $("password").value);
      await storage.set({ session: data });
      fb.textContent = "✓ Connesso";
      fb.classList.add("is-success");
      await renderAuthState();
    } catch (e) {
      fb.textContent = "✗ " + e.message;
      fb.classList.add("is-error");
    }
  });

  $("logout-btn").addEventListener("click", async () => {
    await storage.remove("session");
    await renderAuthState();
  });
});
