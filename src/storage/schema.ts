export const DB_NAME = "roteirizacao.db";

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS routes (
  route_id TEXT PRIMARY KEY NOT NULL,
  route_name TEXT NOT NULL,
  date TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS route_points (
  id INTEGER PRIMARY KEY NOT NULL,
  route_id TEXT NOT NULL,
  point_order INTEGER NOT NULL,
  installation_code TEXT NOT NULL,
  customer TEXT NOT NULL,
  reference_point TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  meter_number TEXT NOT NULL,
  previous_reading REAL NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (route_id) REFERENCES routes(route_id)
);

CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  point_id INTEGER NOT NULL UNIQUE,
  installation_code TEXT NOT NULL,
  meter_number TEXT NOT NULL,
  previous_reading REAL NOT NULL,
  current_reading REAL NOT NULL,
  latitude REAL,
  longitude REAL,
  captured_at TEXT NOT NULL,
  photo TEXT,
  sync_status TEXT NOT NULL,
  FOREIGN KEY (point_id) REFERENCES route_points(id)
);
`;

export interface Migration {
  version: number;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  // example:
  // {
  //     version: 2,
  //     sql: `
  //       ALTER TABLE visits ADD COLUMN notes TEXT;
  //       ALTER TABLE visits ADD COLUMN secondary_photo_uri TEXT;
  //       CREATE INDEX IF NOT EXISTS idx_visits_point ON visits(pointId);
  //     `,
  //   },
];
