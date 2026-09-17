import { describe, expect, it } from "vitest";
import { riskScoreFrom } from "./logic.ts";

describe("riskScoreFrom", () => {
  it("scores calm conditions low", () => {
    const score = riskScoreFrom({ windSpeedKts: 10, seaStateM: 1, visibilityKm: 15, pressureHpa: 1015 });
    expect(score).toBeLessThan(20);
  });

  it("scores a severe storm high", () => {
    const score = riskScoreFrom({ windSpeedKts: 65, seaStateM: 8, visibilityKm: 0.5, pressureHpa: 940 });
    expect(score).toBeGreaterThan(90);
  });

  it("clamps each sub-score at 100 instead of going negative or over on extreme inputs", () => {
    // Wildly out-of-range inputs (beyond any realistic forecast) must still
    // land in [0, 100] - the per-factor Math.min/max clamps must hold.
    const score = riskScoreFrom({ windSpeedKts: 500, seaStateM: 50, visibilityKm: -10, pressureHpa: 0 });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("is deterministic for the same input", () => {
    const forecast = { windSpeedKts: 22, seaStateM: 2.5, visibilityKm: 9, pressureHpa: 1005 };
    expect(riskScoreFrom(forecast)).toBe(riskScoreFrom(forecast));
  });
});
