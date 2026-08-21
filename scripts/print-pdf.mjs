// Export the comms map to a single-page, print-ready vector PDF via headless
// system Chrome over the DevTools Protocol (no puppeteer dependency — Node's
// native WebSocket drives CDP directly).
//
//   node scripts/print-pdf.mjs [url] [outfile]
//
// Defaults to the local dev server's ?print&dots view (floating chrome off,
// outbound lanes collapsed to their dot strips, student questions + the two
// inbound graphs visible). The page is measured under PRINT media, then
// printed at its own aspect ratio scaled to fit within MAX_W × MAX_H metres —
// the plotter's ceiling. Everything on the page is vector (text / shapes), so
// the result is resolution-independent (well beyond 300 DPI at any size).
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const URL = process.argv[2] ?? "http://localhost:5173/?print&dots";
const OUT = process.argv[3] ?? "exports/comms-map.pdf";
const MAX_W_M = 4.0; // plotter max width  (metres)
const MAX_H_M = 1.0; // plotter max height (metres)
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const IN_PER_M = 39.37007874;

// ── tiny CDP client over the raw websocket ────────────────────────────────
function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      for (const l of listeners) l(msg);
    }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener("open", res);
    ws.addEventListener("error", rej);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  return { ready, send, on: (fn) => listeners.push(fn), close: () => ws.close() };
}

async function evaluate(cdp, expression) {
  const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (result?.description ?? ""));
  return result.value;
}

async function main() {
  // 1. Launch headless Chrome with a debugging port.
  const chrome = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--force-device-scale-factor=1",
    "--window-size=1680,1000",
    "about:blank",
  ]);
  chrome.on("error", (e) => {
    console.error("Failed to launch Chrome:", e);
    process.exit(1);
  });

  // 2. Wait for the debug endpoint, then open a target on our URL.
  let version;
  for (let i = 0; i < 40; i++) {
    try {
      version = await (await fetch(`http://localhost:${PORT}/json/version`)).json();
      break;
    } catch {
      await sleep(250);
    }
  }
  if (!version) throw new Error("Chrome debug endpoint never came up");

  const target = await (
    await fetch(`http://localhost:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: "PUT" })
  ).json();
  const cdp = cdpConnect(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  // 3. Wait for the map to render: student cards present AND comm dot-markers
  //    laid out AND webfonts settled.
  console.log("waiting for map to render…");
  let ready = false;
  for (let i = 0; i < 80; i++) {
    const state = await evaluate(
      cdp,
      `(() => {
        const cards = document.querySelectorAll('button.rounded-xl, [class*="rounded-xl"]').length;
        const dots = document.querySelectorAll('[data-scroller] svg, [data-scroller] .rounded-full').length;
        return { cards, dots, fonts: document.fonts ? document.fonts.status : 'n/a' };
      })()`,
    );
    if (state.cards > 5 && state.dots > 5) {
      ready = true;
      break;
    }
    await sleep(250);
  }
  if (!ready) console.warn("proceeding without full readiness signal");
  await evaluate(cdp, "document.fonts && document.fonts.ready");
  await sleep(600); // settle: fonts.ready re-layout of the student cards

  // 4. Measure the full map under PRINT media (the @media print rules open the
  //    scrollport to max-content), so paper matches exactly what prints.
  await cdp.send("Emulation.setEmulatedMedia", { media: "print" });
  await sleep(200);
  const dims = await evaluate(
    cdp,
    `(() => {
      const s = document.querySelector('[data-scroller]');
      const w = Math.max(s.scrollWidth, document.documentElement.scrollWidth);
      const h = Math.max(s.scrollHeight, document.documentElement.scrollHeight);
      return { w, h };
    })()`,
  );
  const contentWin = dims.w / 96;
  const contentHin = dims.h / 96;

  // 5. Fit within the plotter box, preserving aspect. Scale UP to the binding
  //    dimension so the delivered file is at (near) target physical size.
  //    CDP's printToPDF clamps `scale` to 2.0, so cap there and size the paper
  //    to the applied scale — the page fills exactly, one sheet, no margins.
  //    (The PDF is vector, so a plotter can enlarge it to the full 4m×1m with
  //    zero quality loss if an even bigger print is wanted.)
  const MAX_SCALE = 2.0;
  const fit = Math.min((MAX_W_M * IN_PER_M) / contentWin, (MAX_H_M * IN_PER_M) / contentHin);
  const scale = Math.min(fit, MAX_SCALE);
  const paperWin = contentWin * scale;
  const paperHin = contentHin * scale;
  console.log(
    `content ${dims.w}×${dims.h}px (${contentWin.toFixed(1)}×${contentHin.toFixed(1)}in) · ` +
      `scale ${scale.toFixed(3)} · paper ${(paperWin / IN_PER_M).toFixed(2)}×${(paperHin / IN_PER_M).toFixed(2)}m`,
  );

  // 6. Print to PDF at that paper size — one page, backgrounds on, no margins.
  const { data } = await cdp.send("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: false,
    landscape: false,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    scale,
    paperWidth: paperWin,
    paperHeight: paperHin,
    pageRanges: "1",
  });

  writeFileSync(OUT, Buffer.from(data, "base64"));
  console.log(`wrote ${OUT} (${(Buffer.from(data, "base64").length / 1e6).toFixed(2)} MB)`);

  cdp.close();
  chrome.kill();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
