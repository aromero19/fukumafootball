import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageFileProblem, uploadImage, withImageTimeout } from '../src/lib/image-upload-request.mjs';

const image = new Blob(['prepared image'], { type: 'image/webp' });

test('returns the saved photo URL and sends the prepared image', async () => {
  const result = await uploadImage('kind=profile&entry=1', image, { fetcher: async (url, options) => {
    assert.equal(url, '/api/images?kind=profile&entry=1');
    assert.equal(options.body, image);
    assert.equal(options.headers['Content-Type'], 'image/webp');
    return Response.json({ ok: true, url: 'https://example.com/photo.webp' });
  } });
  assert.equal(result.url, 'https://example.com/photo.webp');
});

test('stalled requests time out and are aborted even if fetch never settles', async () => {
  let signal;
  await assert.rejects(uploadImage('kind=profile&entry=1', image, {
    timeoutMs: 10,
    fetcher: (_, options) => { signal = options.signal; return new Promise(() => {}); },
  }), /taking too long.*Refresh and check/);
  assert.equal(signal.aborted, true);
});

test('deadline also covers a stalled response body', async () => {
  await assert.rejects(uploadImage('kind=profile&entry=1', image, {
    timeoutMs: 10,
    fetcher: async () => ({ json: () => new Promise(() => {}) }),
  }), /taking too long/);
});

test('shows server errors and explains non-JSON gateway failures', async () => {
  await assert.rejects(uploadImage('', image, {
    fetcher: async () => Response.json({ ok: false, message: 'Image uploads are not configured yet.' }, { status: 503 }),
  }), /not configured/);
  await assert.rejects(uploadImage('', image, {
    fetcher: async () => new Response('<html>Gateway timeout</html>', { status: 504 }),
  }), /Refresh and check your photo/);
});

test('stalled preparation rejects and invokes resource cleanup', async () => {
  let expired = false;
  await assert.rejects(withImageTimeout(new Promise(() => {}), 10, 'Preparation timed out', () => { expired = true; }), /Preparation timed out/);
  assert.equal(expired, true);
});

test('accepts camera-size JPEG profile photos, including oddly labelled ones', () => {
  const mb = 1024 * 1024;
  for (const file of [
    { type: 'image/jpeg', name: 'IMG_1.JPG', size: 6 * mb },
    { type: '', name: 'photo.jpeg', size: mb },
    { type: 'image/jpg', name: 'photo', size: mb },
    { type: 'image/png', name: 'photo.png', size: mb },
  ]) assert.equal(imageFileProblem(file, true), '');
  assert.match(imageFileProblem({ type: 'image/jpeg', name: 'a.jpg', size: 16 * mb }, true), /smaller than 15 MB/);
  assert.match(imageFileProblem({ type: 'image/gif', name: 'a.gif', size: mb }, true), /JPEG, PNG, or WebP/);
  assert.match(imageFileProblem({ type: 'image/jpeg', name: 'a.jpg', size: 6 * mb }, false), /smaller than 5 MB/);
});
