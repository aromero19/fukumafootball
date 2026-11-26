import test from "node:test";
import assert from "node:assert/strict";
import { reminderSummary } from "../src/lib/reminder-summary.mjs";

const base = { enabled: true, day: 3, send_time: "18:00:00", timezone: "America/Denver", has_email: true };

test("reminder summary covers each saved state", () => {
  assert.equal(reminderSummary(base), "On · Wednesdays at 6:00 PM");
  assert.equal(reminderSummary({ ...base, day: 0, send_time: "00:05:00" }), "On · Sundays at 12:05 AM");
  assert.equal(reminderSummary({ ...base, day: 6, send_time: "12:30" }), "On · Saturdays at 12:30 PM");
  assert.equal(reminderSummary({ ...base, enabled: false }), "Off");
  assert.equal(reminderSummary({ ...base, has_email: false }), "Off · needs an email on file");
  assert.equal(reminderSummary(null), "Couldn’t load");
});
