// Detects when a newer version of the app has been published and reloads
// automatically, so no device keeps running stale code.
const CHECK_MS = 60_000;

function currentBundle(): string | null {
  const s = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]');
  return s ? new URL(s.src, location.origin).pathname : null;
}

async function latestBundle(): Promise<string | null> {
  const res = await fetch(`/?v=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/<script[^>]+type="module"[^>]+src="([^"]*\/assets\/[^"]+\.js)"/);
  return m ? new URL(m[1], location.origin).pathname : null;
}

function isBusy() {
  const el = document.activeElement as HTMLElement | null;
  const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
  const dialogOpen = !!document.querySelector('[role="dialog"], [role="alertdialog"]');
  return typing || dialogOpen;
}

export function startAutoUpdate() {
  const mine = currentBundle();
  if (!mine || import.meta.env.DEV) return;
  let pending = false;

  const check = async () => {
    try {
      if (!pending) {
        const latest = await latestBundle();
        if (latest && latest !== mine) pending = true;
      }
      if (pending && (!isBusy() || document.visibilityState === "hidden")) {
        location.reload();
      }
    } catch {
      /* offline — try again later */
    }
  };

  setInterval(check, CHECK_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
  window.addEventListener("online", check);
}
