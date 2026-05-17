"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { NotificationPopover } from "@/components/ui/notification-popover";

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Must wait for mount — avoids hydration mismatch with SSR
  useEffect(() => { setMounted(true); }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {actions && <div className="flex items-center gap-2 mr-2">{actions}</div>}

        {/* Dark mode toggle — only render after mount */}
        {mounted && (
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {isDark
              ? <Sun className="h-4 w-4 text-amber-400" />
              : <Moon className="h-4 w-4" />}
          </button>
        )}

        {/* Notification bell with dropdown */}
        <NotificationPopover />
      </div>
    </header>
  );
}
