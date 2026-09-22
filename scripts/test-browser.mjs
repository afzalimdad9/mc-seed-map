/**
 * Headless-browser smoke test for the Seed Finder UI.
 * Requires the workspace served on a local port (scripts/test-browser handles
 * this via the `PORT`/`NO_SERVER` env or default 8137).
 */
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = Number(process.env.PORT ?? 8137);
const BASE = `http://localhost:${PORT}`;

let server = null;
if (!process.env.NO_SERVER) {
  server = spawn("python3", ["-m", "http.server", String(PORT)], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));
}

const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];
page.on("console", (m) => logs.push(m.text()));
page.on("pageerror", (e) => logs.push("PAGEERROR " + e));

try {
  await page.goto(`${BASE}/apps/web/finder.html`);
  await page.waitForFunction(() => document.getElementById("status").textContent.includes("ready"), { timeout: 20000 });

  await page.fill("#biomes", "mushroom_fields");
  await page.selectOption("#biomeGrid", "1");
  await page.uncheck("input[name=struct][value=village]");
  await page.fill("#maxSeeds", "800");
  await page.fill("#workers", "2");
  await page.fill("#count", "1");
  await page.click("#start");

  await page.waitForFunction(() => {
    const p = document.getElementById("progress").textContent;
    return p.includes("complete") || p.includes("Reached") || p.includes("Stopped");
  }, { timeout: 90000 });

  const progress = await page.textContent("#progress");
  const results = await page.textContent("#results");
  console.log("progress:", progress);
  console.log("results:", results);

  const ok = progress.includes("Reached target: 1 seed(s) found.") && /^#1  seed \d+/.test(results.trim());
  // Deterministic seed-262 correctness is asserted in test-finder.mjs; this
  // test proves the in-browser Web Worker pipeline returns real results.
  console.log(ok ? "BROWSER FINDER OK" : "BROWSER FINDER FAIL");
  if (!ok) for (const l of logs) console.log("LOG>", l);

  // Seed Map page: generate with the Cubiomes palette and confirm pixels.
  await page.goto(`${BASE}/apps/web/index.html`);
  await page.waitForFunction(() => document.getElementById("status").textContent.includes("Done"), { timeout: 30000 });
  const mapOk = await page.evaluate(() => {
    const c = document.getElementById("map");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let set = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] || d[i + 1] || d[i + 2]) set++;
    return set > 1000;
  });
  console.log(mapOk ? "BROWSER MAP OK" : "BROWSER MAP FAIL");

  // Nether dimension must also generate and render.
  await page.selectOption("#dimension", "nether");
  await page.click("#generate");
  await page.waitForFunction(() => document.getElementById("status").textContent.includes("Done"), { timeout: 30000 });
  const netherOk = await page.evaluate(() => {
    const c = document.getElementById("map");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let set = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] || d[i + 1] || d[i + 2]) set++;
    return set > 1000;
  });
  console.log(netherOk ? "BROWSER NETHER MAP OK" : "BROWSER NETHER MAP FAIL");

  process.exitCode = ok && mapOk && netherOk ? 0 : 1;
} catch (e) {
  console.log("BROWSER TEST ERROR:", e.message);
  for (const l of logs) console.log("LOG>", l);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}