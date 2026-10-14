import { test, expect } from "@playwright/test";
import { PAGES, BRAND_FONTS } from "./pages.mjs";

for (const pg of PAGES) {
  test(`fonts load and render on ${pg.name}`, async ({ page }) => {
    const failed = [];
    page.on("requestfailed", (r) => /font/.test(r.url()) && failed.push(r.url()));
    page.on("response", (r) => /fonts\.(googleapis|gstatic)/.test(r.url()) && r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
    await page.goto(pg.path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    expect(failed, "Font requests failed").toEqual([]);

    const report = await page.evaluate((brand) => {
      const loaded = [...document.fonts].filter((f) => f.status === "loaded");
      const loadedFamilies = new Set(loaded.map((f) => f.family.replace(/"/g, "")));
      // Weight ranges actually downloaded, per family ("400" or "400 600" for variable fonts).
      const ranges = {};
      for (const f of loaded) {
        const fam = f.family.replace(/"/g, "");
        const [lo, hi = lo] = f.weight.split(" ").map(Number);
        (ranges[fam] ??= []).push([lo, hi, f.style]);
      }
      const used = {}, stray = new Set(), faux = new Set();
      for (const el of document.querySelectorAll("body *")) {
        if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const cs = getComputedStyle(el);
        const first = cs.fontFamily.split(",")[0].trim().replace(/["']/g, "");
        if (!brand.includes(first)) { stray.add(`${first} on <${el.tagName.toLowerCase()}>`); continue; }
        const w = parseInt(cs.fontWeight, 10), style = cs.fontStyle === "italic" ? "italic" : "normal";
        (used[first] ??= new Set()).add(`${w}${style === "italic" ? "i" : ""}`);
        const ok = (ranges[first] ?? []).some(([lo, hi, s]) => w >= lo && w <= hi && (s === style || (style === "normal" && s === "normal")));
        if (!ok) faux.add(`${first} ${w}${style === "italic" ? " italic" : ""} (browser fakes it) e.g. <${el.tagName.toLowerCase()}> "${el.textContent.trim().slice(0, 30)}"`);
      }
      return {
        missing: brand.filter((f) => used[f] && !loadedFamilies.has(f)),
        stray: [...stray],
        faux: [...faux],
        used: Object.fromEntries(Object.entries(used).map(([k, v]) => [k, [...v].sort()])),
        headingFont: getComputedStyle(document.querySelector("h1") ?? document.body).fontFamily,
      };
    }, BRAND_FONTS);

    test.info().annotations.push({ type: "fonts used", description: JSON.stringify(report.used) });
    expect(report.missing, "Brand font used but never loaded (falling back to Georgia/system)").toEqual([]);
    expect(report.stray, "Text rendering in a non-brand font").toEqual([]);
    expect(report.faux, "Weight/style used that was not downloaded").toEqual([]);
    expect(report.headingFont).toMatch(/Fraunces/);
  });
}
