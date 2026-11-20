"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A button that only fires after being pressed and held for `ms`.
 * A bar fills while holding; letting go early cancels. Stops accidental taps.
 */
export default function HoldButton({
  onHold,
  disabled,
  ms = 1200,
  className = "",
  children,
}: {
  onHold: () => void;
  disabled?: boolean;
  ms?: number;
  className?: string;
  children: ReactNode;
}) {
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);

  function start() {
    if (disabled || timer.current) return;
    fired.current = false;
    setHint(false);
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      fired.current = true;
      setHolding(false);
      navigator.vibrate?.(40);
      onHold();
    }, ms);
  }

  function stop() {
    if (!timer.current) return;
    clear();
    setHolding(false);
    if (!fired.current) setHint(true); // let go too early
  }

  return (
    <button
      type="button"
      className={`hold-btn ${holding ? "holding" : ""} ${className}`}
      style={{ ["--hold-ms" as string]: `${ms}ms` }}
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => (e.key === "Enter" || e.key === " ") && stop()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold-fill" aria-hidden="true" />
      <span className="hold-label">{hint && !holding ? "Keep holding to finish" : children}</span>
    </button>
  );
}
