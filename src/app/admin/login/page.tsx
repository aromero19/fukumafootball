import AdminLoginForm from "@/components/admin-login-form";

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <div className="card narrow-card">
    <div className="eyebrow">Administrators only</div>
    <h1>League admin</h1>
    <p className="muted">Sign in with an account on the administrator allowlist.</p>
    {error && <p className="status">This account is not authorized for league administration.</p>}
    <AdminLoginForm />
  </div>;
}
