"use client";
import { useRef, useState, useTransition } from "react";
export type AdminResult = { ok: boolean; message: string };
export default function AdminForm({ action, children, className, resetOnSuccess = false }: { action: (form: FormData) => Promise<AdminResult>; children: React.ReactNode; className?: string; resetOnSuccess?: boolean }) {
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  return <form className={className} onSubmit={event => {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const data = new FormData(form, (event.nativeEvent as SubmitEvent).submitter);
    busy.current = true;
    setState(null);
    startTransition(async () => {
      try {
        const result = await action(data);
        setState(result);
        if (result.ok) {
          if (resetOnSuccess) form.reset();
          form.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name^="confirm_"]').forEach(input => { input.checked = false; });
        }
      } catch { setState({ ok: false, message: "Unable to confirm the save. Refresh and check the record before trying again." }); }
      finally { busy.current = false; }
    });
  }}><fieldset className="admin-fields" disabled={pending}>{children}</fieldset><p className="form-feedback" role={state?.ok ? "status" : "alert"} aria-live="polite">{pending ? "Saving…" : state?.message}</p></form>;
}
