export type SyncStatus = "pending" | "syncing" | "synced" | "error";

export interface RoutePoint {
  id: number;
  order: number;
  installationCode: string;
  customer: string;
  referencePoint: string;
  address: string;
  latitude: number;
  longitude: number;
  meterNumber: string;
  previousReading: number;
  status: string;
}

export interface Route {
  routeId: string;
  routeName: string;
  date: string;
  city: string;
  state: string;
  neighborhood: string;
  status: string;
  points: RoutePoint[];
}

export interface Visit {
  pointId: number;
  installationCode: string;
  meterNumber: string;
  previousReading: number;
  currentReading: number;
  latitude: number;
  longitude: number;
  capturedAt: string;
  photo: string;
  syncStatus: SyncStatus;
}
