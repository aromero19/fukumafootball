"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    try {
      const { error } = await createClient().auth.signInWithPassword({ email:String(formData.get("email") ?? "").trim(),password:String(formData.get("password") ?? "") });
      if (error) { setMessage("Sign-in failed. Check your email and password and try again."); return; }
      router.replace("/admin"); router.refresh();
    } catch { setMessage("Sign-in is unavailable. Please try again."); }
    finally { setPending(false); }
  }

  return <form action={submit} className="form-stack">
    <label>Email <input required type="email" name="email" autoComplete="email" /></label>
    <label>Password <input required type="password" name="password" autoComplete="current-password" /></label>
    {message && <p className="status" role="status">{message}</p>}
    <button className="button" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
  </form>;
}
