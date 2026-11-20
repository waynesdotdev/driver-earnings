"use client";

import { useLayoutEffect } from "react";
import { applyTheme, getThemePref } from "@/lib/theme";

/** Keeps the theme applied (dev remounts) and follows the phone when set to Auto. */
export default function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme();
    const mq = matchMedia("(prefers-color-scheme: light)");
    const onChange = () => getThemePref() === "auto" && applyTheme("auto");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return null;
}
