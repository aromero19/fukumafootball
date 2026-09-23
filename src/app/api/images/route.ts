import { randomUUID } from 'node:crypto';
import { createClient as storageClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { connectOperations } from '@/lib/operations-connection.mjs';
import { normalizeImage, readImageBody, reserveUpload } from '@/lib/image-upload.mjs';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const fail = (message: string, status = 400) => Response.json({ ok: false, message }, { status });
  if (request.headers.get('origin') !== new URL(request.url).origin) return fail('Reload the page and try again.', 403);
  const query = new URL(request.url).searchParams;
  const adminProfile = query.get('kind') === 'admin-profile';
  const profile = query.get('kind') === 'profile' || adminProfile;
  if (!profile && query.get('kind') !== 'theme') return fail('Choose an image destination.');
  const id = Number(query.get(profile ? 'entry' : 'theme'));
  const team = Number(query.get('team'));
  if (!Number.isSafeInteger(id) || id < 1 || (!profile && (!Number.isInteger(team) || team < 1 || team > 32)))
    return fail('Choose a valid player or team and theme.');
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key || !process.env.FUKUMA_DATABASE_URL) return fail('Image uploads are not configured yet. Contact the administrator.', 503);
  let actor: string | undefined;
  if (!profile || adminProfile) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = user ? await supabase.rpc('admin_entry_email', { p_entry_id: 0 }) : { error: true };
    if (!user || error) return fail('Sign in as an administrator to upload this image.', 403);
    actor = user.id;
  }
  const storage = storageClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Bound uploads and old-file cleanup, including reading response bodies.
      fetch: (url, options) => fetch(url, {
        ...options,
        signal: options?.signal
          ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
          : AbortSignal.timeout(15000),
      }),
    },
  });
  const bucket = profile ? 'player-photos' : 'team-themes';
  const target = profile ? `players/${id}` : `themes/${id}/teams/${team}`;
  const path = `${target}/${randomUUID()}.webp`;
  let client: Awaited<ReturnType<typeof connectOperations>> | undefined;
  let uploaded = false;
  let saveStarted = false;
  try {
    client = await connectOperations();
    const valid = await client.query(profile
      ? 'select 1 from public.entry where entry_id=$1 and (active or $2)'
      : 'select 1 from public.theme where theme_id=$1', profile ? [id, adminProfile] : [id]);
    if (!valid.rowCount) return fail('That player or theme is unavailable.');
    if (!await reserveUpload(client, target, profile)) return fail('Too many uploads. Please try again later.', 429);
    let bytes;
    try { bytes = await normalizeImage(await readImageBody(request), profile); }
    catch { return fail('Choose a still JPEG, PNG, or WebP image. The prepared file must be under 2 MB and 25 megapixels.'); }
    const { error: uploadError } = await storage.storage.from(bucket).upload(path, bytes, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' });
    if (uploadError) {
      console.error('Image upload failed at storage');
      return fail('The image could not be uploaded. Please retry or contact the administrator.', 503);
    }
    uploaded = true;
    const url = storage.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    await client.query('begin');
    if (actor) {
      const allowed = await client.query('select 1 from private.admin_user where user_id=$1 for share', [actor]);
      if (!allowed.rowCount) throw new Error('Administrator access changed');
    }
    // Serialize replacements for a destination; keep the previous image until commit.
    await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [target]);
    const previous = await client.query(profile
      ? 'select photo_url as url from public.entry where entry_id=$1 and (active or $2) for update'
      : 'select image_url as url from public.team_theme_image where theme_id=$1 and team_id=$2 for update', profile ? [id, adminProfile] : [id, team]);
    if (profile && !previous.rowCount) throw new Error('Player no longer active');
    if (profile) await client.query('update public.entry set photo_url=$2 where entry_id=$1', [id, url]);
    else await client.query(`insert into public.team_theme_image(theme_id,team_id,image_url,thumbnail_url,active)
      values ($1,$2,$3,null,$4) on conflict (team_id,theme_id) do update
      set image_url=excluded.image_url, thumbnail_url=null, active=excluded.active`, [id, team, url, query.get('active') !== 'false']);
    saveStarted = true;
    await client.query('commit');
    // Only delete our own old destination's file if no record still uses its URL.
    const old = previous.rows[0]?.url as string | undefined;
    const prefix = storage.storage.from(bucket).getPublicUrl(`${target}/`).data.publicUrl;
    if (old?.startsWith(prefix) && /^[0-9a-f-]+\.webp$/.test(old.slice(prefix.length))) {
      // A slow old-file deletion must not hide an already-saved photo.
      after(async () => {
        let cleanupClient: Awaited<ReturnType<typeof connectOperations>> | undefined;
        try {
          cleanupClient = await connectOperations();
          const referenced = await cleanupClient.query(`select 1 from public.entry where photo_url=$1 union all
            select 1 from public.team_theme_image where image_url=$1 or thumbnail_url=$1 limit 1`, [old]);
          if (!referenced.rowCount) await storage.storage.from(bucket).remove([`${target}/${old.slice(prefix.length)}`]);
        } catch { /* A cleanup failure must not turn a saved upload into an error. */ }
        finally { await cleanupClient?.end().catch(() => {}); }
      });
    }
    for (const page of ['/profile', '/picks', '/picks/success', '/admin/players', '/admin/themes', '/results', '/standings']) revalidatePath(page);
    return Response.json({ ok: true, url, message: 'Image uploaded and saved.' });
  } catch {
    await client?.query('rollback').catch(() => {});
    // An uncertain commit can have saved the URL: never delete its image.
    if (uploaded && !saveStarted) await storage.storage.from(bucket).remove([path]).catch(() => {});
    return fail('Unable to confirm the image save. Refresh and check before retrying.', 503);
  } finally { await client?.end().catch(() => {}); }
}
