export const PAGES = [
  { path: "/", name: "home" },
  { path: "/laws/", name: "laws" },
  { path: "/open-fold/", name: "open-fold" },
  { path: "/privacy/", name: "privacy" },
  { path: "/terms/", name: "terms" },
];

// The brand type system. Anything else rendering means a fallback or a stray font.
export const BRAND_FONTS = ["Fraunces", "Instrument Sans", "JetBrains Mono"];

// Scroll the whole page so scroll-triggered reveals fire, then return to top.
export async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(innerHeight * 0.6));
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 900));
    scrollTo(0, 0);
  });
}
