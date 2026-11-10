import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("hello-world entry point", () => {
  it("renders a heading and introduction into the main landmark", async () => {
    const children = [];
    const app = { append: (...elements) => children.push(...elements) };
    const querySelector = vi.fn(() => app);
    vi.stubGlobal("document", {
      querySelector,
      createElement: (tagName) => ({ tagName, textContent: "" }),
    });

    await import("../src/main.ts");

    expect(querySelector).toHaveBeenCalledWith("#app");
    expect(children).toEqual([
      { tagName: "h1", textContent: "Hello, world!" },
      { tagName: "p", textContent: "Your next static web app starts here." },
    ]);
  });

  it("explains a missing main element instead of silently rendering nothing", async () => {
    vi.stubGlobal("document", { querySelector: () => null });

    await expect(import("../src/main.ts")).rejects.toThrow(
      "The page is missing its #app main element.",
    );
  });
});
