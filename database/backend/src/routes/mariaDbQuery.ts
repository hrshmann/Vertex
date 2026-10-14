import { pool, QueryParams } from "../db/pool";
import { RowDataPacket } from "mysql2/promise";

export function query<T = RowDataPacket>(sql: string, params: QueryParams = []) {
  return pool.query<T>(sql, params);
}
