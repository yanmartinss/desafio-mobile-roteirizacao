import { syncPendingVisits } from "../syncService";
import { getAllVisits, updateVisitSyncStatus } from "../../storage/database";
import { Visit } from "../../types";

jest.mock("../../storage/database", () => ({
  getAllVisits: jest.fn(),
  updateVisitSyncStatus: jest.fn(),
}));

jest.useFakeTimers();

function makeVisit(overrides: Partial<Visit>): Visit {
  return {
    pointId: 1,
    installationCode: "LEIT-ALD-0001",
    meterNumber: "MED-10001",
    previousReading: 12874,
    currentReading: 12932,
    latitude: -3.7288,
    longitude: -38.5164,
    capturedAt: "2026-08-20T14:32:00",
    photo: "local-uri",
    syncStatus: "pending",
    ...overrides,
  };
}

const mockedGetAllVisits = getAllVisits as jest.Mock;

async function runSync(pointIds?: number[]) {
  const onStatusChange = jest.fn();
  const promise = syncPendingVisits(onStatusChange, pointIds);
  await jest.runAllTimersAsync();
  await promise;
  return onStatusChange;
}

describe("syncPendingVisits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("only syncs pending and error visits, skipping already-synced ones", async () => {
    mockedGetAllVisits.mockResolvedValue([
      makeVisit({ pointId: 1, syncStatus: "pending" }),
      makeVisit({ pointId: 2, syncStatus: "synced" }),
      makeVisit({ pointId: 3, syncStatus: "error" }),
    ]);
    jest.spyOn(Math, "random").mockReturnValue(0.9); // force "synced" outcome

    const onStatusChange = await runSync();

    const syncedPointIds = (onStatusChange.mock.calls as [number, string][]).map(
      ([pointId]) => pointId,
    );
    expect(syncedPointIds).toEqual(expect.arrayContaining([1, 1, 3, 3]));
    expect(syncedPointIds).not.toContain(2);
  });

  it("restricts the batch to the given pointIds", async () => {
    mockedGetAllVisits.mockResolvedValue([
      makeVisit({ pointId: 1, syncStatus: "pending" }),
      makeVisit({ pointId: 2, syncStatus: "pending" }),
    ]);
    jest.spyOn(Math, "random").mockReturnValue(0.9);

    const onStatusChange = await runSync([2]);

    const syncedPointIds = new Set(
      (onStatusChange.mock.calls as [number, string][]).map(([pointId]) => pointId),
    );
    expect(syncedPointIds).toEqual(new Set([2]));
  });

  it("reports syncing then the final status, and persists both transitions", async () => {
    mockedGetAllVisits.mockResolvedValue([
      makeVisit({ pointId: 1, syncStatus: "pending" }),
    ]);
    jest.spyOn(Math, "random").mockReturnValue(0); // force "error" outcome

    const onStatusChange = await runSync();

    expect(onStatusChange.mock.calls).toEqual([
      [1, "syncing"],
      [1, "error"],
    ]);
    expect(updateVisitSyncStatus).toHaveBeenNthCalledWith(1, 1, "syncing");
    expect(updateVisitSyncStatus).toHaveBeenNthCalledWith(2, 1, "error");
  });
});
