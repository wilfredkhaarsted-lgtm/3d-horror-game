import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { createSheetHtml } from "../scripts/shot-sheet.mjs";

describe("screenshot sheet command", () => {
  it("runs its entrypoint from a path with spaces and reports missing screenshots", () => {
    const root = mkdtempSync(join(tmpdir(), "shot sheet "));
    const scripts = join(root, "scripts");
    try {
      mkdirSync(scripts);
      for (const name of ["shot-sheet.mjs", "chrome.mjs", "concurrency.mjs"]) {
        copyFileSync(
          fileURLToPath(new URL(`../scripts/${name}`, import.meta.url)),
          join(scripts, name),
        );
      }

      const result = spawnSync(process.execPath, [join(scripts, "shot-sheet.mjs")], {
        encoding: "utf8",
      });

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("No screenshots");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("lays out sorted screenshots in four columns with escaped filename labels", () => {
    const html = createSheetHtml([
      "extra.png",
      'root-wide"<&.png',
      "subpath-wide.png",
      "subpath-narrow.png",
      "root-narrow.png",
    ]);

    expect(html.match(/class="row"/g)).toHaveLength(2);
    expect(html.indexOf("extra.png")).toBeLessThan(html.indexOf("root-narrow.png"));
    expect(html).toContain("root-wide&quot;&lt;&amp;");
    expect(html.indexOf("subpath-narrow.png")).toBeLessThan(html.indexOf("subpath-wide.png"));
    expect(html.match(/<figure>/g)).toHaveLength(5);
    expect(html).toContain("height: 300px");
    expect(html).toContain("font: 18px sans-serif");
    expect(html).toContain("align-items: flex-end");
    expect(html).toContain('<main class="sheet">');
  });
});
