import { test, expect } from "@playwright/test";
import { PAGES, scrollThrough } from "./pages.mjs";

const describe = `a => {
  const t = a.effect?.target;
  const id = t ? (t.tagName.toLowerCase() + (t.id ? "#" + t.id : "") + (t.getAttribute?.("class") ? "." + String(t.getAttribute("class")).trim().split(/\\s+/).join(".") : "")) : "?";
  return (a.animationName || a.transitionProperty || "anim") + " on " + id;
}`;

// 1. Reduced motion: nothing keeps moving.
for (const pg of PAGES) {
  test(`reduced motion stops all looping animation on ${pg.name}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(pg.path);
    await scrollThrough(page);
    await page.waitForTimeout(500);
    const moving = await page.evaluate((d) => {
      const name = eval(d);
      return document.getAnimations()
        .filter((a) => a.playState === "running")
        .filter((a) => { const t = a.effect.getComputedTiming(); return t.iterations === Infinity || t.activeDuration > 0; })
        .map(name);
    }, describe);
    expect([...new Set(moving)], "Still animating with prefers-reduced-motion: reduce").toEqual([]);
  });
}

// 2. Reduced motion: no content hidden waiting for an animation that never runs.
for (const pg of PAGES) {
  test(`reduced motion shows all content without scrolling on ${pg.name}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(pg.path);
    await page.waitForTimeout(300);
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll("main *, section *")]
        .filter((el) => el.textContent.trim() && el.children.length === 0)
        .filter((el) => { let o = 1; for (let n = el; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o < 0.1; })
        .filter((el) => !el.closest("[aria-hidden=true]"))
        .map((el) => `<${el.tagName.toLowerCase()}> "${el.textContent.trim().slice(0, 40)}"`)
    );
    expect(hidden, "Invisible text with reduced motion on").toEqual([]);
  });
}

// 3. Normal motion: every scroll reveal actually reveals.
for (const pg of PAGES) {
  test(`scroll reveals end visible on ${pg.name}`, async ({ page }) => {
    await page.goto(pg.path);
    await scrollThrough(page);
    // Wait for every running transition/animation that is not a loop to finish.
    await page.evaluate(() => Promise.all(document.getAnimations()
      .filter((a) => a.effect.getComputedTiming().iterations !== Infinity)
      .map((a) => a.finished.catch(() => {}))));
    const stuck = await page.evaluate(() =>
      [...document.querySelectorAll(".rv, .reveal, [data-reveal]")]
        .filter((el) => !el.closest("[aria-hidden=true]"))
        .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.95)
        .map((el) => `<${el.tagName.toLowerCase()} .${String(el.className).split(" ").join(".")}> "${el.textContent.trim().slice(0, 40)}"`)
    );
    expect(stuck, "Reveal elements still faded out after scrolling past them").toEqual([]);
  });
}

// 4. Motion stays calm: no fast loops (flashing risk), no linear loops, no long entrance waits.
for (const pg of PAGES) {
  test(`animation timing is calm on ${pg.name}`, async ({ page }) => {
    await page.goto(pg.path);
    await scrollThrough(page);
    const issues = await page.evaluate((d) => {
      const name = eval(d);
      const out = [];
      for (const a of document.getAnimations()) {
        const t = a.effect.getComputedTiming();
        const dur = Number(t.duration);
        if (t.iterations === Infinity && dur < 800) out.push(`fast loop ${dur}ms: ${name(a)}`);
        // CSS animations carry their timing function on the keyframes, not the effect.
        const kf = a.effect.getKeyframes?.() ?? [];
        if (t.iterations === Infinity && a.animationName && kf.length && kf.every((k) => k.easing === "linear") && t.easing === "linear") out.push(`linear loop: ${name(a)}`);
        if (Number(t.delay) > 3000) out.push(`entrance delayed ${t.delay}ms: ${name(a)}`);
      }
      return [...new Set(out)];
    }, describe);
    expect(issues).toEqual([]);
  });
}
