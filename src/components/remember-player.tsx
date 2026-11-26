"use client";

import { useEffect } from "react";
import { PLAYER_COOKIE } from "@/lib/player-cookie";

export default function RememberPlayer({ entry }: { entry: number }) {
  useEffect(() => {
    document.cookie = `${PLAYER_COOKIE}=${entry}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [entry]);
  return null;
}
