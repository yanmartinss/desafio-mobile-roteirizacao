import { create } from "zustand";
import { Visit, SyncStatus } from "../types";
import { getAllVisits, upsertVisit } from "../storage/database";
import { syncPendingVisits } from "../services/syncService";
import { useRouteStore } from "./routeStore";

interface VisitStore {
  visits: Visit[];
  syncing: boolean;
  loadVisits: () => Promise<void>;
  completeVisit: (visit: Visit) => Promise<void>;
  // pointIds lets the caller sync only a chosen subset of pending visits;
  // omit to sync everything pending, as before.
  syncAll: (pointIds?: number[]) => Promise<void>;
}

export const useVisitStore = create<VisitStore>((set, get) => ({
  visits: [],
  syncing: false,

  loadVisits: async () => {
    const visits = await getAllVisits();
    set({ visits });
  },

  completeVisit: async (visit) => {
    await upsertVisit(visit);
    await get().loadVisits();
    useRouteStore.getState().refreshPointStatus(visit.pointId, "visited");
  },

  syncAll: async (pointIds) => {
    set({ syncing: true });
    await syncPendingVisits((pointId, status: SyncStatus) => {
      set((state) => ({
        visits: state.visits.map((v) =>
          v.pointId === pointId ? { ...v, syncStatus: status } : v,
        ),
      }));
    }, pointIds);
    await get().loadVisits();
    set({ syncing: false });
  },
}));
