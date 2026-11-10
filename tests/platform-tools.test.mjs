import { describe, expect, it } from "vitest";

import { resolveChromeExecutable } from "../scripts/chrome.mjs";

describe("browser executable discovery", () => {
  it("uses the configured browser path on either platform", () => {
    expect(
      resolveChromeExecutable({
        platform: "win32",
        env: { CHROME_BIN: "D:\\Browsers\\chrome.exe" },
      }),
    ).toBe("D:\\Browsers\\chrome.exe");
  });

  it("uses Chromium by default on Linux", () => {
    expect(resolveChromeExecutable({ platform: "linux", env: {} })).toBe("chromium");
  });

  it("finds Chrome in the standard Windows installation folders", () => {
    const installedChrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

    expect(
      resolveChromeExecutable({
        platform: "win32",
        env: {
          PROGRAMFILES: "C:\\Program Files",
          LOCALAPPDATA: "C:\\Users\\Student\\AppData\\Local",
        },
        exists: (path) => path === installedChrome,
      }),
    ).toBe(installedChrome);
  });

  it("falls back to the Windows PATH command", () => {
    expect(resolveChromeExecutable({ platform: "win32", env: {}, exists: () => false })).toBe(
      "chrome.exe",
    );
  });
});
