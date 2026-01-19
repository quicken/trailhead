import { describe, it, expect } from "vitest";

describe("Smoke tests", () => {
  it("basic math works", () => {
    expect(1 + 1).toBe(2);
  });

  it("can create DOM elements", () => {
    const div = document.createElement("div");
    div.textContent = "test";
    expect(div.textContent).toBe("test");
  });
});
