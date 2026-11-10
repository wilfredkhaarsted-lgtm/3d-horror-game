import { defineConfig } from "vite";

/**
 * The build is deliberately path-agnostic.
 *
 * GitHub Pages serves this repository at `/typescript-static-template/`, while
 * `scripts/shot.mjs` serves `dist/` at the root of a local server, and `npm run
 * preview` does the same. A relative base emits `./assets/...`, which is
 * correct in all three, so one build artifact is the one that ships and the one
 * the screenshot run checks. See docs/decisions/Deploy to GitHub Pages from a
 * verified commit.md.
 */
export default defineConfig({
  base: "./",
});
