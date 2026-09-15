"use client";
import { useState } from "react";

export default function ProfileAvatar({ url, small = false }: { url?: string | null; small?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const className = `profile-avatar${small ? " small" : ""}`;
  if (url && failed !== url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={url} width={small ? 36 : 96} height={small ? 36 : 96} alt="" loading="lazy" onError={() => setFailed(url)} />;
  }
  return <svg className={className} viewBox="0 0 96 96" width={small ? 36 : 96} height={small ? 36 : 96} aria-hidden="true">
    <rect width="96" height="96" rx="48" fill="#edf0f2" />
    <circle cx="48" cy="34" r="17" fill="#9aa3ab" />
    <path d="M17 88v-9a31 25 0 0 1 62 0v9" fill="#9aa3ab" />
  </svg>;
}
