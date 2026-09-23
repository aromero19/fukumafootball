"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";

export default function PasswordRecovery() {
  const client = useRef<SupabaseClient | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Checking your recovery link…");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    // Recovery links can be opened in a different browser. Keep this temporary
    // implicit-flow session in memory, separate from the app's SSR cookies.
    client.current ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: true, storageKey: "fukuma-password-recovery" },
    });
    let mounted = true;
    client.current.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      setReady(Boolean(data.user) && !error);
      setMessage(data.user && !error ? "Choose a new password for your account." : "This recovery link is missing, expired, or already used. Request a new recovery email from the league administrator.");
    }).catch(() => { if (mounted) setMessage("Unable to verify this recovery link. Check your connection and try a new recovery email."); });
    return () => { mounted = false; };
  }, []);

  async function submit(form: FormData) {
    if (!client.current || !ready || busy.current) return;
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirm")) { setMessage("The passwords do not match."); return; }
    busy.current = true;
    setPending(true);
    try {
      const { error } = await client.current.auth.updateUser({ password });
      if (error) {
        setMessage(error.code === "same_password" ? "Choose a password different from your previous password." : error.code === "weak_password" ? "Choose a stronger password with a mix of letters, numbers, and symbols." : "The password could not be updated. Your link may have expired; request a new recovery email and try again.");
        return;
      }
      setDone(true);
      setReady(false);
      setMessage("Your password has been updated. You can now sign in with your new password.");
      await client.current.auth.signOut({ scope: "local" });
    } catch { setMessage("Unable to confirm the update. Try signing in with your new password before requesting another recovery email."); }
    finally { busy.current = false; setPending(false); }
  }

  return <><p role="status" aria-live="polite">{message}</p>
    {ready && !done && <form action={submit} className="form-stack"><fieldset disabled={pending} className="form-stack">
      <label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
      <label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" minLength={12} required /></label>
      <small className="muted">Use at least 12 characters. A unique passphrase works well.</small>
      <button className="button" type="submit">{pending ? "Updating…" : "Update password"}</button>
    </fieldset></form>}
    <p><Link href="/admin/login">Back to admin sign-in</Link></p>
  </>;
}
