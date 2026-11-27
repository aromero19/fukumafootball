"use client";
import { usePathname } from "next/navigation";
import SignOut from "@/components/admin-sign-out";
import Link from "next/link";
// Each protected page and action checks authorization; login must stay reachable.

// Address, tab label, page heading. Weekly jobs come first.
const sections = [
  ["/admin", "Overview", "League admin"],
  ["/admin/games", "Games", "Games & results"],
  ["/admin/seasons", "Weeks", "Seasons & weeks"],
  ["/admin/players", "Players", "Players"],
  ["/admin/corrections", "Fix picks", "Pick corrections"],
  ["/admin/rules", "Rules", "Rules & message"],
  ["/admin/themes", "Themes", "Themes & images"],
  ["/admin/email", "Email", "Email"],
] as const;

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return children;
  const [current, , heading] = sections.find(([href]) => href === pathname) ?? sections[0];
  return <section className="admin-shell">
    <div className="page-band is-admin"><div><div className="band-eyebrow">Admin</div><h1>{heading}</h1></div><SignOut /></div>
    <nav className="admin-tabs" aria-label="Admin sections">{sections.map(([href, label]) => <Link key={href} href={href} aria-current={href === current ? "page" : undefined}>{label}</Link>)}</nav>
    {children}
  </section>;
}
