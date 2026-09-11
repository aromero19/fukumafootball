"use server";
import { revalidatePath } from "next/cache";
import { operationsAccess, operationsDatabase } from "@/lib/operations-server";
import { saveEmailConfiguration, retryEmail } from "@/lib/operations.mjs";
import { InputError, emailAddress, text } from "@/lib/validation.mjs";
export async function saveEmailSettings(form: FormData) {
  const { actorId } = await operationsAccess();
  try {
    const enabled = form.get("enabled") === "on";
    if (enabled && form.get("confirm_enable") !== "on") throw new InputError("Confirm that enabling delivery may send queued confirmations.");
    const settings = { enabled, sender_address: emailAddress(text(form,"sender_address",254),enabled), reply_to_address: emailAddress(text(form,"reply_to_address",254),false) };
    await operationsDatabase(actorId, client => saveEmailConfiguration(client,actorId,settings));
    revalidatePath("/admin/email");
    return { ok: true, message: "Email settings saved. Delivery runs only when the separate worker runs." };
  } catch (error) { return { ok: false, message: error instanceof InputError ? error.message : "Unable to confirm the settings save. Refresh before retrying." }; }
}
export async function queueEmailRetry(form: FormData) {
  const { actorId } = await operationsAccess();
  try {
    const id = text(form,"request_id",36,true);
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new InputError("Invalid message reference.");
    if (form.get("confirm_retry") !== "on") throw new InputError("Confirm that retrying could deliver a duplicate email.");
    await operationsDatabase(actorId, client => retryEmail(client,actorId,id));
    revalidatePath("/admin/email");
    return { ok: true, message: "Message queued for the next worker run. No email has been sent by this page." };
  } catch (error) { return { ok: false, message: error instanceof InputError ? error.message : "Unable to queue retry. Refresh and check its status." }; }
}
