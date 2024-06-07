import { Label } from "../../types";
import { calculateLabelValue } from "../../utils/shared";

//  Checks the issue whether it's an open task for public self assignment
export function taskPaymentMetaData(labels: Label[]): {
  eligibleForPayment: boolean;
  timeLabel: string | null;
  priorityLabel: string | null;
  priceLabel: string | null;
} {
  const timeLabels = labels.filter((label) => label.name.includes("Time:"));
  const priorityLabels = labels.filter((label) => label.name.includes("Priority:"));

  const isTask = timeLabels.length > 0 && priorityLabels.length > 0;
  const minTimeLabel = timeLabels.length > 0 ? timeLabels.reduce((a, b) => (calculateLabelValue(a.name) < calculateLabelValue(b.name) ? a : b)) : null;
  const minPriorityLabel =
    priorityLabels.length > 0 ? priorityLabels.reduce((a, b) => (calculateLabelValue(a.name) < calculateLabelValue(b.name) ? a : b)) : null;
  const priceLabel = labels.find((label) => label.name.includes("Price"))?.name || null;

  return {
    eligibleForPayment: isTask,
    timeLabel: minTimeLabel?.name || null,
    priorityLabel: minPriorityLabel?.name || null,
    priceLabel,
  };
}
