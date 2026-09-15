import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { PGlite } from '@electric-sql/pglite';
import { normalizeImage, readImageBody, reserveUpload, MAX_UPLOAD_BYTES } from '../src/lib/image-upload.mjs';

test('photos are square WebP with metadata stripped; themes keep proportions', async () => {
  const input = await sharp({ create: { width: 800, height: 400, channels: 3, background: 'red' } }).jpeg().withMetadata().toBuffer();
  const photo = await sharp(await normalizeImage(input, true)).metadata();
  assert.equal(photo.format, 'webp');
  assert.equal(photo.width, 512); assert.equal(photo.height, 512);
  assert.equal(photo.exif, undefined);
  const theme = await sharp(await normalizeImage(input, false)).metadata();
  assert.equal(theme.width, 800); assert.equal(theme.height, 400);
});

test('rejects disguised SVG, invalid data and oversized bodies including chunked requests', async () => {
  await assert.rejects(normalizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'), true));
  await assert.rejects(normalizeImage(Buffer.from('not an image'), true));
  await assert.rejects(normalizeImage(Buffer.alloc(MAX_UPLOAD_BYTES + 1), true));
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(MAX_UPLOAD_BYTES)); controller.enqueue(new Uint8Array(1)); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(readImageBody({ body }));
  assert.equal(cancelled, true);
});

test('persistent limits enforce per-player and global quotas and expire old attempts', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema private; create table private.image_upload_attempt (
      target text, is_profile boolean, created_at timestamptz default now());`);
    // Embedded tests exercise quotas; real advisory-lock concurrency needs PostgreSQL integration.
    const client = { query: (sql, values) => sql.includes('pg_advisory_xact_lock') ? Promise.resolve({ rows: [] }) : db.query(sql, values) };
    for (let i=0; i<5; i++) assert.equal(await reserveUpload(client, 'players/1', true), true);
    assert.equal(await reserveUpload(client, 'players/1', true), false);
    assert.equal(await reserveUpload(client, 'players/2', true), true);
    await db.exec("insert into private.image_upload_attempt select 'other',true,now() from generate_series(1,54)");
    assert.equal(await reserveUpload(client, 'players/3', true), false);
    assert.equal(await reserveUpload(client, 'themes/1/teams/1', false), true);
    await db.exec("update private.image_upload_attempt set created_at=now()-interval '2 hours'");
    assert.equal(await reserveUpload(client, 'players/1', true), true);
    assert.equal((await db.query('select count(*)::int as n from private.image_upload_attempt')).rows[0].n, 1);
  } finally { await db.close(); }
});
