import {
  bangkokDateTimeParts,
  isoDay,
} from "./recommendation.rules";
import { generateWeekendRecommendations } from "./recommendation.engine";

const CHECK_INTERVAL_MS = 60_000;
let running = false;

const checkWeekendRecommendations = async () => {
  if (running) return;
  const now = new Date();
  const parts = bangkokDateTimeParts(now);
  if (isoDay(parts.date) !== 7 || parts.hour < 18) return;
  running = true;
  try {
    await generateWeekendRecommendations(now);
  } catch (error) {
    console.error("weekly recommendation scheduler error:", error);
  } finally {
    running = false;
  }
};

export const startRecommendationScheduler = () => {
  void checkWeekendRecommendations();
  const timer = setInterval(() => void checkWeekendRecommendations(), CHECK_INTERVAL_MS);
  timer.unref();
  return timer;
};

