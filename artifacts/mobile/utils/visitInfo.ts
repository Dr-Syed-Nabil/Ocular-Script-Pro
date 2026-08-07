import { Prescription } from "@/types";

/**
 * Compute the label for the NEXT visit a patient will have, or the current visit count.
 *
 * Rules:
 * - Visit number increments with every prescription (V1, V2, V3 …)
 * - NEW  → first ever visit, OR last visit was > 1 month ago
 * - F/U  → last visit was ≤ 1 month ago
 *
 * Return value examples:  "V1NEW"  "V2F/U"  "V3NEW"
 */
export function computeNextVisitLabel(prescriptions: Prescription[]): string {
  const count = prescriptions.length;
  const nextNum = count + 1;

  if (count === 0) {
    return `V${nextNum}NEW`;
  }

  // Find the most recent prescription by createdAt
  const sorted = [...prescriptions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const lastDate = new Date(sorted[0].createdAt);
  const now = new Date();

  // Difference in days
  const diffMs = now.getTime() - lastDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  const isFollowUp = diffDays <= 31; // ~1 month
  return isFollowUp ? `V${nextNum}F/U` : `V${nextNum}NEW`;
}
