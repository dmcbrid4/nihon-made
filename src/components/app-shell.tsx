"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  House,
  Settings2,
} from "lucide-react";
import type { ReactNode } from "react";
import type { StudyMode } from "@/lib/study/types";
import { ThemeToggle } from "./theme-toggle";
import { useStudy } from "./study-provider";
import { Brand } from "./brand";

const navigation = [
  { href: "/", label: "Today", icon: House },
  { href: "/collection", label: "Collection", icon: BookOpen },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumnIncreasing },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const {
    error,
    reload,
    mode: storageMode,
    state,
    dispatch,
    busy,
  } = useStudy();
  if (pathname.startsWith("/guest")) return <>{children}</>;
  const current =
    pathname === "/design-preview"
      ? "Design review"
      : pathname.startsWith("/kana")
        ? "Kana"
        : (navigation.find((item) => item.href === pathname)?.label ??
          "Daily study");
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Nihon Made home">
          <Brand />
        </Link>
        {state && (
          <label className="study-mode-picker">
            <span>Study mode</span>
            <select
              aria-label="Active study mode"
              disabled={busy}
              value={state.goal.studyMode}
              onChange={(event) =>
                void dispatch({
                  type: "goal",
                  goal: {
                    ...state.goal,
                    studyMode: event.target.value as StudyMode,
                  },
                })
              }
            >
              <option value="N5">N5 · Foundation</option>
              <option value="N4">N4 · Intermediate</option>
              <option value="tae-kim">Tae Kim</option>
              <option value="kana">Kana</option>
            </select>
          </label>
        )}
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href ||
              (href === "/" &&
                (pathname === "/study" || pathname.startsWith("/kana")));
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.7} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          {process.env.NODE_ENV === "development" && (
            <Link href="/design-preview" className="design-preview-link">
              Logo options ↗
            </Link>
          )}
          <div className="sidebar-footer">
            <span>Appearance</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{current}</span>
          </div>
          <div className="topbar-right">
            <span className="storage-label">
              {storageMode === "browser"
                ? "Saved on this device"
                : "Account storage"}
            </span>
            <div className="mobile-theme">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main
          id="main"
          className={`main-content ${pathname === "/study" ? "study-main" : ""}`}
        >
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button onClick={() => void reload()}>Reload</button>
            </div>
          )}
          {children}
        </main>
        <footer className="page-footer">
          <span lang="ja">日本まで</span>
          <span>Japanese study</span>
        </footer>
      </div>
    </div>
  );
}
