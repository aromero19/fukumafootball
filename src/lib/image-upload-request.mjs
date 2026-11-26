// Profile photos are cropped to 512px before upload, so large camera originals are fine.
export const imageSizeLimitMb = profile => profile ? 15 : 5;

// Some phones label JPEG files oddly or not at all, so .jpg and .jpeg names count too.
export function imageFileProblem(file, profile) {
  const known = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"].includes(file.type) || /\.jpe?g$/i.test(file.name ?? "");
  const limit = imageSizeLimitMb(profile);
  return known && file.size <= limit * 1024 * 1024 ? "" : `Choose a JPEG, PNG, or WebP smaller than ${limit} MB.`;
}

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
