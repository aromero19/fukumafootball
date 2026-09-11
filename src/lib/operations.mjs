import { InputError } from "./validation.mjs";

// Call only after verifying Supabase Auth on the server. Recheck the allowlist
// in the same transaction so revocation and the privileged work serialize.
export async function adminTransaction(client, actorId, operation) {
  await client.query("begin");
  try {
    const allowed = await client.query("select user_id from private.admin_user where user_id=$1 for share", [actorId]);
    if (!allowed.rows.length) throw new InputError("Administrator access is no longer available.");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [actorId]);
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
export async function savePlayerRecord(client, player) {
  await client.query("set local role authenticated");
  let id = player.entryId;
  if (id) {
    const updated = await client.query("update public.entry set name_first=$2,name_last=$3,active=$4 where entry_id=$1 returning entry_id", [id,player.first,player.last,player.active]);
    if (!updated.rows.length) throw new InputError("Player no longer exists. Refresh the page.");
  } else {
    const created = await client.query("insert into public.entry(name_first,name_last,active) values ($1,$2,$3) returning entry_id", [player.first,player.last,player.active]);
    id = created.rows[0].entry_id;
  }
  await client.query("select public.admin_set_entry_email($1,$2)", [id,player.email]);
  return id;
}
export async function saveEmailConfiguration(client, actorId, settings) {
  const before = await client.query("select enabled,sender_address,reply_to_address from private.email_settings where singleton for update");
  if (!before.rows.length) throw new InputError("Email settings are missing. Contact the operator.");
  await client.query("update private.email_settings set enabled=$1,sender_address=$2,reply_to_address=$3 where singleton", [settings.enabled,settings.sender_address,settings.reply_to_address]);
  await client.query("insert into private.admin_audit(actor_id,action,record_id,reason,before_value,after_value) values ($1,'email_settings',1,'Administrator email configuration',$2,$3)", [actorId,JSON.stringify(before.rows[0]),JSON.stringify(settings)]);
}
export async function retryEmail(client, actorId, requestId) {
  // The worker holds this lock for delivery; never reset an in-flight attempt.
  const lock = await client.query("select pg_try_advisory_xact_lock(7062026,1) as locked");
  if (!lock.rows[0].locked) throw new InputError("Email delivery is running. Retry after the worker finishes.");
  const row = await client.query("update private.email_outbox set attempts=0,last_error=null where request_id=$1 and sent_at is null and attempts>0 returning entry_id", [requestId]);
  if (!row.rows.length) throw new InputError("This message is already sent, queued, or no longer exists.");
  await client.query("insert into private.admin_audit(actor_id,action,record_id,reason,after_value) values ($1,'email_retry',$2,'Administrator accepted possible duplicate delivery',$3)", [actorId,row.rows[0].entry_id,JSON.stringify({ request_id: requestId })]);
}

export async function setDefaultThemeRecord(client, themeId) {
 await client.query("select pg_advisory_xact_lock(7062026,2)");
 await client.query("set local role authenticated");
 const theme=await client.query("select theme_id from public.theme where theme_id=$1 and active for update",[themeId]);
 if(!theme.rows.length)throw new InputError("The default theme must exist and be active.");
 await client.query("update public.theme set is_default=false where is_default and theme_id<>$1",[themeId]);
 await client.query("update public.theme set is_default=true where theme_id=$1",[themeId]);
}
