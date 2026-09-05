import { chromium } from "playwright-core";
import fs from "node:fs";

const url = "http://localhost:3000/";
const outDir =
  "/private/tmp/claude-501/-Users-ilhamrizkyakbar-Documents-Pixboard/bd59b18f-d300-4971-b9fd-e5a5dc542ab0/scratchpad";

const viewports = [
  { name: "phone-390x844", w: 390, h: 844 },
  { name: "tablet-768x1024", w: 768, h: 1024 },
  { name: "just-under-lg-1023x800", w: 1023, h: 800 },
  { name: "just-at-lg-1024x800", w: 1024, h: 800 },
  { name: "narrow-lg-1050x800", w: 1050, h: 800 },
  { name: "1100x900", w: 1100, h: 900 },
  { name: "1280x800", w: 1280, h: 800 },
  { name: "1440x900", w: 1440, h: 900 },
  { name: "1920x1080", w: 1920, h: 1080 },
  { name: "short-1440x600", w: 1440, h: 600 },
  { name: "short-1280x500", w: 1280, h: 500 },
  { name: "tall-1280x1400", w: 1280, h: 1400 },
  { name: "tall-1440x1600", w: 1440, h: 1600 },
];

const browser = await chromium.launch();
const results = {};

for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    };

    const board = document.querySelector(".pixl-board");
    const screen = document.querySelector(".pixl-screen");
    const mini = document.querySelector(".pixl-mini");
    const pad = document.querySelector(".pixl-pad");
    const rail = document.querySelector(".pixl-rail");
    const bar = document.querySelector(".pixl-bar");
    const grid = document.querySelector('ul[aria-label="Icons"]');
    const legend = document.querySelector(".pixl-board-legend");
    const toolbar = document.querySelector('[id="icon-panel"]') || document.querySelector('[role="tabpanel"]');

    // left column = ancestor of .pixl-mini with class containing lg:w-66 marker; find via closest with data
    let leftCol = null;
    if (mini) {
      let node = mini.parentElement;
      while (node && node !== document.body) {
        if (node.className && typeof node.className === "string" && node.className.includes("shrink-0") && node.className.includes("flex-col")) {
          leftCol = node;
        }
        node = node.parentElement;
      }
    }

    const cards = Array.from(document.querySelectorAll(".pixl-card"));
    const cardRects = cards.map((c) => c.getBoundingClientRect());
    // group into rows by y
    const rows = [];
    for (const r of cardRects) {
      let row = rows.find((row) => Math.abs(row.y - r.y) < 2);
      if (!row) { row = { y: r.y, items: [] }; rows.push(row); }
      row.items.push(r);
    }
    rows.sort((a, b) => a.y - b.y);

    const bodyOverflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    const boardOverflowsViewport = board ? board.getBoundingClientRect().bottom > window.innerHeight + 1 : null;

    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      board: rect(board),
      screen: rect(screen),
      mini: rect(mini),
      pad: rect(pad),
      rail: rect(rail),
      bar: rect(bar),
      grid: rect(grid),
      legend: rect(legend),
      leftColClass: leftCol ? leftCol.className : null,
      leftCol: rect(leftCol),
      cardSize: cardRects[0] ? { w: +cardRects[0].width.toFixed(1), h: +cardRects[0].height.toFixed(1) } : null,
      cardCount: cards.length,
      rowCounts: rows.map((r) => r.items.length),
      lastRowCount: rows.length ? rows[rows.length - 1].items.length : 0,
      totalRows: rows.length,
      bodyOverflowX,
      boardOverflowsViewport,
      gridColumnGapPx: grid ? getComputedStyle(grid).columnGap : null,
    };
  });

  results[vp.name] = data;
  await page.screenshot({ path: `${outDir}/shot-${vp.name}.png` });
  await page.close();
}

await browser.close();
fs.writeFileSync(`${outDir}/measurements.json`, JSON.stringify(results, null, 2));
console.log("done");
console.log(JSON.stringify(results, null, 2));
