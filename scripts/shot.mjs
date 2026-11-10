/**
 * Smoke-check the production page at root and project-site paths, narrow and
 * wide. Each bounded worker owns its browser and profile; all are cleaned up.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

import { openChrome } from "./chrome.mjs";
import { browserSlots, cpuSlots, freeDebugPort, listenOnFreePort } from "./concurrency.mjs";
import { buildSheet } from "./shot-sheet.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const shotsDir = join(root, ".art/shots");
export const CASES = [
  { name: "root-narrow", prefix: "/", width: 390, height: 844 },
  { name: "root-wide", prefix: "/", width: 1280, height: 800 },
  { name: "subpath-narrow", prefix: "/template-preview/", width: 390, height: 844 },
  { name: "subpath-wide", prefix: "/template-preview/", width: 1280, height: 800 },
];

function filesUnder(path) {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => filesUnder(join(path, name)));
}

export function preflight() {
  const index = join(dist, "index.html");
  if (!existsSync(index)) {
    throw new Error("There is no build to serve (dist/index.html is missing). Run npm run build.");
  }
  const built = statSync(index).mtimeMs;
  const newer = ["src", "public", "index.html", "vite.config.ts"]
    .flatMap((path) => filesUnder(join(root, path)))
    .filter((file) => statSync(file).mtimeMs > built);
  if (newer.length > 0) {
    throw new Error(
      `The build is older than the code (${newer.map((file) => relative(root, file)).join(", ")}). ` +
        "Run npm run build.",
    );
  }
}

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

export function serve(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400).end("invalid URL");
    return;
  }
  const prefix = pathname.startsWith("/template-preview/") ? "/template-preview/" : "/";
  const name = pathname.slice(prefix.length) || "index.html";
  const buildRoot = resolve(dist);
  const file = resolve(buildRoot, name);
  const relativeFile = relative(buildRoot, file);
  if (relativeFile === ".." || relativeFile.startsWith(`..${sep}`) || isAbsolute(relativeFile)) {
    res.writeHead(403).end("outside build");
    return;
  }
  let body;
  try {
    body = readFileSync(file);
  } catch (error) {
    if (!["ENOENT", "ENOTDIR", "EISDIR"].includes(error.code)) {
      console.error(`Could not serve ${file}: ${error.message}`);
      res.writeHead(500).end("read failed");
      return;
    }
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  res.end(body);
}

async function checkPage(browser, port, scenario) {
  const { send, evaluate } = browser;
  const errors = [];
  const responses = new Map();
  const unsubscribe = browser.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown") {
      errors.push(params.exceptionDetails.exception?.description ?? params.exceptionDetails.text);
    }
    if (method === "Runtime.consoleAPICalled" && params.type === "error") {
      errors.push(params.args.map((arg) => arg.value ?? arg.description).join(" "));
    }
    if (method === "Log.entryAdded" && params.entry.level === "error") {
      errors.push(params.entry.text);
    }
    if (method === "Network.loadingFailed") errors.push(params.errorText);
    if (method === "Network.responseReceived") {
      responses.set(params.response.url, params.response);
      if (params.response.status >= 400) {
        errors.push(`${params.response.status} ${params.response.url}`);
      }
    }
  });
  try {
    await send("Emulation.setDeviceMetricsOverride", {
      width: scenario.width,
      height: scenario.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const url = `http://127.0.0.1:${port}${scenario.prefix}`;
    const navigation = await send("Page.navigate", { url });
    assert.ok(!navigation.errorText, navigation.errorText);
    const deadline = Date.now() + 10000;
    for (;;) {
      if (await evaluate("document.readyState === 'complete'")) break;
      assert.ok(Date.now() < deadline, `${scenario.name}: page did not finish loading`);
      await sleep(50);
    }
    await evaluate("document.fonts.ready.then(() => true)");
    const page = await evaluate(`(() => {
      const heading = document.querySelector("main > h1");
      const bounds = heading?.getBoundingClientRect();
      return {
        title: document.title,
        language: document.documentElement.lang,
        heading: heading?.textContent,
        headings: document.querySelectorAll("h1").length,
        introduction: document.querySelector("main > p")?.textContent,
        viewport: document.querySelector('meta[name="viewport"]')?.content,
        assets: [...document.querySelectorAll('script[type="module"][src], link[rel="stylesheet"]')]
          .map(element => element.src || element.href),
        styled: heading ? parseFloat(getComputedStyle(heading).fontSize) >= 32 &&
          getComputedStyle(document.body).display === "grid" &&
          getComputedStyle(document.documentElement).backgroundColor === "rgb(248, 250, 252)" : false,
        fits: bounds ? bounds.left >= 0 && bounds.right <= innerWidth &&
          bounds.top >= 0 && bounds.bottom <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth : false
      };
    })()`);
    assert.equal(page.title, "Hello, world!");
    assert.equal(page.language, "en");
    assert.equal(page.heading, "Hello, world!");
    assert.equal(page.headings, 1);
    assert.equal(page.introduction, "Your next static web app starts here.");
    assert.equal(page.viewport, "width=device-width, initial-scale=1.0");
    assert.ok(page.styled, "The built stylesheet must affect the heading.");
    assert.ok(page.fits, "The heading must fit the viewport without horizontal overflow.");
    assert.ok(page.assets.length >= 2, "Discover both built JavaScript and stylesheet assets.");
    for (const asset of page.assets) {
      assert.ok(asset.startsWith(`${url}assets/`), `Asset escapes hosting prefix: ${asset}`);
      assert.equal(responses.get(asset)?.status, 200, `Asset was not loaded: ${asset}`);
    }
    assert.deepEqual(errors, [], `${scenario.name}: browser errors`);
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(shotsDir, `${scenario.name}.png`), Buffer.from(data, "base64"));
  } finally {
    unsubscribe();
  }
}

async function main() {
  preflight();
  rmSync(shotsDir, { recursive: true, force: true });
  mkdirSync(shotsDir, { recursive: true });
  const server = createServer(serve);
  const port = await listenOnFreePort(server);
  const workers = Math.min(browserSlots(), cpuSlots(), CASES.length);
  let next = 0;
  try {
    const results = await Promise.allSettled(
      Array.from({ length: workers }, async () => {
        const profile = mkdtempSync(join(root, ".art/chrome-profile-"));
        let browser;
        try {
          browser = await openChrome({ debugPort: freeDebugPort(), profileDir: profile });
          for (const domain of ["Page", "Runtime", "Network", "Log"]) {
            await browser.send(`${domain}.enable`);
          }
          for (;;) {
            const scenario = CASES[next++];
            if (!scenario) break;
            await checkPage(browser, port, scenario);
            if (process.argv.includes("--verbose")) console.log(`PASS  ${scenario.name}`);
          }
        } finally {
          try {
            await browser?.close();
          } finally {
            // Chrome's child processes can finish profile writes just after
            // its parent exits. Retry transient removal errors, but stay loud
            // if the run-owned directory cannot be cleaned up.
            await rm(profile, {
              recursive: true,
              force: true,
              maxRetries: 10,
              retryDelay: 100,
            });
          }
        }
      }),
    );
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) throw new AggregateError(failures.map((result) => result.reason));
    assert.ok(await buildSheet(), "The screenshot contact sheet was not generated.");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.error("FAIL  browser screenshot check");
    for (const failure of error instanceof AggregateError ? error.errors : [error]) {
      console.error(failure.stack ?? failure.message);
    }
    process.exitCode = 1;
  }
}
