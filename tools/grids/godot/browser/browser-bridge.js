(() => {
  "use strict";
  const sessionId = crypto.randomUUID();
  const worker = new Worker(new URL("browser-worker.mjs", document.currentScript.src), { type: "module" });
  const pending = new Map();
  let sequence = 0;
  let fatalError = "";
  let note;

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
      worker.postMessage({ id, path, body });
    },
  };
  worker.onmessage = ({ data }) => {
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
    callback(data.status, JSON.stringify(data.body));
  };
  worker.onerror = (event) => fail(event.message);
  window.addEventListener("pagehide", () => worker.terminate(), { once: true });
  window.addEventListener("pageshow", (event) => { if (event.persisted) location.reload(); });
  showProgress("Förbereder ditt spel… Första starten kan ta en stund.");
})();
