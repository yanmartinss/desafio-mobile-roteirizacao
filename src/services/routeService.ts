import { getStoredRoute, insertRouteIfMissing } from "../storage/database";
import { Route } from "../types";
import { checkIsOnline } from "../hooks/useNetworkStatus";
import mockApiRoute from "../data/rota_aldeota_mira.json";

// Thrown when there's no connectivity AND nothing cached locally yet — the
// one case the UI needs to tell apart from a generic load failure, since it
// calls for a dedicated "you're offline and there's nothing saved" empty
// state instead of a plain error message.
export class OfflineNoCacheError extends Error {
  constructor() {
    super("Sem conexão com a internet e nenhum dado salvo localmente.");
    this.name = "OfflineNoCacheError";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Stands in for a real `GET /route` call: same async, networked shape (swap
// the body for a real fetch() without touching loadRoute below), backed by
// the bundled JSON since this challenge has no live backend.
async function fetchRouteFromApi(): Promise<Route> {
  await delay(300 + Math.random() * 400);
  return mockApiRoute as Route;
}

export async function loadRoute(): Promise<Route> {
  if (await checkIsOnline()) {
    try {
      const route = await fetchRouteFromApi();
      // Insert-if-missing, not upsert: the route is only ever loaded from
      // the "API" once. Point status evolves locally as the user visits
      // each point (see database.ts's updatePointStatus), so overwriting
      // the route on every successful fetch would silently reset that
      // progress back to the API's static payload.
      await insertRouteIfMissing(route);
      const persisted = await getStoredRoute();
      return persisted ?? route;
    } catch {
      // Fetch failed even though connectivity looked fine (e.g. flaky
      // connection) — fall through to the local cache like any other
      // offline case below.
    }
  }

  const stored = await getStoredRoute();
  if (stored) return stored;

  throw new OfflineNoCacheError();
}
