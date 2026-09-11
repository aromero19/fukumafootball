"use client";
import { useState } from "react";

export default function TeamImage({ urls }: { urls: string[] }) {
  const [failed, setFailed] = useState<string[]>([]);
  const src = urls.find(url => !failed.includes(url));
  if (!src) return null;
  // Administrator-provided HTTPS images load in the browser, never through a server proxy.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="team-image" src={src} alt="" width={64} height={64} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(current => [...current, src])} />;
}
