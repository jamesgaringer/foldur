import { useEffect, useRef, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/home", label: "Home", icon: "⌂" },
  { to: "/profile", label: "Profile", icon: "◉" },
  { to: "/import", label: "Import", icon: "↓" },
  { to: "/search", label: "Search", icon: "⊘" },
  { to: "/projects", label: "Projects", icon: "◈" },
  { to: "/recommendations", label: "Recommendations", icon: "✦" },
  { to: "/themes", label: "Themes", icon: "◎" },
  { to: "/timeline", label: "Timeline", icon: "⏤" },
  { to: "/settings", label: "Settings", icon: "⚙" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      <nav aria-label="Main navigation" className="flex w-56 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex h-14 items-center gap-2 border-b border-[var(--color-border)] px-5">
          <span className="text-lg font-semibold tracking-tight text-[var(--color-accent)]">
            foldur
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)]"
                }`
              }
            >
              <span className="text-base leading-none" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="border-t border-[var(--color-border)] p-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            Local-first. Private by default.
          </p>
        </div>
      </nav>

      <main ref={mainRef} className="flex-1 overflow-y-auto bg-[var(--color-bg)] p-8">
        {children}
      </main>
    </div>
  );
}
