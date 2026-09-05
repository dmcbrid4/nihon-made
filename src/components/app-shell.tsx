"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  House,
  Settings2,
} from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";
import { useStudy } from "./study-provider";

const navigation = [
  { href: "/", label: "Today", icon: House },
  { href: "/collection", label: "Collection", icon: BookOpen },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumnIncreasing },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { error, reload, mode } = useStudy();
  const current =
    navigation.find((item) => item.href === pathname)?.label ?? "Daily study";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Nihon Made home">
          <span className="brand-mark" aria-hidden="true">
            日<span />
          </span>
          <span>
            <span className="brand-japanese" lang="ja">
              日本まで
            </span>
            <span className="brand-english">Nihon Made</span>
          </span>
        </Link>
        <div className="sidebar-section-label">YOUR SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${pathname === href || (href === "/" && pathname === "/study") ? "active" : ""}`}
              aria-current={pathname === href ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{label}</span>
              {pathname === href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="journey-label">
            <span className="status-dot" /> A journey to N4
          </div>
          <p>
            A little practice.
            <br />A whole new place.
          </p>
          <Link href="/settings">
            Make it yours <ArrowUpRight size={14} />
          </Link>
          <div className="sidebar-footer">
            <span>
              一歩ずつ <span className="muted">· One step at a time</span>
            </span>
            <ThemeToggle />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="desktop-crumb">My learning</span>
            <ChevronRight size={13} className="desktop-crumb" />
            <span>{current}</span>
          </div>
          <div className="topbar-right">
            <span className="storage-label">
              <span className="status-dot" />
              {mode === "browser"
                ? "Saved on this device"
                : "Personal workspace"}
            </span>
            <span className="profile-avatar" aria-label="Personal workspace">
              私
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
          <span>Built around your journey.</span>
        </footer>
      </div>
    </div>
  );
}
