// Browser side of the first-party analytics (see /api/track). Everything is
// fire-and-forget: tracking must never slow a page or throw.

type Payload = { n: string; p: string; ms?: number; m?: string; r?: string; u?: string };

function send(body: Payload) {
  try {
    const json = JSON.stringify(body);
    const ok = navigator.sendBeacon?.("/api/track", new Blob([json], { type: "application/json" }));
    if (!ok) fetch("/api/track", { method: "POST", body: json, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  } catch { /* blocked or unsupported */ }
}

/** An event on the current page, e.g. trackEvent("download", "montserrat"). */
export function trackEvent(name: string, meta?: string) {
  send({ n: name, p: location.pathname, ...(meta ? { m: meta } : {}) });
}

/* ---- page views + engaged time ---- */
let curPath = "";
let acc = 0; // visible milliseconds on the current page not yet reported
let since: number | null = null;

function resume() {
  if (since === null && document.visibilityState === "visible") since = Date.now();
}
function pause() {
  if (since !== null) { acc += Date.now() - since; since = null; }
}
function flush() {
  pause();
  const ms = Math.min(acc, 30 * 60 * 1000);
  acc = 0;
  if (curPath && ms >= 500) send({ n: "leave", p: curPath, ms });
}

let entered = false;
function isFirstOfVisit(): boolean {
  if (entered) return false;
  entered = true;
  try {
    if (sessionStorage.getItem("fk_v")) return false;
    sessionStorage.setItem("fk_v", "1");
  } catch { /* storage blocked: treat every full page load as a new visit */ }
  return true;
}

/** Call on every route change. */
export function trackPageView(path: string) {
  flush();
  curPath = path;
  resume();
  const body: Payload = { n: "view", p: path };
  if (isFirstOfVisit()) {
    // Only the first page of a visit carries where the visitor came from.
    if (document.referrer) body.r = document.referrer;
    const utm = new URLSearchParams(location.search).get("utm_source");
    if (utm) body.u = utm;
    if (!body.r && !body.u) body.r = ""; // marks "entry page" even when there is no referrer
  }
  send(body);
}

let wired = false;
export function wireVisibility() {
  if (wired) return;
  wired = true;
  document.addEventListener("visibilitychange", () => (document.visibilityState === "hidden" ? flush() : resume()));
  addEventListener("pagehide", flush);
}
