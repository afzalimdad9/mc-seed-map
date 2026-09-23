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

  // Structure overlay (M5): the default view is seed 262 / 1.18 / overworld at
  // scale 4, origin (-192,-128), canvas 768×512 → block box (-768,-512)..(2304,1536).
  const ov = await page.evaluate(() => window.__seedmapOverlay);
  const ovCount = ov.length;
  const ovViable = ov.filter((m) => m.viable).length;
  const hasVillage = ov.some((m) => m.type === "village" && m.x === 192 && m.z === 208 && !m.viable);
  const hasViableIgloo = ov.some((m) => m.type === "igloo" && m.x === -384 && m.z === 800 && m.viable);
  const overlayOk = Array.isArray(ov) && ovCount === 129 && ovViable === 13 && hasVillage && hasViableIgloo;
  console.log(overlayOk ? "BROWSER OVERLAY OK" : "BROWSER OVERLAY FAIL");
  if (!overlayOk) console.log("OV>", JSON.stringify({ ovCount, ovViable, hasVillage, hasViableIgloo }));

  // M5b spawn marker + hover labels, while village overlay is still enabled.
  const spawn = await page.evaluate(() => window.__seedmapSpawn);
  const spawnOk = spawn && spawn.x === 420 && spawn.z === -92;
  console.log(spawnOk ? "BROWSER SPAWN OK" : "BROWSER SPAWN FAIL");
  if (!spawnOk) console.log("SPAWN>", JSON.stringify(spawn));

  // Convert canvas-local pixels to absolute viewport coordinates (the canvas
  // may be laid out with an offset / scaled in CSS).
  const mapCtx = await page.evaluate(() => {
    const c = document.getElementById("map");
    const r = c.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, W: c.width, H: c.height };
  });
  const toScreen = (px, py) => ({
    x: mapCtx.x + px * (mapCtx.w / mapCtx.W),
    y: mapCtx.y + py * (mapCtx.h / mapCtx.H),
  });
  const center = toScreen(384, 256);

  // Find a hover label that contains `want` near canvas-local cell (px,py),
  // tolerating border/rounding shifts.
  async function hoverScan(px, py, want) {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        const s = toScreen(px + dx, py + dy);
        await page.mouse.move(s.x, s.y);
        const t = await page.textContent("#pos");
        if (t.includes(want)) return t;
      }
    }
    return null;
  }

  // Hover the single-block cells of the village (192,208) and spawn (420,-92).
  const villageHover = await hoverScan(240, 180, "village");
  const spawnHover = await hoverScan(297, 105, "spawn");
  const hoverOk = villageHover && spawnHover;
  console.log(hoverOk ? "BROWSER HOVER OK" : "BROWSER HOVER FAIL");
  if (!hoverOk) console.log("HOVER>", JSON.stringify({ villageHover, spawnHover }));

  // Toggling a structure type off must remove exactly its markers.
  const villageCount = ov.filter((m) => m.type === "village").length;
  await page.uncheck("input[value=village]");
  await page.click("#generate");
  await page.waitForFunction(() => document.getElementById("status").textContent.includes("Done"), { timeout: 30000 });
  const ov2 = await page.evaluate(() => window.__seedmapOverlay);
  const toggleOk = ov2.length === ovCount - villageCount;
  console.log(toggleOk ? "BROWSER OVERLAY TOGGLE OK" : "BROWSER OVERLAY TOGGLE FAIL");
  if (!toggleOk) console.log("TOG>", JSON.stringify({ before: ovCount, after: ov2.length, villageCount }));

  // M5b zoom: wheel at canvas center must keep the block under the cursor fixed.
  const oBefore = await page.evaluate(() => window.__seedmapOrigin);
  await page.mouse.move(center.x, center.y);
  await page.mouse.wheel(0, -120); // zoom in 4 -> 1
  await page.waitForFunction(
    () => window.__seedmapOrigin && window.__seedmapOrigin.scale === 1,
    { timeout: 30000 },
  );
  const oZoomed = await page.evaluate(() => window.__seedmapOrigin);
  const centerBlockBefore = (oBefore.x + 384) * oBefore.scale;
  const centerBlockZoomed = (oZoomed.x + 384) * oZoomed.scale;
  const centerZBefore = (oBefore.z + 256) * oBefore.scale;
  const centerZZoomed = (oZoomed.z + 256) * oZoomed.scale;
  const zoomOk =
    oZoomed.scale === 1 &&
    centerBlockBefore === centerBlockZoomed &&
    centerZBefore === centerZZoomed;
  await page.mouse.wheel(0, 120); // zoom out 1 -> 4
  await page.waitForFunction(
    () => window.__seedmapOrigin && window.__seedmapOrigin.scale === 4,
    { timeout: 30000 },
  );
  const oOut = await page.evaluate(() => window.__seedmapOrigin);
  const zoomOutOk = oOut.scale === 4 && (oOut.x + 384) * oOut.scale === centerBlockBefore;
  console.log(zoomOk && zoomOutOk ? "BROWSER ZOOM OK" : "BROWSER ZOOM FAIL");
  if (!(zoomOk && zoomOutOk)) console.log("ZOOM>", JSON.stringify({ oBefore, oZoomed, oOut }));

  // M5b pan: dragging (100,100) -> (160,140) pans by the pixel delta / scale.
  const p1 = toScreen(100, 100);
  const p2 = toScreen(160, 140);
  await page.mouse.move(p1.x, p1.y);
  await page.mouse.down();
  await page.mouse.move(p2.x, p2.y, { steps: 5 });
  await page.mouse.up();
  const wantX = oOut.x - 60; // 1 pixel = 1 scaled cell in the origin offset
  const wantZ = oOut.z - 40;
  await page.waitForFunction(
    (wanted) => {
      const o = window.__seedmapOrigin;
      return o && o.x === wanted.x && o.z === wanted.z;
    },
    { x: wantX, z: wantZ },
    { timeout: 30000 },
  );
  console.log("BROWSER PAN OK");

  // M6b landmark finder: nearest viable village to seed 262's spawn (420,-92)
  // within 4000 blocks is (-800,-240), 1229 blocks away (frozen known-answer).
  await page.selectOption("#findType", "village");
  await page.fill("#findRadius", "4000");
  await page.click("#findNearest");
  await page.waitForFunction(() => window.__seedmapNearest, { timeout: 30000 });
  const nearest = await page.evaluate(() => window.__seedmapNearest);
  const finderOk =
    nearest && nearest.type === "village" && nearest.x === -800 && nearest.z === -240 &&
    nearest.viable === true && nearest.dist === 1229;
  const lmText = await page.textContent("#landmarkResult");
  const lmOk = finderOk && lmText.includes("village at (-800, -240)") && lmText.includes("1229 blocks");
  console.log(lmOk ? "BROWSER FINDER NEAREST OK" : "BROWSER FINDER NEAREST FAIL");
  if (!lmOk) console.log("LM>", JSON.stringify({ nearest, lmText }));

  // M6b seed→map deep link: finder results link to index.html#seed=<signed>.
  await page.goto("about:blank").catch(() => {});
  await page.goto(`${BASE}/apps/web/index.html#seed=635`);
  await page.waitForFunction(() => document.getElementById("status").textContent.includes("Done"), { timeout: 30000 });
  const deepSeed = await page.inputValue("#seed");
  const deepStatus = await page.textContent("#status");
  const deepOk = deepSeed === "635" && deepStatus.includes("seed 635");
  console.log(deepOk ? "BROWSER DEEPLINK OK" : "BROWSER DEEPLINK FAIL");
  if (!deepOk) console.log("DEEP>", JSON.stringify({ deepSeed, deepStatus }));

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

  process.exitCode = ok && mapOk && netherOk && overlayOk && toggleOk && spawnOk && hoverOk && zoomOk && zoomOutOk && finderOk && deepOk ? 0 : 1;
} catch (e) {
  console.log("BROWSER TEST ERROR:", e.message);
  for (const l of logs) console.log("LOG>", l);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}