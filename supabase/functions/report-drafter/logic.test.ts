import { describe, expect, it } from "vitest";
import { countByStatus, isFlaggedForReorder } from "./logic.ts";

describe("isFlaggedForReorder", () => {
  it("flags when days remaining is at or below the reorder threshold", () => {
    expect(isFlaggedForReorder(50, 10, 5)).toBe(true); // 5 days remaining <= 5 threshold
  });

  it("does not flag when comfortably above threshold", () => {
    expect(isFlaggedForReorder(100, 10, 5)).toBe(false); // 10 days remaining > 5
  });

  it("never flags a zero-consumption item (infinite runway)", () => {
    expect(isFlaggedForReorder(0, 0, 5)).toBe(false);
  });
});

describe("countByStatus", () => {
  it("tallies items by their status field", () => {
    const result = countByStatus([{ status: "draft" }, { status: "draft" }, { status: "sent" }]);
    expect(result).toEqual({ draft: 2, sent: 1 });
  });

  it("returns an empty object for no items", () => {
    expect(countByStatus([])).toEqual({});
  });
});
