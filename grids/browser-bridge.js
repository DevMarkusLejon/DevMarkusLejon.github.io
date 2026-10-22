(() => {
  "use strict";
  const sessionId = crypto.randomUUID();
  const workerUrl = new URL("browser-worker.mjs", document.currentScript.src);
  workerUrl.search = new URL(document.currentScript.src).search;
  let worker;
  let matchId;
  let lastSave = null;
  let preferences = { speed: 1, sound: true };
  let savedAt = "";
  let storageWarning = "";
  let releaseLock;
  const storageKey = () => "grids.match.v1." + matchId;
  const pending = new Map();
  let sequence = 0;
  let fatalError = "";
  let note;

  async function claim(id) {
    if (!navigator.locks) return true;
    return new Promise((resolve) => {
      navigator.locks.request("grids-match-" + id, { ifAvailable: true }, async (lock) => {
        resolve(Boolean(lock));
        if (lock) await new Promise((release) => { releaseLock = release; });
      }).catch(() => resolve(false));
    });
  }

  async function fork() {
    releaseLock?.();
    matchId = crypto.randomUUID();
    try { sessionStorage.setItem("grids.matchId", matchId); }
    catch { storageWarning = "Webbläsaren blockerar sparning. Matchen kan inte återställas efter omladdning."; }
    await claim(matchId);
  }

  function persist() {
    if (!lastSave) return;
    try {
      const time = new Date().toISOString();
      localStorage.setItem(storageKey(), JSON.stringify({ match: lastSave, preferences, savedAt: time }));
      savedAt = time;
    } catch {
      storageWarning = "Kunde inte spara. Kontrollera webbläsarens lagring innan du laddar om.";
    }
  }

  const workerReady = (async () => {
    let stored;
    try {
      matchId = sessionStorage.getItem("grids.matchId") || crypto.randomUUID();
      sessionStorage.setItem("grids.matchId", matchId);
      const raw = localStorage.getItem(storageKey());
      if (raw) {
        stored = JSON.parse(raw);
        if (!stored || typeof stored !== "object" || !stored.match || typeof stored.match !== "object") throw new Error("Ogiltig sparfil");
      }
    } catch {
      storageWarning = "Den sparade matchen kunde inte läsas. En ny match startas; tidigare sparning behålls.";
      await fork();
    }
    // A duplicated tab may inherit sessionStorage. Fork its snapshot instead of
    // letting two workers write to the same saved match.
    const navigation = performance.getEntriesByType("navigation")[0];
    if ((!navigator.locks && stored && navigation?.type === "navigate") || !await claim(matchId)) await fork();
    if (stored?.preferences) {
      if ([0.5, 1, 2, 4].includes(stored.preferences.speed)) preferences.speed = stored.preferences.speed;
      if (typeof stored.preferences.sound === "boolean") preferences.sound = stored.preferences.sound;
    }
    savedAt = stored?.savedAt || "";
    worker = new Worker(workerUrl, { type: "module" });
    worker.onmessage = async ({ data }) => {
      if (data.type === "progress") return showProgress(data.text);
      if (data.type === "fatal") return fail(data.error);
      if (data.type === "ready") {
        note?.remove();
        note = null;
        return;
      }
      const callback = pending.get(data.id);
      if (!callback) return;
      pending.delete(data.id);
      if (data.restore_error) {
        await fork();
        storageWarning = "Sparfilen kunde inte återställas. En ny match startas; den gamla sparfilen behålls.";
      }
      if (data.save) {
        lastSave = data.save;
        persist(); // Commit before revealing the action or starting its animation.
      }
      const state = data.status === 200 ? data.body : data.body.state;
      if (state) {
        state.preferences = preferences;
        state.storage = { saved_at: savedAt, warning: storageWarning };
      }
      callback(data.status, JSON.stringify(data.body));
    };
    worker.onerror = (event) => fail(event.message);
    worker.postMessage({ type: "init", save: stored?.match ?? null });
    return worker;
  })();
  workerReady.catch((error) => fail(error.message));

  function showProgress(text, failed = false) {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", () => showProgress(text, failed), { once: true });
      return;
    }
    if (!note) {
      note = document.createElement("div");
      note.id = "match-loading";
      note.setAttribute("role", "status");
      Object.assign(note.style, {
        position: "fixed", zIndex: "10", left: "50%", top: "24px", transform: "translateX(-50%)",
        maxWidth: "calc(100% - 48px)", padding: "16px 24px", borderRadius: "12px",
        background: "#13232e", color: "#dce7e7", border: "1px solid #5e9a83",
        font: "16px/1.5 system-ui, sans-serif", textAlign: "center",
      });
      document.body.append(note);
    }
    note.replaceChildren(document.createTextNode(text));
    if (failed) {
      const retry = document.createElement("button");
      retry.textContent = "Ladda om och försök igen";
      retry.style.cssText = "display:block;margin:12px auto 0;padding:8px 16px;cursor:pointer";
      retry.onclick = () => location.reload();
      note.append(retry);
    }
  }

  function fail(message) {
    fatalError = "Spelet kunde inte laddas. Kontrollera anslutningen och försök igen.";
    console.error("Grids worker:", message);
    showProgress(fatalError, true);
    for (const callback of pending.values()) callback(503, JSON.stringify({ error: fatalError }));
    pending.clear();
  }

  window.GridsBridge = {
    sessionId,
    request(path, body, callback) {
      if (fatalError) {
        callback(503, JSON.stringify({ error: fatalError }));
        return;
      }
      const id = ++sequence;
      pending.set(id, callback);
      workerReady.then((activeWorker) => activeWorker.postMessage({ id, path, body })).catch(() => {});
    },
    setPreferences(body) {
      const value = JSON.parse(body);
      if ([0.5, 1, 2, 4].includes(value.speed)) preferences.speed = value.speed;
      if (typeof value.sound === "boolean") preferences.sound = value.sound;
      persist();
    },
  };
  window.addEventListener("pagehide", () => { worker?.terminate(); releaseLock?.(); }, { once: true });
  window.addEventListener("pageshow", (event) => { if (event.persisted) location.reload(); });
  showProgress("Förbereder ditt spel… Första starten kan ta en stund.");
})();
