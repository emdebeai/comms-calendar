// Core: render the comms map to a single-page vector PDF via headless system
// Chrome over the DevTools Protocol (no puppeteer — Node's native WebSocket
// drives CDP). Returns a Buffer. Used by both the CLI (scripts/print-pdf.mjs)
// and the server's /api/export-pdf endpoint (the on-map Export button).
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const IN_PER_M = 39.37007874;

function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
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
  return { ready, send, close: () => ws.close() };
}

async function evaluate(cdp, expression) {
  const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
}

/**
 * @param {object} [opts]
 * @param {string} [opts.url]   page to print (defaults to the local ?print&dots view)
 * @param {number} [opts.maxWM] max print width in metres  (default 4)
 * @param {number} [opts.maxHM] max print height in metres (default 1)
 * @param {number} [opts.port]  debugging port
 * @param {(m:string)=>void} [opts.log]
 * @returns {Promise<{ pdf: Buffer, widthM: number, heightM: number }>}
 */
export async function generateMapPdf(opts = {}) {
  const url = opts.url ?? "http://localhost:5173/?print&dots";
  const maxWM = opts.maxWM ?? 4.0;
  const maxHM = opts.maxHM ?? 1.0;
  const port = opts.port ?? 9333 + Math.floor((Date.now() / 1000) % 500);
  const log = opts.log ?? (() => {});

  const chrome = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--force-device-scale-factor=1",
    "--window-size=1680,1000",
    "about:blank",
  ]);

  try {
    let version;
    for (let i = 0; i < 40; i++) {
      try {
        version = await (await fetch(`http://localhost:${port}/json/version`)).json();
        break;
      } catch {
        await sleep(250);
      }
    }
    if (!version) throw new Error("Chrome debug endpoint never came up");

    const target = await (
      await fetch(`http://localhost:${port}/json/new?${encodeURIComponent(url)}`, {
        method: "PUT",
      })
    ).json();
    const cdp = cdpConnect(target.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    log("waiting for map to render…");
    for (let i = 0; i < 80; i++) {
      const state = await evaluate(
        cdp,
        `(() => ({
          cards: document.querySelectorAll('[class*="rounded-xl"]').length,
          dots: document.querySelectorAll('[data-scroller] svg, [data-scroller] .rounded-full').length,
        }))()`,
      );
      if (state.cards > 5 && state.dots > 5) break;
      await sleep(250);
    }
    await evaluate(cdp, "document.fonts && document.fonts.ready");
    await sleep(600);

    await cdp.send("Emulation.setEmulatedMedia", { media: "print" });
    await sleep(200);
    const dims = await evaluate(
      cdp,
      `(() => {
        const s = document.querySelector('[data-scroller]');
        return {
          w: Math.max(s.scrollWidth, document.documentElement.scrollWidth),
          h: Math.max(s.scrollHeight, document.documentElement.scrollHeight),
        };
      })()`,
    );
    const contentWin = dims.w / 96;
    const contentHin = dims.h / 96;

    const MAX_SCALE = 2.0; // CDP printToPDF clamps scale here
    const fit = Math.min((maxWM * IN_PER_M) / contentWin, (maxHM * IN_PER_M) / contentHin);
    const scale = Math.min(fit, MAX_SCALE);
    const paperWidth = contentWin * scale;
    const paperHeight = contentHin * scale;
    log(
      `content ${dims.w}×${dims.h}px · scale ${scale.toFixed(3)} · ` +
        `paper ${(paperWidth / IN_PER_M).toFixed(2)}×${(paperHeight / IN_PER_M).toFixed(2)}m`,
    );

    const { data } = await cdp.send("Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: false,
      landscape: false,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      scale,
      paperWidth,
      paperHeight,
      pageRanges: "1",
    });
    cdp.close();
    return {
      pdf: Buffer.from(data, "base64"),
      widthM: paperWidth / IN_PER_M,
      heightM: paperHeight / IN_PER_M,
    };
  } finally {
    chrome.kill();
  }
}
