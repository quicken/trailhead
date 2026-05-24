import { describe, it, expect } from "vitest";

describe("Smoke test", () => {
  it("basic math works", () => {
    expect(1 + 1).toBe(2);
  });

  it("can import React", async () => {
    const React = await import("react");
    expect(React).toBeDefined();
    expect(React.useState).toBeDefined();
  });
});
