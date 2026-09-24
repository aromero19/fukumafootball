import { Client } from "pg";
import { databaseOptions } from "./database-options.mjs";
import { processEmailOutbox } from "./email-worker.mjs";
import { processPickReminders } from "./pick-reminder-worker.mjs";

/** @param {number} limit @param {string | null} requestId */
export async function runEmailDelivery(limit = 25, requestId = null, reminders = false) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email configuration missing");
  const client = new Client(databaseOptions());
  try {
    await client.connect();
    const send = async (message, id) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "Idempotency-Key": id },
        body: JSON.stringify(message), signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Provider delivery not confirmed");
    };
    if (reminders) return await processPickReminders(client, send, process.env.FUKUMA_SITE_URL);
    // Wait briefly for concurrent submissions/worker runs, without sending twice.
    const deadline = Date.now() + 15000;
    let result;
    do {
      result = await processEmailOutbox(client, send, limit, requestId);
      if (!result.busy || !requestId || Date.now() >= deadline) return result;
      await new Promise(resolve => setTimeout(resolve, 500));
    } while (true);
  } finally {
    await client.end();
  }
}
