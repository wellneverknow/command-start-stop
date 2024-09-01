import ms from "ms";
import { Label } from "../types";

export function calculateDurations(labels: Label[]): number[] {
  // from shortest to longest
  const durations: number[] = [];

  labels.forEach((label: Label) => {
    const matches = label.name.match(/<(\d+)\s*(\w+)/);
    if (matches && matches.length >= 3) {
      const number = parseInt(matches[1]);
      const unit = matches[2];
      const duration = ms(`${number} ${unit}`) / 1000;
      durations.push(duration);
    }
  });

  return durations.sort((a, b) => a - b);
}
