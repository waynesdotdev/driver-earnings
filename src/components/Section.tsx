"use client";

import type { ReactNode } from "react";
import { useOpen } from "@/lib/useClosed";

/**
 * A panel whose header can be tapped to close/open it. When closed, only the
 * title shows: no figures. Open/closed is remembered per phone.
 */
export function Section({
  id,
  title,
  summary,
  children,
}: {
  id: string;
  title: string;
  /** Shown on the right of the header, only while open. */
  summary?: ReactNode;
  children: ReactNode;
}) {
  const [open, toggle] = useOpen(id);
  return (
    <section className={`panel section ${open ? "" : "closed"}`}>
      <button className="section-head" onClick={toggle} aria-expanded={open}>
        <h2>{title}</h2>
        <span className="section-right">
          {open ? summary : <span className="small muted">Show</span>}
          <span className="chev" aria-hidden="true">
            {open ? "▴" : "▾"}
          </span>
        </span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </section>
  );
}

/** A big figure (e.g. a header total) that can be tapped to hide it. */
export function HideableAmount({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const [open, toggle] = useOpen(id);
  return (
    <button className="total hideable" onClick={toggle} aria-pressed={!open} aria-label={open ? `Hide ${label}` : `Show ${label}`}>
      <div className="label">
        {label} {open ? "▴" : "▾"}
      </div>
      <div className={`num ${open ? "" : "hidden"}`}>{open ? children : "£ •••"}</div>
    </button>
  );
}
