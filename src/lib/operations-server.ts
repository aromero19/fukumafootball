import "server-only";
import { requireAdmin } from "@/lib/admin";
import { connectOperations } from "@/lib/operations-connection.mjs";
import { adminTransaction } from "@/lib/operations.mjs";

export async function operationsAccess() {
  const supabase = await requireAdmin();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Administrator required.");
  return { actorId: user.id, configured: Boolean(process.env.FUKUMA_DATABASE_URL) };
}
export async function operationsDatabase<T>(actorId: string, operation: (client: Awaited<ReturnType<typeof connectOperations>>) => Promise<T>): Promise<T> {
  const client = await connectOperations();
  try { return await adminTransaction(client, actorId, operation); }
  finally { await client.end(); }
}
