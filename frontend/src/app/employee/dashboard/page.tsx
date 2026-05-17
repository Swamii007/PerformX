"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { goalsApi } from "@/lib/api";
import { useCycleWindow } from "@/hooks/useCycleWindow";
import { cn, getScoreColor, formatScore, getStatusColor } from "@/lib/utils";
import { Target, TrendingUp, CheckCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Goal {
  id: string;
  title: string;
  thrust_area: string;
  weightage: number;
  status: string;
  progress_status: string;
  quarterly_achievements: Array<{ quarter: string; progress_score?: number; progress_status: string }>;
}

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const cycle = useCycleWindow();

  useEffect(() => {
    if (cycle.loading) return;
    goalsApi.getMyGoals(cycle.cycleId)
      .then(res => setGoals(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cycle.cycleId, cycle.loading]);

  const approved = goals.filter(g => g.status === "approved");
  const submitted = goals.filter(g => g.status === "submitted");
  const returned = goals.filter(g => g.status === "returned");
  const atRisk = approved.filter(g => {
    const ach = g.quarterly_achievements?.slice(-1)[0];
    return ach?.progress_status === "at_risk";
  });
  const totalWeight = goals.filter(g => g.status !== "returned").reduce((s, g) => s + g.weightage, 0);

  const latestScores = approved.map(g => {
    const ach = g.quarterly_achievements?.slice(-1)[0];
    return ach?.progress_score ?? null;
  }).filter(s => s !== null) as number[];
  const avgScore = latestScores.length ? latestScores.reduce((a, b) => a + b, 0) / latestScores.length : null;

  const stats = [
    { label: "Total Goals", value: goals.length, icon: Target, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
    { label: "Approved", value: approved.length, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
    { label: "Pending Review", value: submitted.length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
    atRisk.length > 0
      ? { label: "At Risk", value: atRisk.length, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" }
      : { label: "Avg Score", value: avgScore !== null ? `${avgScore.toFixed(1)}%` : "—", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
  ];

  return (
    <div>
      <TopBar
        title={`Welcome back, ${user?.name?.split(" ")[0]} 👋`}
        subtitle={`${cycle.cycleName} · ${user?.department || "Sales"}`}
      />
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading || cycle.loading
            ? [1,2,3,4].map(i => <StatCardSkeleton key={i} />)
            : stats.map(s => {
                const Icon = s.icon;
                return (
                  <Card key={s.label} className="hover:shadow-md transition-shadow">
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
                );
              })}
        </div>

        {/* Weightage bar */}
        {!loading && goals.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Total Weightage</p>
                  <p className="text-xs text-slate-500">Must equal 100% before submission</p>
                </div>
                <span className={cn("text-2xl font-bold", totalWeight === 100 ? "text-emerald-600" : totalWeight > 100 ? "text-red-600" : "text-amber-600")}>
                  {totalWeight}%
                </span>
              </div>
              <Progress
                value={Math.min(totalWeight, 100)}
                indicatorClassName={totalWeight === 100 ? "bg-emerald-500" : totalWeight > 100 ? "bg-red-500" : "bg-amber-500"}
              />
              {totalWeight !== 100 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  {totalWeight < 100 ? `${100 - totalWeight}% remaining to reach 100%` : `${totalWeight - 100}% over the limit — reduce before submitting`}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        {returned.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {returned.length} goal{returned.length > 1 ? "s" : ""} returned for rework
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                Your manager has requested changes.
              </p>
            </div>
            <Link href="/employee/goals" className="flex items-center gap-1 text-xs text-red-600 font-medium hover:underline flex-shrink-0">
              Review <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {atRisk.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {atRisk.length} goal{atRisk.length > 1 ? "s are" : " is"} at risk
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                These goals need attention to stay on track.
              </p>
            </div>
            <Link href="/employee/progress" className="flex items-center gap-1 text-xs text-amber-600 font-medium hover:underline flex-shrink-0">
              View <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Goals overview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">My Goals — {cycle.cycleName}</CardTitle>
              <Link href="/employee/goals" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading || cycle.loading ? (
              <div className="p-6 space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : goals.length === 0 ? (
              <div className="p-8 text-center">
                <Target className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No goals yet for this cycle</p>
                <Link href="/employee/goals" className="text-xs text-blue-600 hover:underline mt-1 block">
                  Create your first goal →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {goals.slice(0, 6).map(g => {
                  const latestAch = g.quarterly_achievements?.slice(-1)[0];
                  const score = latestAch?.progress_score;
                  return (
                    <div key={g.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{g.title}</p>
                        <p className="text-xs text-slate-400">{g.thrust_area} · {g.weightage}%</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {score !== null && score !== undefined && (
                          <span className={cn("text-sm font-bold", getScoreColor(score))}>{formatScore(score)}</span>
                        )}
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", getStatusColor(g.status))}>
                          {g.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
