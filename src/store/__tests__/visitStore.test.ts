import { useVisitStore } from "../visitStore";
import { useRouteStore } from "../routeStore";
import { getAllVisits, upsertVisit, updatePointStatus } from "../../storage/database";
import { syncPendingVisits } from "../../services/syncService";
import { Visit } from "../../types";

jest.mock("../../storage/database", () => ({
  getAllVisits: jest.fn(),
  upsertVisit: jest.fn(),
  updatePointStatus: jest.fn(),
}));

jest.mock("../../services/syncService", () => ({
  syncPendingVisits: jest.fn(),
}));

const visit: Visit = {
  pointId: 101,
  installationCode: "LEIT-ALD-0001",
  meterNumber: "MED-10001",
  previousReading: 12874,
  currentReading: 12932,
  latitude: -3.7288,
  longitude: -38.5164,
  capturedAt: "2026-08-20T14:32:00",
  photo: "local-uri",
  syncStatus: "pending",
};

describe("useVisitStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAllVisits as jest.Mock).mockResolvedValue([visit]);
    useVisitStore.setState({ visits: [], syncing: false });
    jest.spyOn(useRouteStore.getState(), "refreshPointStatus");
  });

  it("completeVisit persists the visit, updates point status, and reloads visits", async () => {
    await useVisitStore.getState().completeVisit(visit);

    expect(upsertVisit).toHaveBeenCalledWith(visit);
    expect(updatePointStatus).toHaveBeenCalledWith(101, "visited");
    expect(getAllVisits).toHaveBeenCalled();
    expect(useVisitStore.getState().visits).toEqual([visit]);
  });

  it("completeVisit persists the point status before/alongside the in-memory update", async () => {
    const refreshSpy = jest.spyOn(useRouteStore.getState(), "refreshPointStatus");

    await useVisitStore.getState().completeVisit(visit);

    expect(refreshSpy).toHaveBeenCalledWith(101, "visited");
  });

  it("syncAll toggles syncing state and delegates to syncPendingVisits", async () => {
    (syncPendingVisits as jest.Mock).mockResolvedValue(undefined);

    const promise = useVisitStore.getState().syncAll([101]);
    expect(useVisitStore.getState().syncing).toBe(true);

    await promise;

    expect(syncPendingVisits).toHaveBeenCalledWith(expect.any(Function), [101]);
    expect(useVisitStore.getState().syncing).toBe(false);
  });
});
