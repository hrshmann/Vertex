"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "vx-theme";

/** Runs in <head> before React: applies the stored preference, falling back to the OS setting. */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${STORAGE_KEY}");var d=p==="dark"||((!p||p==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){document.documentElement.setAttribute("data-theme","light")}})()`;

interface ThemeState {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState | undefined>(undefined);

function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [theme, setTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    setPreferenceState(readPreference());
  }, []);

  useEffect(() => {
    const apply = () => {
      const resolved = preference === "system" ? systemTheme() : preference;
      setTheme(resolved);
      document.documentElement.setAttribute("data-theme", resolved);
    };
    apply();
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* private mode: the choice lasts for this page only */
    }
  }, []);

  const toggle = useCallback(() => setPreference(theme === "dark" ? "light" : "dark"), [theme, setPreference]);

  return (
    <ThemeContext.Provider value={{ preference, theme, setPreference, toggle }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
