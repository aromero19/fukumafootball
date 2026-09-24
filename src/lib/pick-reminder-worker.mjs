export function reminderEmail(row, configuration, siteUrl) {
  const base = new URL(siteUrl);
  if (base.protocol !== "https:" || base.username || base.password) throw new Error("A public HTTPS site URL is required");
  const picks = new URL(`/picks?entry=${row.entry_id}`, base.origin);
  const profile = new URL(`/profile?entry=${row.entry_id}`, base.origin);
  return {
    from: configuration.sender_address,
    to: [row.email],
    reply_to: configuration.reply_to_address || undefined,
    subject: `Fukuma Football: Remember your Week ${row.week} picks`,
    text: `You haven’t submitted your Week ${row.week} picks for ${row.year} yet. The first game is coming up!\n\nMake your picks: ${picks}\n\nAlready submitted? You’re all set.\n\nYou requested this reminder in your Entry Profile. Change your schedule or turn reminders off: ${profile}`,
  };
}

export async function processPickReminders(client, send, siteUrl) {
  const lock = await client.query("select pg_try_advisory_lock(7062026,1) as locked");
  if (!lock.rows[0]?.locked) return { busy: true, sent: 0, failed: 0 };
  let sent = 0, failed = 0;
  const deadline = Date.now() + 40000;
  try {
    const { rows: settings } = await client.query("select enabled,sender_address,reply_to_address from private.email_settings where singleton=true");
    if (!settings[0]?.enabled) return { disabled: true, sent, failed };
    if (!settings[0].sender_address) throw new Error("Email sender is missing");
    const { rows } = await client.query(`select r.* from private.due_pick_reminders(clock_timestamp()) r
      left join private.pick_reminder_delivery d using(entry_id,year,week)
      where d.entry_id is null or (d.sent_at is null and d.attempts < 5
        and d.first_attempt_at > clock_timestamp()-interval '23 hours')
      order by r.first_kickoff,r.entry_id limit 100`);
    for (const row of rows) {
      if (Date.now() >= deadline) break;
      // The saved payload and key remain unchanged across uncertain provider retries.
      const message = reminderEmail(row, settings[0], siteUrl);
      const { rows: deliveries } = await client.query(`insert into private.pick_reminder_delivery(entry_id,year,week,message)
        values($1,$2,$3,$4) on conflict(entry_id,year,week) do update set entry_id=excluded.entry_id
        returning request_id,message`, [row.entry_id,row.year,row.week,JSON.stringify(message)]);
      const delivery = deliveries[0];
      await client.query(`update private.pick_reminder_delivery set attempts=attempts+1,last_error='Delivery pending or uncertain'
        where request_id=$1`, [delivery.request_id]);
      await client.query("begin");
      try {
        // Coordinate with pick submission and administrative edits while delivering.
        await client.query("select entry_id from public.entry where entry_id=$1 for share", [row.entry_id]);
        await client.query("select year from public.season where year=$1 for share", [row.year]);
        await client.query("select week from public.week where year=$1 and week=$2 for share", [row.year,row.week]);
        await client.query("select game_id from public.game where year=$1 and week=$2 order by game_id for share", [row.year,row.week]);
        const eligible = await client.query(`select * from private.due_pick_reminders(clock_timestamp())
          where entry_id=$1 and year=$2 and week=$3`, [row.entry_id,row.year,row.week]);
        // A contact change must not send an old saved payload to a removed address.
        if (eligible.rows[0]?.email === delivery.message.to[0]) {
          await send(delivery.message, delivery.request_id);
          await client.query("update private.pick_reminder_delivery set sent_at=clock_timestamp(),last_error=null where request_id=$1", [delivery.request_id]);
          sent++;
        }
        await client.query("commit");
      } catch {
        await client.query("rollback");
        await client.query("update private.pick_reminder_delivery set last_error='Delivery failed or uncertain; check provider before retry' where request_id=$1", [delivery.request_id]);
        failed++;
      }
    }
    return { sent, failed, disabled: false };
  } finally {
    await client.query("select pg_advisory_unlock(7062026,1)");
  }
}
