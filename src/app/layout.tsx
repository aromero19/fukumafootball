import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Fukuma Family Football", description: "The home of the Fukuma family NFL pick'em league" };
const navigation = [["Make picks", "/picks"], ["Profile", "/profile"], ["Standings", "/standings"], ["Results", "/results"], ["History", "/history"], ["Rules", "/rules"]] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <header className="site-header"><div className="header-inner">
      <Link href="/" className="brand" aria-label="Fukuma Family Football home">
        <Image src="/legacy/fukuma-football-logo.png" alt="" width={54} height={58} priority />
        <span><strong>Fukuma</strong><small>Family Football</small></span>
      </Link>
      <nav aria-label="Main navigation">{navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
    </div></header>
    <main className="page-shell">{children}</main>
    <footer><span>Family football. Friendly competition.</span><Link href="/admin">League admin</Link></footer>
  </body></html>;
}
