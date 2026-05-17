"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { analyticsApi, cyclesApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Users, Target, CheckCircle, TrendingUp, BarChart3, Shield } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [cycleId, setCycleId] = useState("2025-2026");
  const [cycleName, setCycleName] = useState("FY 2025-2026");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const cycleRes = await cyclesApi.getActive();
        const cid = cycleRes.data.id;
        setCycleId(cid);
        setCycleName(cycleRes.data.name);
        const ovRes = await analyticsApi.getOverview(cid);
        setOverview(ovRes.data);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const stats = overview ? [
    { label: "Total Employees", value: overview.total_employees as number, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", href: "/admin/users" },
    { label: "Goals Approved", value: overview.goals_approved as number, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950", href: "/admin/goals" },
    { label: "Submission Rate", value: `${overview.submission_rate}%`, icon: Target, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950", href: "/admin/goals" },
    { label: "Avg Progress", value: `${overview.avg_progress_score}%`, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950", href: "/admin/analytics" },
  ] : [];

  const quickLinks = [
    { href: "/admin/users", label: "Manage Users", desc: "Add, edit, and manage org hierarchy", icon: Users, color: "bg-blue-600" },
    { href: "/admin/goals", label: "All Goals", desc: "View and unlock goals across the org", icon: Target, color: "bg-emerald-600" },
    { href: "/admin/cycles", label: "Manage Cycles", desc: "Configure performance cycles and phases", icon: BarChart3, color: "bg-amber-600" },
    { href: "/admin/analytics", label: "Analytics", desc: "Org-wide performance insights", icon: TrendingUp, color: "bg-purple-600" },
    { href: "/admin/audit", label: "Audit Logs", desc: "Track all goal changes and approvals", icon: Shield, color: "bg-slate-600" },
  ];

  return (
    <div>
      <TopBar title="Admin Dashboard" subtitle={`${cycleName} · Organization Overview`} />
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
          </div>
        ) : overview && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(s => {
              const Icon = s.icon;
              return (
                <Link key={s.label} href={s.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{s.value}</p>
                        </div>
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.bg)}>
                          <Icon className={cn("w-5 h-5", s.color)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Goal status breakdown */}
        {overview && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Goal Status Breakdown — {cycleName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Draft", value: overview.goals_draft as number, color: "bg-slate-200 dark:bg-slate-700" },
                  { label: "Submitted", value: overview.goals_submitted as number, color: "bg-blue-200 dark:bg-blue-900" },
                  { label: "Approved", value: overview.goals_approved as number, color: "bg-emerald-200 dark:bg-emerald-900" },
                  { label: "Returned", value: overview.goals_returned as number, color: "bg-red-200 dark:bg-red-900" },
                ].map(s => (
                  <div key={s.label} className={cn("rounded-xl p-4 text-center", s.color)}>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick links */}
        <div>
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map(l => {
              const Icon = l.icon;
              return (
                <Link key={l.href} href={l.href}>
                  <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", l.color)}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{l.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{l.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
