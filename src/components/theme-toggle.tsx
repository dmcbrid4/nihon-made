"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const dark =
      root.dataset.theme === "dark" ||
      (!root.dataset.theme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.theme = dark ? "light" : "dark";
    try {
      localStorage.setItem("nihon-made:theme", root.dataset.theme);
    } catch {
      /* Theme remains usable when storage is unavailable. */
    }
  }
  return (
    <button
      className="icon-button theme-toggle"
      onClick={toggle}
      aria-label="Toggle light and dark mode"
      title="Toggle appearance"
    >
      <Sun className="sun-icon" size={18} />
      <Moon className="moon-icon" size={18} />
    </button>
  );
}
