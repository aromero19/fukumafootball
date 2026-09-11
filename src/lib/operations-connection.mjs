import pg from "pg";
import { InputError } from "./validation.mjs";
export async function connectOperations() {
  if (!process.env.FUKUMA_DATABASE_URL) throw new InputError("The server-only operations connection is not configured. Ask the operator to configure it before saving.");
  const client = new pg.Client({ connectionString: process.env.FUKUMA_DATABASE_URL, connectionTimeoutMillis: 5000, statement_timeout: 15000, idle_in_transaction_session_timeout: 20000 });
  try { await client.connect(); return client; }
  catch { await client.end().catch(() => {}); throw new InputError("The operations connection is unavailable. No change was confirmed; please retry later."); }
}
