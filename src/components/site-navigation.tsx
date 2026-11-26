"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const icons = {
  home: "M3 11 12 3l9 8v10h-6v-6H9v6H3z",
  picks: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z",
  standings: "M4 20V10h4v10zm6 0V4h4v16zm6 0v-7h4v7z",
  results:
    "M7 3h10v3h4v2a5 5 0 0 1-4.5 5A5 5 0 0 1 13 15.9V19h4v2H7v-2h4v-3.1A5 5 0 0 1 7.5 13 5 5 0 0 1 3 8V6h4z",
  more: "M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z",
};

const mainLinks = [
  ["Home", "/", "home"],
  ["Picks", "/picks", "picks"],
  ["Standings", "/standings", "standings"],
  ["Results", "/results", "results"],
] as const;

const moreLinks = [
  ["History", "/history", "history"],
  ["Profile", "/profile", "pages"],
  ["Rules", "/rules", "pages"],
] as const;

function Icon({ name }: { name: keyof typeof icons }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={icons[name]} />
    </svg>
  );
}

export default function SiteNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isCurrent = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  const currentMore = moreLinks.find(([, href]) => isCurrent(href));

  return (
    <nav
      className="site-nav"
      aria-label="Main navigation"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      {mainLinks.map(([label, href, section]) => (
        <Link
          key={href}
          href={href}
          data-section={section}
          aria-current={isCurrent(href) ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          <Icon name={section} />
          {label}
        </Link>
      ))}
      {moreLinks.map(([label, href, section]) => (
        <Link
          key={href}
          href={href}
          className="nav-secondary"
          data-section={section}
          aria-current={isCurrent(href) ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
      <button
        type="button"
        className={`nav-more${currentMore ? " is-current" : ""}`}
        data-section={currentMore?.[2] ?? "pages"}
        aria-expanded={open}
        aria-controls="nav-more-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="more" />
        More
      </button>
      <div className="nav-more-panel" id="nav-more-panel" hidden={!open}>
        {moreLinks.map(([label, href, section]) => (
          <Link
            key={href}
            href={href}
            data-section={section}
            aria-current={isCurrent(href) ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
