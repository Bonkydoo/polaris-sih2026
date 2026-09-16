// Weather feed simulator — stands in for a real marine/aviation weather
// provider (TRD "External/Mocked Feeds"). Runs on a cron (e.g. every 6h)
// and writes weather_snapshots rows in the same shape a real feed would.
//
// SWAP POINT: replace generateMockForecast() with a real API call (e.g.
// Open-Meteo Marine, NOAA, a chartered met-office feed) that returns the
// same {windSpeedKts, seaStateM, visibilityKm, pressureHpa} shape, keep
// riskScoreFrom() and everything downstream (weather-contingency-planner)
// unchanged.
import { supabaseAdmin } from "../_shared/supabase-admin.ts";

type RawForecast = { windSpeedKts: number; seaStateM: number; visibilityKm: number; pressureHpa: number };

function generateMockForecast(): RawForecast {
  // Weighted toward calm conditions with an occasional developing system,
  // so the demo doesn't flag every single run.
  const stormy = Math.random() < 0.25;
  return stormy
    ? {
        windSpeedKts: 35 + Math.random() * 30,
        seaStateM: 4 + Math.random() * 4,
        visibilityKm: 1 + Math.random() * 4,
        pressureHpa: 960 + Math.random() * 20,
      }
    : {
        windSpeedKts: 5 + Math.random() * 20,
        seaStateM: 0.5 + Math.random() * 2,
        visibilityKm: 8 + Math.random() * 12,
        pressureHpa: 1000 + Math.random() * 20,
      };
}

function riskScoreFrom(f: RawForecast): number {
  const windRisk = Math.min(100, (f.windSpeedKts / 60) * 100);
  const seaRisk = Math.min(100, (f.seaStateM / 8) * 100);
  const visRisk = Math.min(100, ((15 - f.visibilityKm) / 15) * 100);
  const pressureRisk = Math.min(100, Math.max(0, ((1000 - f.pressureHpa) / 60) * 100));
  return Math.round(windRisk * 0.35 + seaRisk * 0.3 + visRisk * 0.15 + pressureRisk * 0.2);
}

Deno.serve(async () => {
  const supabase = supabaseAdmin();
  const { data: stations, error } = await supabase.from("stations").select("id, name");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const windowStart = new Date();
  const windowEnd = new Date(Date.now() + 72 * 3600 * 1000);
  const rows = [];

  for (const station of stations ?? []) {
    const forecast = generateMockForecast();
    const riskScore = riskScoreFrom(forecast);
    rows.push({
      station_id: station.id,
      source: "simulated-marine-feed-v1",
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      risk_score: riskScore,
      raw_payload: forecast,
    });
  }

  const { error: insertErr } = await supabase.from("weather_snapshots").insert(rows);
  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  return Response.json({ inserted: rows.length });
});
