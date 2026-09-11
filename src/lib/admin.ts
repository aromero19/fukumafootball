import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { error } = await supabase.rpc("admin_entry_email", { p_entry_id: 0 });
  if (error) redirect("/admin/login?error=not-authorized");
  return supabase;
}
