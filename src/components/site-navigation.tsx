"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [["Make picks", "/picks"], ["Standings", "/standings"], ["Results", "/results"], ["History", "/history"], ["Profile", "/profile"], ["Rules", "/rules"]] as const;

export default function SiteNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Main navigation">{links.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(href + "/") ? "page" : undefined}>{label}</Link>)}</nav>;
}
