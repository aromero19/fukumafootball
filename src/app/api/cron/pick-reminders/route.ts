import { timingSafeEqual } from "node:crypto";
import { runEmailDelivery } from "@/lib/email-delivery.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return new Response("Unauthorized", { status: 401 });
  if (process.env.VERCEL_ENV !== "production") return Response.json({ disabled: true });
  try {
    const result = await runEmailDelivery(25, null, true);
    return Response.json(result, { status: result.failed ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Reminder delivery could not finish." }, { status: 503 });
  }
}
