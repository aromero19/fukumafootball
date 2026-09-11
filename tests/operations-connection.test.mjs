import test from "node:test";
import assert from "node:assert/strict";
import { connectionFailure } from "../src/lib/operations-connection.mjs";

test("connection diagnostics never expose driver messages or unknown codes", () => {
  const secret = "postgres://user:private-password@private-host/db";
  for (const code of ["28P01", "ENOTFOUND", "ENETUNREACH", "ETIMEDOUT", "SELF_SIGNED_CERT_IN_CHAIN", "53300", "ERR_INVALID_URL", secret]) {
    const result = connectionFailure({ code, message: secret });
    assert.equal(result.length, 2);
    assert.ok(!JSON.stringify(result).includes(secret));
    assert.ok(!JSON.stringify(result).includes("private-password"));
  }
  assert.equal(connectionFailure({ code: "28P01" })[0], "authentication");
  assert.equal(connectionFailure({ code: "SELF_SIGNED_CERT_IN_CHAIN" })[0], "tls");
  assert.equal(connectionFailure(new Error("Connection terminated due to connection timeout"))[0], "connection");
  assert.equal(connectionFailure(null)[0], "unknown");
});
