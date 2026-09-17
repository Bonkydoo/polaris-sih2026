import { describe, expect, it } from "vitest";
import { contingencySeverity, RISK_THRESHOLD, shouldDraftContingency } from "./logic.ts";

describe("RISK_THRESHOLD", () => {
  it("is 60, matching the query filter in index.ts", () => {
    expect(RISK_THRESHOLD).toBe(60);
  });
});

describe("contingencySeverity", () => {
  it("is critical at or above 80", () => {
    expect(contingencySeverity(80)).toBe("critical");
    expect(contingencySeverity(95)).toBe("critical");
  });

  it("is watch below 80", () => {
    expect(contingencySeverity(79)).toBe("watch");
    expect(contingencySeverity(60)).toBe("watch");
  });
});

describe("shouldDraftContingency", () => {
  it("drafts when there are affected shipments", () => {
    expect(shouldDraftContingency(1, 0)).toBe(true);
  });

  it("drafts when there are affected purchase requisitions", () => {
    expect(shouldDraftContingency(0, 1)).toBe(true);
  });

  it("does not draft when nothing at the station is affected", () => {
    expect(shouldDraftContingency(0, 0)).toBe(false);
  });
});
