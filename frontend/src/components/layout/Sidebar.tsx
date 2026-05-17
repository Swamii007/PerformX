"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useCycleWindow } from "@/hooks/useCycleWindow";
import {
  LayoutDashboard, Target, CheckSquare, BarChart3, Users,
  Settings, LogOut, Zap, ChevronRight, Shield, Calendar
} from "lucide-react";

const employeeNav = [
  { href: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employee/goals", label: "My Goals", icon: Target },
  { href: "/employee/checkin", label: "Check-ins", icon: CheckSquare },
  { href: "/employee/progress", label: "My Progress", icon: BarChart3 },
];

const managerNav = [
  { href: "/manager/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/manager/goals", label: "Team Goals", icon: Target },
  { href: "/manager/checkins", label: "Check-ins", icon: CheckSquare },
  { href: "/manager/analytics", label: "Analytics", icon: BarChart3 },
];

const adminNav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/goals", label: "All Goals", icon: Target },
  { href: "/admin/cycles", label: "Cycles", icon: Settings },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/audit", label: "Audit Logs", icon: Shield },
];

const PHASE_LABELS: Record<string, string> = {
  goal_setting: "Goal Setting",
  q1_checkin: "Q1 Check-in",
  q2_checkin: "Q2 Check-in",
  q3_checkin: "Q3 Check-in",
  q4_annual: "Q4 Annual",
  closed: "Closed",
};

const PHASE_COLORS: Record<string, string> = {
  goal_setting: "bg-blue-500",
  q1_checkin: "bg-emerald-500",
  q2_checkin: "bg-amber-500",
  q3_checkin: "bg-purple-500",
  q4_annual: "bg-red-500",
  closed: "bg-slate-500",
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const cycle = useCycleWindow();

  const navItems = user?.role === "admin" ? adminNav
    : user?.role === "manager" ? managerNav
    : employeeNav;

  const roleLabel = user?.role === "admin" ? "Admin / HR"
    : user?.role === "manager" ? "Manager (L1)"
    : "Employee";

  const roleColor = user?.role === "admin" ? "text-purple-400"
    : user?.role === "manager" ? "text-blue-400"
    : "text-emerald-400";

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 dark:bg-slate-950 flex flex-col z-40 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-white font-bold text-lg tracking-tight">PerformX</span>
          <p className="text-slate-500 text-xs">Goal Tracking Portal</p>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className={cn("text-xs font-medium", roleColor)}>{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Cycle phase indicator */}
      {!cycle.loading && (
        <div className="px-4 py-3 border-t border-slate-800">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-slate-800/50">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400 truncate">{cycle.cycleName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", PHASE_COLORS[cycle.currentPhase] || "bg-slate-500")} />
                <p className="text-xs font-medium text-slate-300 truncate">
                  {PHASE_LABELS[cycle.currentPhase] || cycle.currentPhase}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sign out */}
      <div className="px-3 pb-4 border-t border-slate-800 pt-2">
        <button
          onClick={() => { clearAuth(); window.location.href = "/login"; }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
