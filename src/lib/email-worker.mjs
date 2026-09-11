const MAX_BATCH_SIZE = 100;

function confirmationLines(row, games) {
  const pickedTeams = new Map((row.confirmation?.picks ?? []).map((pick) => [Number(pick.game_id), Number(pick.team_id)]));
  return games.filter(game => pickedTeams.has(Number(game.game_id))).map((game) => {
    const choice = pickedTeams.get(Number(game.game_id));
    if (choice !== Number(game.away_team_id) && choice !== Number(game.home_team_id)) throw new Error("Invalid saved pick snapshot");
    const team = choice === Number(game.away_team_id) ? game.away_name : game.home_name;
    return game.away_name + " at " + game.home_name + ": " + team;
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function confirmationEmail(row, games, sender, replyTo) {
  const lines = confirmationLines(row, games);
  return {
    from: sender,
    to: [row.email],
    subject: "Fukuma Football: Week " + row.week + " picks received",
    text: ["Your Week " + row.week + " picks for " + row.year + " are saved.", "", ...lines].join("\n"),
    html: "<p>Your Week " + row.week + " picks for " + row.year + " are saved.</p><ul>" + lines.map((line) => "<li>" + escapeHtml(line) + "</li>").join("") + "</ul>",
    reply_to: replyTo || undefined,
  };
}

export async function processEmailOutbox(client, send, limit = 25) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_BATCH_SIZE) throw new Error("Batch size must be between 1 and " + MAX_BATCH_SIZE + ".");
  const lock = await client.query("select pg_try_advisory_lock(7062026,1) as locked");
  if (!lock.rows[0]?.locked) return { attempted:0,sent:0,failed:0,disabled:false,busy:true };
  try {
    const settings = await client.query("select enabled, sender_address, reply_to_address from private.email_settings where singleton = true");
    const configuration = settings.rows[0];
    if (!configuration?.enabled) return { attempted:0,sent:0,failed:0,disabled:true };
    if (!configuration.sender_address) throw new Error("Email is enabled but sender_address is not configured.");
    const outbox = await client.query(
      "select o.request_id, o.entry_id, o.year, o.week, o.confirmation, c.email from private.email_outbox o left join private.entry_contact c using (entry_id) " +
      "where o.sent_at is null and o.skipped_at is null and o.attempts < 5 and (o.attempts=0 or o.created_at > clock_timestamp() - interval '23 hours') order by o.created_at,o.request_id limit $1", [limit]);
    let sent=0,failed=0;
    for (const row of outbox.rows) {
      if (!row.email) {
        await client.query("update private.email_outbox set skipped_at=clock_timestamp(),last_error=null where request_id=$1 and sent_at is null", [row.request_id]);
        continue;
      }
      // Persist before contacting the provider: a crashed process leaves an uncertain
      // attempt, rather than silently treating it as a brand-new delivery.
      await client.query("update private.email_outbox set attempts=attempts+1, last_error='Delivery pending or uncertain' where request_id=$1 and sent_at is null", [row.request_id]);
      try {
        const games = await client.query("select g.game_id,g.away_team_id,g.home_team_id,away.team_name as away_name,home.team_name as home_name from public.game g join public.team away on away.team_id=g.away_team_id join public.team home on home.team_id=g.home_team_id where g.year=$1 and g.week=$2 order by g.game_id", [row.year,row.week]);
        await send(confirmationEmail(row,games.rows,configuration.sender_address,configuration.reply_to_address),row.request_id);
        await client.query("update private.email_outbox set sent_at=clock_timestamp(),last_error=null where request_id=$1 and sent_at is null", [row.request_id]);
        sent++;
      } catch {
        // Provider/connection exceptions can contain recipient data or credentials.
        await client.query("update private.email_outbox set last_error='Delivery failed or uncertain; check provider before manual retry' where request_id=$1 and sent_at is null", [row.request_id]);
        failed++;
      }
    }
    return { attempted:sent+failed,sent,failed,disabled:false };
  } finally { await client.query("select pg_advisory_unlock(7062026,1)"); }
}
