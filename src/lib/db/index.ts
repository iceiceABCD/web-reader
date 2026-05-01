import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function createDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export { dbToSource } from "./convert";
