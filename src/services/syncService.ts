import { getAllVisits, updateVisitSyncStatus } from "../storage/database";
import { Visit, SyncStatus } from "../types";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Only simulate sync failures in the developer version (__DEV__) — a
// release build (assembleRelease) always succeeds, since the failure rate
// exists to let testers exercise the "error" sync state, not to represent
// real-world reliability.
const SIMULATED_FAILURE_RATE = __DEV__
  ? Number(process.env.EXPO_PUBLIC_SIMULATED_FAILURE_RATE ?? "0.2")
  : 0;

async function syncVisit(
  visit: Visit,
  onStatusChange: (pointId: number, status: SyncStatus) => void,
): Promise<void> {
  onStatusChange(visit.pointId, "syncing");
  await updateVisitSyncStatus(visit.pointId, "syncing");

  await delay(800 + Math.random() * 700);

  const status: SyncStatus =
    Math.random() < SIMULATED_FAILURE_RATE ? "error" : "synced";

  onStatusChange(visit.pointId, status);
  await updateVisitSyncStatus(visit.pointId, status);
}

// pointIds, when given, restricts the sync run to that subset — lets the
// user pick which pending visits to send instead of always syncing
// everything. Omit it (or pass undefined) to sync all pending/error visits,
// same as before.
export async function syncPendingVisits(
  onStatusChange: (pointId: number, status: SyncStatus) => void,
  pointIds?: number[],
): Promise<void> {
  const visits = await getAllVisits();
  const selected = pointIds ? new Set(pointIds) : null;
  const pending = visits.filter(
    (v) =>
      (v.syncStatus === "pending" || v.syncStatus === "error") &&
      (!selected || selected.has(v.pointId)),
  );

  for (const visit of pending) {
    await syncVisit(visit, onStatusChange);
  }
}
