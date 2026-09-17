import { describe, expect, it } from "vitest";
import { hoursSinceCheckin, isMissedCheckin, missedCheckinSeverity } from "./logic.ts";

describe("hoursSinceCheckin", () => {
  const now = new Date("2026-09-17T12:00:00.000Z");

  it("computes elapsed hours since the last check-in", () => {
    expect(hoursSinceCheckin("2026-09-17T06:00:00.000Z", now)).toBe(6);
  });

  it("returns Infinity when there has never been a check-in", () => {
    expect(hoursSinceCheckin(null, now)).toBe(Infinity);
  });
});

describe("isMissedCheckin", () => {
  it("is missed once hours-since reaches the threshold", () => {
    expect(isMissedCheckin(12, 12)).toBe(true);
    expect(isMissedCheckin(13, 12)).toBe(true);
  });

  it("is not missed just under the threshold", () => {
    expect(isMissedCheckin(11.9, 12)).toBe(false);
  });
});

describe("missedCheckinSeverity", () => {
  it("escalates to critical past 24 hours", () => {
    expect(missedCheckinSeverity(24.1)).toBe("critical");
  });

  it("is high at or below 24 hours", () => {
    expect(missedCheckinSeverity(24)).toBe("high");
    expect(missedCheckinSeverity(12)).toBe("high");
  });
});
