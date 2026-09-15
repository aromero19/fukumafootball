import sharp from 'sharp';

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export async function readImageBody(request) {
  if (!request.body) throw new Error('Choose an image.');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_UPLOAD_BYTES) {
        await reader.cancel();
        throw new Error('The prepared image must be smaller than 2 MB.');
      }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export async function normalizeImage(bytes, profile) {
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) throw new Error('Choose an image smaller than 2 MB.');
  const options = { limitInputPixels: 25_000_000, failOn: 'error' };
  const metadata = await sharp(bytes, options).metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) > 1)
    throw new Error('Choose a still JPEG, PNG, or WebP image.');
  // Decode and re-encode: never trust the supplied extension or MIME type.
  // Sharp strips EXIF (including GPS) unless explicitly asked to preserve it.
  const output = await sharp(bytes, options).rotate().resize(profile
    ? { width: 512, height: 512, fit: 'cover' }
    : { width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 }).toBuffer();
  if (output.length > MAX_UPLOAD_BYTES) throw new Error('Choose a smaller image.');
  return output;
}

export async function reserveUpload(client, target, profile) {
  await client.query('begin');
  try {
    // One shared lock makes the limits atomic across server instances.
    await client.query("select pg_advisory_xact_lock(726431901)");
    await client.query("delete from private.image_upload_attempt where created_at < now() - interval '1 hour'");
    const { rows: [counts] } = await client.query(`select count(*)::int as total,
      count(*) filter (where target = $1 and created_at > now() - interval '10 minutes')::int as recent
      from private.image_upload_attempt where is_profile = $2`, [target, profile]);
    if (counts.total >= (profile ? 60 : 300) || counts.recent >= (profile ? 5 : 20)) {
      await client.query('rollback');
      return false;
    }
    await client.query('insert into private.image_upload_attempt(target,is_profile) values ($1,$2)', [target, profile]);
    await client.query('commit');
    return true;
  } catch (error) { await client.query('rollback'); throw error; }
}
