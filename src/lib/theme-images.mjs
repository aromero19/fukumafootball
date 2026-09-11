export function httpsImageUrl(value) {
  if (typeof value !== "string" || value.length > 2048 || /[\s\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function imageCandidates(images, teamId, themeId, defaultThemeId) {
  const candidates = [];
  for (const id of new Set([themeId, defaultThemeId])) {
    const image = images.find(item => item.active && item.team_id === teamId && item.theme_id === id);
    if (image) for (const url of [image.thumbnail_url, image.image_url]) {
      const safe = httpsImageUrl(url);
      if (safe && !candidates.includes(safe)) candidates.push(safe);
    }
  }
  return candidates;
}
