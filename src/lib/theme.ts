// Dark / Light / Auto (follow the phone). Stored per phone. The same logic
// runs in a tiny inline script in <head> (see THEME_SCRIPT) so the right
// colours are there before the first paint: no white flash.

export type ThemePref = "dark" | "light" | "auto";
export const THEME_KEY = "de_theme";
const BAR = { dark: "#0c0e12", light: "#f4f5f7" }; // phone status bar colour

export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||"dark";var t=p==="auto"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p;document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"${BAR.light}":"${BAR.dark}")}catch(e){}})()`;

export function getThemePref(): ThemePref {
  try {
    const p = localStorage.getItem(THEME_KEY);
    return p === "light" || p === "auto" ? p : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(pref: ThemePref = getThemePref()) {
  const t = pref === "auto" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : pref;
  document.documentElement.setAttribute("data-theme", t);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BAR[t]);
}

export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {}
  applyTheme(pref);
}
