"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Today", ico: "●" },
  { href: "/week", label: "Week", ico: "▦" },
  { href: "/history", label: "History", ico: "☰" },
  { href: "/more", label: "More", ico: "⋯" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      <div className="inner">
        {ITEMS.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href) || (it.href === "/history" && path.startsWith("/day"));
          return (
            <Link key={it.href} href={it.href} className={active ? "active" : ""}>
              <span className="ico">{it.ico}</span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
