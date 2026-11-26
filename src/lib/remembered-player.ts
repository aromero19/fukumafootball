import { cookies } from "next/headers";
import { queryNumber } from "@/lib/data";
import { PLAYER_COOKIE } from "@/lib/player-cookie";

// A convenience on this device only. Profiles stay on the honor system.
export async function rememberedPlayer() {
  const value = (await cookies()).get(PLAYER_COOKIE)?.value;
  return queryNumber(value, 1, Number.MAX_SAFE_INTEGER);
}
