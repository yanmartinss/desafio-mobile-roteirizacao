import { getAllVisits, updateVisitSyncStatus } from "../storage/database";
import { Visit, SyncStatus } from "../types";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SIMULATED_FAILURE_RATE = 0.2;

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

export async function syncAllPending(
  onStatusChange: (pointId: number, status: SyncStatus) => void,
): Promise<void> {
  const visits = await getAllVisits();
  const pending = visits.filter(
    (v) => v.syncStatus === "pending" || v.syncStatus === "error",
  );

  for (const visit of pending) {
    await syncVisit(visit, onStatusChange);
  }
}
