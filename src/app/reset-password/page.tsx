import PasswordRecovery from "@/components/password-recovery";

export const metadata = { title: "Reset password | Fukuma Football", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default function ResetPassword() {
  return <div className="card narrow-card"><h1>Reset your password</h1><PasswordRecovery /></div>;
}
