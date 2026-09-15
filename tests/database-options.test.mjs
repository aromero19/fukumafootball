import test from "node:test";
import assert from "node:assert/strict";
import { databaseOptions } from "../src/lib/database-options.mjs";

test("Vercel CA configuration overrides URL SSL options without disabling verification", () => {
  const options = databaseOptions({
    FUKUMA_DATABASE_URL: "postgres://user:password@example.test:5432/db?sslmode=no-verify&sslrootcert=C%3A%2Flocal.crt&uselibpqcompat=true&application_name=football",
    FUKUMA_DATABASE_CA_CERT: "certificate\\ncontents",
  });
  const url = new URL(options.connectionString);
  for (const key of ["sslmode", "sslrootcert", "uselibpqcompat"]) assert.equal(url.searchParams.has(key), false);
  assert.equal(url.searchParams.get("application_name"), "football");
  assert.deepEqual(options.ssl, { ca: "certificate\ncontents", rejectUnauthorized: true });
});

test("local file certificate configuration remains supported", () => {
 const url="postgres://user:password@example.test:5432/db?sslmode=verify-full&sslrootcert=local.crt";
 assert.equal(databaseOptions({FUKUMA_DATABASE_URL:url}).connectionString,url);
 assert.throws(()=>databaseOptions({}),/configuration missing/);
});
