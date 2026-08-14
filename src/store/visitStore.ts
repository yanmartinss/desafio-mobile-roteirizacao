import { create } from "zustand";
import { Visit, SyncStatus } from "../types";
import { getAllVisits, upsertVisit } from "../storage/database";
import { syncAllPending } from "../services/syncService";
import { useRouteStore } from "./routeStore";

interface VisitStore {
  visits: Visit[];
  syncing: boolean;
  loadVisits: () => Promise<void>;
  completeVisit: (visit: Visit) => Promise<void>;
  syncAll: () => Promise<void>;
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

  syncAll: async () => {
    set({ syncing: true });
    await syncAllPending((pointId, status: SyncStatus) => {
      set((state) => ({
        visits: state.visits.map((v) =>
          v.pointId === pointId ? { ...v, syncStatus: status } : v,
        ),
      }));
    });
    await get().loadVisits();
    set({ syncing: false });
  },
}));
