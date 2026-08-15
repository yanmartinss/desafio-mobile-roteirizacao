import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL, DB_NAME, Migration, MIGRATIONS } from "./schema";
import { Route, RoutePoint, Visit, SyncStatus } from "../types";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(CREATE_TABLES_SQL);
      await runMigrations(db);
      return db;
    });
  }
  return dbPromise;
}

// Applies any pending schema migrations, tracked via SQLite's built-in
// `PRAGMA user_version`. CREATE_TABLES_SQL always represents schema version
// 1; a fresh install and a pre-migration install both sit at user_version 0
// after opening, so either way we bump straight to 1 (the baseline schema
// already exists on disk in both cases) before applying anything newer.
export async function runMigrations(
  db: SQLite.SQLiteDatabase,
  migrations: Migration[] = MIGRATIONS,
): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let version = row?.user_version ?? 0;

  if (version === 0) {
    version = 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }

  const pending = migrations
    .filter((m) => m.version > version)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
    version = migration.version;
  }
}

interface RouteRow {
  route_id: string;
  route_name: string;
  date: string;
  city: string;
  state: string;
  neighborhood: string;
  status: string;
}

interface RoutePointRow {
  id: number;
  route_id: string;
  point_order: number;
  installation_code: string;
  customer: string;
  reference_point: string;
  address: string;
  latitude: number;
  longitude: number;
  meter_number: string;
  previous_reading: number;
  status: string;
}

interface VisitRow {
  id: number;
  point_id: number;
  installation_code: string;
  meter_number: string;
  previous_reading: number;
  current_reading: number;
  latitude: number | null;
  longitude: number | null;
  captured_at: string;
  photo: string | null;
  sync_status: SyncStatus;
}

function pointRowToPoint(row: RoutePointRow): RoutePoint {
  return {
    id: row.id,
    order: row.point_order,
    installationCode: row.installation_code,
    customer: row.customer,
    referencePoint: row.reference_point,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    meterNumber: row.meter_number,
    previousReading: row.previous_reading,
    status: row.status,
  };
}

function visitRowToVisit(row: VisitRow): Visit {
  return {
    pointId: row.point_id,
    installationCode: row.installation_code,
    meterNumber: row.meter_number,
    previousReading: row.previous_reading,
    currentReading: row.current_reading,
    latitude: row.latitude,
    longitude: row.longitude,
    capturedAt: row.captured_at,
    photo: row.photo ?? "",
    syncStatus: row.sync_status,
  };
}

export async function insertRouteIfMissing(route: Route): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<RouteRow>(
    "SELECT * FROM routes WHERE route_id = ?",
    [route.routeId],
  );
  if (existing) return;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO routes (route_id, route_name, date, city, state, neighborhood, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        route.routeId,
        route.routeName,
        route.date,
        route.city,
        route.state,
        route.neighborhood,
        route.status,
      ],
    );

    for (const point of route.points) {
      await db.runAsync(
        `INSERT INTO route_points
         (id, route_id, point_order, installation_code, customer, reference_point, address, latitude, longitude, meter_number, previous_reading, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          point.id,
          route.routeId,
          point.order,
          point.installationCode,
          point.customer,
          point.referencePoint,
          point.address,
          point.latitude,
          point.longitude,
          point.meterNumber,
          point.previousReading,
          point.status,
        ],
      );
    }
  });
}

export async function getStoredRoute(): Promise<Route | null> {
  const db = await getDb();
  const routeRow = await db.getFirstAsync<RouteRow>(
    "SELECT * FROM routes LIMIT 1",
  );
  if (!routeRow) return null;

  const pointRows = await db.getAllAsync<RoutePointRow>(
    "SELECT * FROM route_points WHERE route_id = ? ORDER BY point_order ASC",
    [routeRow.route_id],
  );

  return {
    routeId: routeRow.route_id,
    routeName: routeRow.route_name,
    date: routeRow.date,
    city: routeRow.city,
    state: routeRow.state,
    neighborhood: routeRow.neighborhood,
    status: routeRow.status,
    points: pointRows.map(pointRowToPoint),
  };
}

export async function upsertVisit(visit: Visit): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO visits
     (point_id, installation_code, meter_number, previous_reading, current_reading, latitude, longitude, captured_at, photo, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(point_id) DO UPDATE SET
       current_reading = excluded.current_reading,
       latitude = excluded.latitude,
       longitude = excluded.longitude,
       captured_at = excluded.captured_at,
       photo = excluded.photo,
       sync_status = excluded.sync_status`,
    [
      visit.pointId,
      visit.installationCode,
      visit.meterNumber,
      visit.previousReading,
      visit.currentReading,
      visit.latitude,
      visit.longitude,
      visit.capturedAt,
      visit.photo,
      visit.syncStatus,
    ],
  );
}

export async function getVisitForPoint(pointId: number): Promise<Visit | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<VisitRow>(
    "SELECT * FROM visits WHERE point_id = ?",
    [pointId],
  );
  return row ? visitRowToVisit(row) : null;
}

export async function getAllVisits(): Promise<Visit[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<VisitRow>("SELECT * FROM visits");
  return rows.map(visitRowToVisit);
}

export async function updateVisitSyncStatus(
  pointId: number,
  status: SyncStatus,
): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE visits SET sync_status = ? WHERE point_id = ?", [
    status,
    pointId,
  ]);
}

export async function updatePointStatus(
  pointId: number,
  status: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE route_points SET status = ? WHERE id = ?", [
    status,
    pointId,
  ]);
}

export async function resetAllVisits(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM visits;");
  await db.runAsync("UPDATE route_points SET status = 'pending';");
}
