# Visual tests for kithfold.ai

Checks colours, animation and fonts on every page. Dev-only: nothing here ships,
and the site itself still has no build step.

```bash
cd tests/visual
npm install            # first time only
npx playwright install chromium   # first time only, on a Mac
npm test               # run everything
npm run test:update    # accept new screenshots after an intended design change
npm run report         # open the HTML report with diffs
```

| File | What fails the run |
|---|---|
| `colours.spec.mjs` | A text colour token under 4.5:1 on the oat/white grounds; the same colour role with different hex values on different pages; a dark page background (also checked with the OS in dark mode); any rendered text under WCAG AA |
| `motion.spec.mjs` | Anything still moving with Reduce Motion on; text left invisible with Reduce Motion on; scroll reveals that never reveal; loops faster than 0.8s, linear loops, or entrances delayed over 3s |
| `fonts.spec.mjs` | A font request failing; text falling back to a non-brand font; a weight or italic used that was never downloaded (the browser fakes it); the h1 not in Fraunces |
| `screenshots.spec.mjs` | Any pixel change against the saved baselines, desktop and mobile |
