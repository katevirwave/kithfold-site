import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PAGES, scrollThrough } from "./pages.mjs";

// ---------- helpers (Node side) ----------
const hexToRgb = (h) => {
  h = h.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const lum = ([r, g, b]) => {
  const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const rootTokens = (file) => {
  const html = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
  const root = html.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  return Object.fromEntries([...root.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\b/g)].map((m) => [m[1], m[2].toLowerCase()]));
};
const fileFor = (p) => (p === "/" ? "index.html" : `${p.slice(1)}index.html`);

// Tokens used for text, by page naming scheme. Backgrounds they must read on.
const TEXT_TOKENS = ["--ink", "--ink-2", "--ink-3", "--plum", "--muted", "--faint", "--heather-deep", "--sage-deep", "--ember", "--amber", "--slate"];
const GROUNDS = ["--ground", "--oat", "--card", "--panel"];

// ---------- 1. Token contrast (static, fast) ----------
for (const pg of PAGES) {
  test(`tokens: text colours pass WCAG AA on ${pg.name}`, async ({}, info) => {
    test.skip(info.project.name !== "desktop", "static check, run once");
    const t = rootTokens(fileFor(pg.path));
    const fails = [];
    for (const fg of TEXT_TOKENS.filter((k) => t[k]))
      for (const bg of GROUNDS.filter((k) => t[k])) {
        const r = ratio(hexToRgb(t[fg]), hexToRgb(t[bg]));
        if (r < 4.5) fails.push(`${fg} ${t[fg]} on ${bg} ${t[bg]} = ${r.toFixed(2)}:1`);
      }
    expect(fails, "Text token below 4.5:1").toEqual([]);
  });
}

// ---------- 2. Palette is the same on every page ----------
test("tokens: shared colours match across pages", async ({}, info) => {
  test.skip(info.project.name !== "desktop", "static check, run once");
  // Same role, different names per page. Each group must resolve to one hex.
  const ROLES = {
    ground: ["--ground", "--oat"],
    ink: ["--ink", "--plum"],
    secondary: ["--ink-2", "--muted"],
    tertiary: ["--ink-3", "--faint"],
    heatherDeep: ["--heather-deep"],
    sageDeep: ["--sage-deep"],
    line: ["--line"],
  };
  const seen = {};
  for (const pg of PAGES) {
    const t = rootTokens(fileFor(pg.path));
    // laws/ uses --heather for the deep value and --sage for the deep green
    const alias = pg.name === "laws" ? { "--heather-deep": t["--heather"], "--sage-deep": t["--sage"] } : {};
    for (const [role, names] of Object.entries(ROLES)) {
      const v = names.map((n) => alias[n] ?? t[n]).find(Boolean);
      if (v) (seen[role] ??= {})[pg.name] = v;
    }
  }
  const drift = Object.entries(seen)
    .filter(([, byPage]) => new Set(Object.values(byPage)).size > 1)
    .map(([role, byPage]) => `${role}: ${Object.entries(byPage).map(([p, v]) => `${p}=${v}`).join(", ")}`);
  expect(drift, "Same colour role has different values on different pages").toEqual([]);
});

// ---------- 3. Never a dark background (incl. when the OS is in dark mode) ----------
for (const pg of PAGES) {
  for (const scheme of ["light", "dark"]) {
    test(`background stays light on ${pg.name} (OS ${scheme} mode)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(pg.path);
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const rgb = bg.match(/\d+/g).slice(0, 3).map(Number);
      expect(lum(rgb), `body background ${bg} is too dark`).toBeGreaterThan(0.7);
    });
  }
}

// ---------- 4. Rendered text contrast (what visitors actually see) ----------
for (const pg of PAGES) {
  test(`rendered text contrast on ${pg.name}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" }); // final resting state of every reveal
    await page.goto(pg.path);
    await scrollThrough(page);
    const fails = await page.evaluate(() => {
      const parse = (c) => { const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
      const L = ({ r, g, b }) => [r, g, b].map((c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
      const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const done = new Set();
      while (walker.nextNode()) {
        const el = walker.currentNode.parentElement;
        if (!el || done.has(el) || !walker.currentNode.textContent.trim()) continue;
        done.add(el);
        if (el.closest("[aria-hidden=true], svg, script, style, noscript")) continue;
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height || cs.visibility === "hidden") continue;
        // Background: composite ancestors' backgrounds up to the page. Skip over images/gradients (cannot know).
        let bg = { r: 255, g: 255, b: 255, a: 1 }, layers = [], uncertain = false, opacity = 1;
        for (let n = el; n; n = n.parentElement) {
          const s = getComputedStyle(n);
          opacity *= parseFloat(s.opacity);
          if (s.backgroundImage !== "none") { uncertain = true; break; }
          const c = parse(s.backgroundColor);
          if (c.a > 0) layers.push(c);
          if (c.a >= 1) break;
        }
        if (uncertain || opacity < 0.05) continue;
        for (const l of layers.reverse()) bg = over(l, bg);
        const fg0 = parse(cs.color);
        const fg = over({ ...fg0, a: fg0.a * opacity }, bg);
        const [hi, lo] = [L(fg), L(bg)].sort((a, b) => b - a);
        const ratio = (hi + 0.05) / (lo + 0.05);
        const px = parseFloat(cs.fontSize), w = parseInt(cs.fontWeight, 10);
        const large = px >= 24 || (px >= 18.66 && w >= 700);
        const need = large ? 3 : 4.5;
        if (ratio < need) out.push(`${ratio.toFixed(2)}:1 (needs ${need}) ${px}px  <${el.tagName.toLowerCase()}${el.className ? " ." + String(el.className).trim().split(/\s+/).join(".") : ""}> "${el.textContent.trim().slice(0, 50)}"  ${cs.color}`);
      }
      return out;
    });
    expect(fails, "Text below WCAG AA as rendered").toEqual([]);
  });
}
