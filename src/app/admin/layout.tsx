"use client";
import { usePathname } from "next/navigation";
import SignOut from "@/components/admin-sign-out";
import Link from "next/link";
// Each protected page and action checks authorization; login must stay reachable.

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return children;
  return <section className="admin-shell">
    <div className="section-title"><div><div className="eyebrow">Protected area</div><h1>League administration</h1></div><Link className="button secondary" href="/">Family site</Link></div>
    <nav className="toolbar admin-nav"><Link href="/admin">Overview</Link><Link href="/admin/players">Players</Link><Link href="/admin/seasons">Seasons & weeks</Link><Link href="/admin/games">Games</Link><Link href="/admin/themes">Themes</Link><Link href="/admin/corrections">Pick corrections</Link><Link href="/admin/rules">Rules & message</Link><Link href="/admin/email">Email</Link><SignOut /></nav>
    {children}
  </section>;
}
