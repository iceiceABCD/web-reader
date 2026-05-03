import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return drizzle(pool, { schema });
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
