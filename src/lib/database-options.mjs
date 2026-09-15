export function databaseOptions(env = process.env) {
  const connectionString = env.FUKUMA_DATABASE_URL;
  if (!connectionString) throw new Error("Database configuration missing");
  const options = { connectionString, connectionTimeoutMillis: 5000, statement_timeout: 8000 };
  if (!env.FUKUMA_DATABASE_CA_CERT) return options;
  const url = new URL(connectionString);
  // pg connection-string SSL options override an explicit SSL object.
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey", "ssl", "uselibpqcompat"]) url.searchParams.delete(key);
  return { ...options, connectionString: url.toString(), ssl: {
    ca: env.FUKUMA_DATABASE_CA_CERT.replace(/\\n/g, "\n"), rejectUnauthorized: true,
  } };
}
