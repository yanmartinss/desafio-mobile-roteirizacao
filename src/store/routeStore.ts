import { create } from "zustand";
import { Route } from "../types";
import {
  loadRoute as loadRouteService,
  OfflineNoCacheError,
} from "../services/routeService";

interface RouteStore {
  route: Route | null;
  loading: boolean;
  error: string | null;
  // True when offline with nothing cached locally yet — distinct from
  // `error` so the UI can render a dedicated empty state instead of a
  // generic error message.
  offlineNoCache: boolean;
  loadRoute: () => Promise<void>;
  refreshPointStatus: (pointId: number, status: string) => void;
}

export const useRouteStore = create<RouteStore>((set, get) => ({
  route: null,
  loading: false,
  error: null,
  offlineNoCache: false,

  loadRoute: async () => {
    set({ loading: true, error: null, offlineNoCache: false });
    try {
      const route = await loadRouteService();
      set({ route, loading: false });
    } catch (err) {
      if (err instanceof OfflineNoCacheError) {
        set({ offlineNoCache: true, loading: false });
        return;
      }
      set({
        error: err instanceof Error ? err.message : "Falha ao carregar a rota",
        loading: false,
      });
    }
  },

  refreshPointStatus: (pointId, status) => {
    const route = get().route;
    if (!route) return;
    set({
      route: {
        ...route,
        points: route.points.map((p) =>
          p.id === pointId ? { ...p, status } : p,
        ),
      },
    });
  },
}));
