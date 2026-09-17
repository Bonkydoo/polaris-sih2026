// Pure decision logic for the Weather Feed Simulator agent — see
// reorder-forecaster/logic.ts for why this is split from index.ts.

export type RawForecast = { windSpeedKts: number; seaStateM: number; visibilityKm: number; pressureHpa: number };

export function riskScoreFrom(f: RawForecast): number {
  const windRisk = Math.min(100, (f.windSpeedKts / 60) * 100);
  const seaRisk = Math.min(100, (f.seaStateM / 8) * 100);
  const visRisk = Math.min(100, ((15 - f.visibilityKm) / 15) * 100);
  const pressureRisk = Math.min(100, Math.max(0, ((1000 - f.pressureHpa) / 60) * 100));
  return Math.round(windRisk * 0.35 + seaRisk * 0.3 + visRisk * 0.15 + pressureRisk * 0.2);
}
