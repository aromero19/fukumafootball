import "server-only";
import { after } from "next/server";
import { runEmailDelivery } from "./email-delivery.mjs";

export function sendConfirmationAfterResponse(requestId: string) {
  // Preview deployments must not deliver production confirmations.
  if (process.env.VERCEL_ENV !== "production") return;
  try {
    after(async () => {
      try {
        const result = await runEmailDelivery(1, requestId);
        if (result.failed || result.busy) console.error("Confirmation remains queued; check Admin Email and retry.");
      } catch {
        console.error("Automatic confirmation failed; saved picks are intact. Check Admin Email and server configuration.");
      }
    });
  } catch {
    // Scheduling failure must never turn a committed pick save into an error.
    console.error("Unable to schedule confirmation; check Admin Email and retry.");
  }
}
