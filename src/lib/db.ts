import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

export function getDb() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not defined in environment variables");
    }
    _sql = neon(url);
  }
  return _sql;
}

export const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
  const db = getDb();
  return db(strings, ...values);
};
