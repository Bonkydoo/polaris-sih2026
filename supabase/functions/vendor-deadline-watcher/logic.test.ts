import { describe, expect, it } from "vitest";
import { daysToDeadline, isTrendingLate, poEscalationSeverity, poEscalationStatus } from "./logic.ts";

describe("daysToDeadline", () => {
  const today = new Date("2026-09-17T00:00:00.000Z");

  it("counts whole days remaining until the packing deadline", () => {
    expect(daysToDeadline("2026-09-22T00:00:00.000Z", today)).toBe(5);
  });

  it("is negative once the deadline has passed", () => {
    expect(daysToDeadline("2026-09-10T00:00:00.000Z", today)).toBe(-7);
  });
});

describe("isTrendingLate", () => {
  it("is trending late when there is no committed delivery date at all", () => {
    expect(isTrendingLate(null, "2026-09-22T00:00:00.000Z")).toBe(true);
  });

  it("is trending late when committed delivery falls after the packing deadline", () => {
    expect(isTrendingLate("2026-09-25T00:00:00.000Z", "2026-09-22T00:00:00.000Z")).toBe(true);
  });

  it("is not trending late when committed delivery is on or before the packing deadline", () => {
    expect(isTrendingLate("2026-09-20T00:00:00.000Z", "2026-09-22T00:00:00.000Z")).toBe(false);
    expect(isTrendingLate("2026-09-22T00:00:00.000Z", "2026-09-22T00:00:00.000Z")).toBe(false);
  });
});

describe("poEscalationStatus", () => {
  it("is late once the deadline has already been missed, regardless of trending flag", () => {
    expect(poEscalationStatus(false, true)).toBe("late");
    expect(poEscalationStatus(true, true)).toBe("late");
  });

  it("is at-risk when trending late but the deadline has not passed yet", () => {
    expect(poEscalationStatus(true, false)).toBe("at-risk");
  });

  it("is null when neither condition holds (should not be reached given the caller's guard)", () => {
    expect(poEscalationStatus(false, false)).toBe(null);
  });
});

describe("poEscalationSeverity", () => {
  it("is critical once already missed", () => {
    expect(poEscalationSeverity(true)).toBe("critical");
  });

  it("is watch while only trending late", () => {
    expect(poEscalationSeverity(false)).toBe("watch");
  });
});
