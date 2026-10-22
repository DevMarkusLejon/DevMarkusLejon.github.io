import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs";

// Each page owns one worker and one Python match. No match state is shared.
async function initialize() {
  self.postMessage({ type: "progress", text: "Laddar spelmotorn…" });
  const python = await loadPyodide();
  self.postMessage({ type: "progress", text: "Förbereder AI:n och din egen match…" });
  await python.loadPackage("numpy");
  const response = await fetch(new URL("python-engine.zip", import.meta.url));
  if (!response.ok) throw new Error("Spelfilerna kunde inte hämtas.");
  python.unpackArchive(await response.arrayBuffer(), "zip", { extractDir: "/app" });
  python.FS.chdir("/app");
  python.globals.set("browser_seed", crypto.getRandomValues(new Uint32Array(1))[0]);
  python.runPython(`
import sys, json
sys.path.insert(0, "/app")
from grids_ai.browser_match import PrototypeMatch
browser_match = PrototypeMatch(seed=int(browser_seed))

def handle_browser_request(path, body):
    try:
        if path == "/api/action":
            browser_match.act(json.loads(body))
        elif path == "/api/ai-step":
            browser_match.ai_step(json.loads(body))
        elif path == "/api/reset":
            browser_match.reset()
        elif path != "/api/state":
            raise ValueError("Okänd spelhandling.")
        return json.dumps({"status": 200, "body": browser_match.state()}, ensure_ascii=False)
    except (ValueError, TypeError) as error:
        return json.dumps({"status": 400, "body": {"error": str(error), "state": browser_match.state()}}, ensure_ascii=False)
`);
  self.postMessage({ type: "ready" });
  return python.globals.get("handle_browser_request");
}

const ready = initialize();
ready.catch((error) => self.postMessage({ type: "fatal", error: error.message }));
let requests = Promise.resolve();
self.onmessage = ({ data }) => {
  // Keep resets and moves ordered even while Python is initially loading.
  requests = requests.then(async () => {
    try {
      const handle = await ready;
      const result = JSON.parse(handle(data.path, data.body));
      self.postMessage({ id: data.id, ...result });
    } catch (error) {
      self.postMessage({ id: data.id, status: 503, body: { error: error.message } });
    }
  });
};
