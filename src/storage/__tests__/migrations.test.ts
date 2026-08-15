import { runMigrations } from "../database";
import { Migration } from "../schema";

function makeFakeDb(initialUserVersion: number) {
  let userVersion = initialUserVersion;
  const execAsync = jest.fn(async (sql: string) => {
    const match = sql.match(/PRAGMA user_version\s*=\s*(\d+)/);
    if (match) {
      userVersion = Number(match[1]);
    }
  });
  const getFirstAsync = jest.fn(async () => ({ user_version: userVersion }));
  const withTransactionAsync = jest.fn(async (fn: () => Promise<void>) => {
    await fn();
  });

  return {
    db: { execAsync, getFirstAsync, withTransactionAsync } as any,
    getUserVersion: () => userVersion,
    execAsync,
    withTransactionAsync,
  };
}

describe("runMigrations", () => {
  it("bumps a fresh/pre-migration db (version 0) to version 1 and runs nothing else when there are no migrations", async () => {
    const { db, getUserVersion } = makeFakeDb(0);

    await runMigrations(db, []);

    expect(getUserVersion()).toBe(1);
  });

  it("applies pending migrations in ascending order and advances user_version to the latest", async () => {
    const { db, getUserVersion, execAsync } = makeFakeDb(1);
    const migrations: Migration[] = [
      { version: 3, sql: "ALTER TABLE visits ADD COLUMN third TEXT;" },
      { version: 2, sql: "ALTER TABLE visits ADD COLUMN second TEXT;" },
    ];

    await runMigrations(db, migrations);

    expect(getUserVersion()).toBe(3);
    const sqlCalls = execAsync.mock.calls.map(([sql]) => sql);
    expect(sqlCalls.indexOf("ALTER TABLE visits ADD COLUMN second TEXT;")).toBeLessThan(
      sqlCalls.indexOf("ALTER TABLE visits ADD COLUMN third TEXT;"),
    );
  });

  it("does not re-apply migrations already covered by the current version", async () => {
    const { db, getUserVersion, withTransactionAsync } = makeFakeDb(3);
    const migrations: Migration[] = [
      { version: 2, sql: "ALTER TABLE visits ADD COLUMN second TEXT;" },
      { version: 3, sql: "ALTER TABLE visits ADD COLUMN third TEXT;" },
    ];

    await runMigrations(db, migrations);

    expect(withTransactionAsync).not.toHaveBeenCalled();
    expect(getUserVersion()).toBe(3);
  });
});
