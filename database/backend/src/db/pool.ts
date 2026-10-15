import mysql, {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { ExecuteValues } from "mysql2/typings/mysql/lib/protocol/sequences/Query";
import { env } from "../config/env";

type QueryParam =
  | string
  | number
  | bigint
  | boolean
  | Date
  | null
  | Blob
  | Buffer
  | Uint8Array
  | { [key: string]: ExecuteValues };
export type QueryParams = QueryParam[];

export interface QueryResult<T = RowDataPacket> {
  rows: T[];
  rowCount: number;
  insertId: number;
}

export interface DbConnection {
  query<T = RowDataPacket>(text: string, params?: QueryParams): Promise<QueryResult<T>>;
  executeScript(sql: string): Promise<void>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}

const mysqlPool = mysql.createPool({
  host: env.databaseHost,
  port: env.databasePort,
  user: env.databaseUser,
  password: env.databasePassword,
  database: env.databaseName,
  ssl: env.databaseSsl ? { rejectUnauthorized: true } : undefined,
  connectionLimit: env.databaseConnectionLimit,
  // Close idle connections before the server's wait_timeout does (20s on Hostinger shared
  // MariaDB), so the pool never hands out a connection the server already dropped. mysql2 only
  // runs its idle cleanup when maxIdle < connectionLimit.
  idleTimeout: env.databaseIdleTimeoutMs,
  maxIdle: Math.max(1, env.databaseConnectionLimit - 1),
  enableKeepAlive: true,
  waitForConnections: true,
  queueLimit: 0,
  timezone: "Z",
  supportBigNumbers: true,
  bigNumberStrings: true,
  multipleStatements: true,
});

async function execute<T>(
  connection: Pick<PoolConnection, "execute"> | typeof mysqlPool,
  text: string,
  params?: QueryParams
): Promise<QueryResult<T>> {
  const [result] = await connection.execute<RowDataPacket[] | ResultSetHeader>(
    text,
    params ?? []
  );
  if (Array.isArray(result)) {
    return { rows: result as T[], rowCount: result.length, insertId: 0 };
  }
  return { rows: [], rowCount: result.affectedRows, insertId: result.insertId };
}

function wrapConnection(connection: PoolConnection): DbConnection {
  return {
    query: <T = RowDataPacket>(text: string, params?: QueryParams) =>
      execute<T>(connection, text, params),
    executeScript: async (sql: string) => {
      await connection.query(sql);
    },
    beginTransaction: () => connection.beginTransaction(),
    commit: () => connection.commit(),
    rollback: () => connection.rollback(),
    release: () => connection.release(),
  };
}

export const pool = {
  query: <T = RowDataPacket>(text: string, params?: QueryParams) =>
    execute<T>(mysqlPool, text, params),
  connect: async (): Promise<DbConnection> => wrapConnection(await mysqlPool.getConnection()),
  end: () => mysqlPool.end(),
  on: mysqlPool.on.bind(mysqlPool),
};

mysqlPool.pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'", (err) => {
    if (err) {
      console.error("[db] failed to set session timezone to UTC", err);
      connection.destroy();
    }
  });
  connection.on("error", (err) => {
    console.error("[db] unexpected connection error", err);
  });
});

export async function withTransaction<T>(fn: (client: DbConnection) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.beginTransaction();
    try {
      const result = await fn(client);
      await client.commit();
      return result;
    } catch (err) {
      try {
        await client.rollback();
      } catch (rollbackError) {
        throw new AggregateError([err, rollbackError], "Transaction failed and rollback also failed");
      }
      throw err;
    }
  } finally {
    client.release();
  }
}
