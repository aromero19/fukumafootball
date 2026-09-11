import pg from "pg";
import { InputError } from "./validation.mjs";

export function connectionFailure(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  if (["28P01", "28000"].includes(code)) return ["authentication", "The database rejected the operations login. Check the database username and password."];
  if (["ENOTFOUND", "EAI_AGAIN"].includes(code)) return ["dns", "The operations database hostname could not be resolved."];
  if (["ENETUNREACH", "EHOSTUNREACH"].includes(code)) return ["network", "The operations database is unreachable. Check the Session pooler connection and network access."];
  if (["ETIMEDOUT", "ECONNREFUSED", "ECONNRESET"].includes(code) || /timeout|timed out/i.test(error?.message ?? "")) return ["connection", "The operations database connection timed out or was refused. Check the endpoint and database availability."];
  if (["SELF_SIGNED_CERT_IN_CHAIN", "DEPTH_ZERO_SELF_SIGNED_CERT", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_HAS_EXPIRED", "ERR_TLS_CERT_ALTNAME_INVALID"].includes(code)) return ["tls", "The operations database certificate could not be verified. The operator must check the TLS configuration."];
  if (code === "53300") return ["capacity", "The operations database has no available connections. Please retry shortly."];
  if (code === "ERR_INVALID_URL") return ["configuration", "The operations database connection string is invalid."];
  return ["unknown", "The operations database connection failed. Ask the operator to investigate."];
}

export async function connectOperations() {
  if (!process.env.FUKUMA_DATABASE_URL) throw new InputError("The server-only operations connection is not configured. Ask the operator to configure it before saving.");
  let client;
  try {
    client = new pg.Client({ connectionString: process.env.FUKUMA_DATABASE_URL, connectionTimeoutMillis: 5000, statement_timeout: 15000, idle_in_transaction_session_timeout: 20000 });
    await client.connect();
    return client;
  } catch (error) {
    if (client) await client.end().catch(() => {});
    const [category, message] = connectionFailure(error);
    // Only emit our fixed category; driver messages may contain credentials.
    console.error("Operations connection failed:", category);
    throw new InputError(message + " No changes were saved.");
  }
}
