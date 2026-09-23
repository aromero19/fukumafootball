export async function withImageTimeout(operation, milliseconds, message, onTimeout = () => {}) {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(message));
          onTimeout();
        }, milliseconds);
      }),
    ]);
  } finally { clearTimeout(timer); }
}

export async function uploadImage(destination, image, { fetcher = fetch, timeoutMs = 65000 } = {}) {
  const controller = new AbortController();
  return withImageTimeout((async () => {
    const response = await fetcher(`/api/images?${destination}`, {
      method: 'POST', headers: { 'Content-Type': image.type }, body: image, signal: controller.signal,
    });
    let result;
    try { result = await response.json(); }
    catch { throw new Error('Unable to confirm the image save. Refresh and check your photo before retrying.'); }
    if (!response.ok || !result?.ok || typeof result.url !== 'string')
      throw new Error(result?.message || 'Upload failed. Please retry.');
    return result;
  })(), timeoutMs, 'The image save is taking too long. Refresh and check your photo before retrying.', () => controller.abort());
}
