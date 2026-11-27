import { queryNumber } from "@/lib/data";
import { readTrends } from "@/lib/trends-data";

// Read-only. Everything returned is already public on the Results and History pages.
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const read = (name: string, min: number, max: number) =>
    queryNumber(query.get(name) ?? undefined, min, max);
  const year = read("year", 1920, 9999);
  const entry = read("entry", 1, Number.MAX_SAFE_INTEGER);
  const away = read("away", 1, 32);
  const home = read("home", 1, 32);
  const headers = { "Cache-Control": "no-store" };
  if (!year || !entry || !away || !home || away === home)
    return Response.json(
      { ok: false, message: "Choose a valid game." },
      { status: 400, headers },
    );
  try {
    return Response.json(
      { ok: true, teams: await readTrends(year, entry, [away, home]) },
      { headers },
    );
  } catch {
    console.error("Trends read failed");
    return Response.json(
      { ok: false, message: "Trends could not be loaded." },
      { status: 503, headers },
    );
  }
}
