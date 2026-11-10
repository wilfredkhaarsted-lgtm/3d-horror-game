import { describe, expect, it } from "vitest";
import { CASES, serve } from "../scripts/shot.mjs";

describe("production browser harness", () => {
  it("covers both hosting paths at narrow and wide viewports", () => {
    expect(CASES.map(({ prefix, width }) => [prefix, width])).toEqual([
      ["/", 390],
      ["/", 1280],
      ["/template-preview/", 390],
      ["/template-preview/", 1280],
    ]);
    expect(new Set(CASES.map(({ name }) => name)).size).toBe(CASES.length);
  });

  it.each([
    ["/%E0%A4%A", 400],
    ["/template-preview/..%2f..%2fLICENSE", 403],
    ["/no-such-asset.js", 404],
  ])("serves %s as an explicit %i, never as a success-shaped page", (url, expected) => {
    let status;
    const response = {
      writeHead: (value) => {
        status = value;
        return response;
      },
      end: () => {},
    };
    serve({ url }, response);
    expect(status).toBe(expected);
  });
});
