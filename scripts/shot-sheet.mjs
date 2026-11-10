/**
 * Packs the screenshots from `npm run shot` into one image to attach to a pull
 * request.
 *
 *   node scripts/shot-sheet.mjs
 *
 * `npm run shot` calls this at the end, so the sheet is already waiting at
 * .art/shots/contact-sheet.png by the time the run finishes.
 *
 * One file rather than many, because the cost of attaching evidence decides
 * whether it gets attached at all. Reviewing a UI means looking at it, and
 * nothing in CI can do that looking on the reviewer's behalf - see
 * docs/decisions/Let the author attach the screenshots.md.
 */
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rm } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

import { openChrome } from "./chrome.mjs";
import { freeDebugPort, listenOnFreePort } from "./concurrency.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const shotsDir = join(root, ".art/shots");

const SHEET = "contact-sheet.png";
const CELL_HEIGHT = 300;
const COLUMNS = 4;

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * The browser handles sizing, labels, and image composition in one render.
 * Grouping rows explicitly keeps the prior four-column, left-to-right order.
 */
export function createSheetHtml(shots) {
  const rows = [];
  const sortedShots = [...shots].sort();
  for (let i = 0; i < sortedShots.length; i += COLUMNS) {
    const cells = sortedShots
      .slice(i, i + COLUMNS)
      .map((file) => {
        const label = escapeHtml(file.replace(/\.png$/, ""));
        return `<figure><figcaption>${label}</figcaption><img src="/shots/${encodeURIComponent(file)}" alt="${label}"></figure>`;
      })
      .join("");
    rows.push(`<div class="row">${cells}</div>`);
  }
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Screenshot contact sheet</title>
<style>
  html, body { margin: 0; background: white; }
  .sheet { display: flex; flex-direction: column; align-items: flex-start; width: max-content; }
  .row { display: flex; align-items: flex-end; }
  figure { display: flex; flex: none; flex-direction: column; align-items: center; margin: 0; padding: 8px; }
  figcaption { color: #333; font: 18px sans-serif; white-space: nowrap; }
  img { display: block; height: ${CELL_HEIGHT}px; width: auto; }
</style>
<main class="sheet">${rows.join("\n")}</main>
</html>`;
}

function serveSheet(shots, html) {
  const files = new Set(shots);
  return createServer((request, response) => {
    let pathname;
    try {
      pathname = new URL(request.url, "http://localhost").pathname;
    } catch {
      response.writeHead(400).end("invalid URL");
      return;
    }

    if (pathname === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(html);
      return;
    }

    let filename;
    try {
      filename = decodeURIComponent(pathname.slice("/shots/".length));
    } catch {
      response.writeHead(400).end("invalid filename");
      return;
    }
    if (!pathname.startsWith("/shots/") || !files.has(filename)) {
      response.writeHead(404).end("not found");
      return;
    }

    response
      .writeHead(200, { "content-type": "image/png", "cache-control": "no-store" })
      .end(readFileSync(join(shotsDir, filename)));
  });
}

async function waitForImages(browser, expectedCount) {
  const deadline = Date.now() + 10000;
  for (;;) {
    if (
      await browser.evaluate(
        `document.readyState === 'complete' && document.images.length === ${expectedCount} && [...document.images].every(image => image.complete && image.naturalWidth > 0)`,
      )
    ) {
      await browser.evaluate("document.fonts.ready.then(() => true)");
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error("Chrome timed out loading the contact sheet images.");
    }
    await sleep(50);
  }
}

export async function buildSheet() {
  if (!existsSync(shotsDir)) return null;
  const shots = readdirSync(shotsDir)
    .filter((file) => file.endsWith(".png") && file !== SHEET)
    .sort();
  if (shots.length === 0) return null;

  const server = serveSheet(shots, createSheetHtml(shots));
  const profile = mkdtempSync(join(root, ".art/chrome-profile-sheet-"));
  let browser;
  let serverStarted = false;
  try {
    const port = await listenOnFreePort(server);
    serverStarted = true;
    browser = await openChrome({ debugPort: freeDebugPort(), profileDir: profile });
    await browser.send("Page.enable");
    const navigation = await browser.send("Page.navigate", {
      url: `http://127.0.0.1:${port}/`,
    });
    if (navigation.errorText) throw new Error(navigation.errorText);
    await waitForImages(browser, shots.length);

    const { width, height } = await browser.evaluate(
      "(() => { const { width, height } = document.querySelector('.sheet').getBoundingClientRect(); return { width: Math.ceil(width), height: Math.ceil(height) }; })()",
    );
    await browser.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const { data } = await browser.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 },
    });
    const sheet = join(shotsDir, SHEET);
    writeFileSync(sheet, Buffer.from(data, "base64"));
    return sheet;
  } finally {
    try {
      await browser?.close();
    } finally {
      try {
        if (serverStarted) {
          server.closeAllConnections();
          await new Promise((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          );
        }
      } finally {
        await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let sheet;
  try {
    sheet = await buildSheet();
  } catch (error) {
    console.error(`Chrome could not build the contact sheet: ${error.message.split("\n")[0]}`);
    process.exit(1);
  }
  if (!sheet) {
    console.error(`No screenshots in ${shotsDir}. Run npm run shot first.`);
    process.exit(1);
  }
  console.log(sheet);
}
