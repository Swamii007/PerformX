"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartSkeleton, StatCardSkeleton } from "@/components/ui/skeleton";
import { goalsApi, analyticsApi } from "@/lib/api";
import { useCycleWindow } from "@/hooks/useCycleWindow";
import { cn, getScoreColor, formatScore, getStatusColor } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from "recharts";
import { TrendingUp, Target, Award } from "lucide-react";

interface Goal {
  id: string;
  title: string;
  thrust_area: string;
  weightage: number;
  status: string;
  progress_status: string;
  quarterly_achievements: Array<{
    quarter: string;
    progress_score?: number;
    progress_status: string;
    actual_value?: number;
  }>;
}

const PROGRESS_BAR_COLOR: Record<string, string> = {
  completed: "bg-emerald-500",
  on_track: "bg-blue-500",
  at_risk: "bg-amber-500",
  not_started: "bg-slate-300 dark:bg-slate-600",
};

export default function EmployeeProgressPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [trend, setTrend] = useState<Array<{ quarter: string; avg_score: number | null }>>([]);
  const [loading, setLoading] = useState(true);
  const cycle = useCycleWindow();

  useEffect(() => {
    if (cycle.loading) return;
    const load = async () => {
      try {
        const [goalsRes, trendRes] = await Promise.all([
          goalsApi.getMyGoals(cycle.cycleId),
          analyticsApi.getQuarterlyTrend(cycle.cycleId),
        ]);
        setGoals(goalsRes.data);
        setTrend(trendRes.data.trend || []);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    load();
  }, [cycle.cycleId, cycle.loading]);

  const approved = goals.filter(g => g.status === "approved");

  // Weighted overall score
  const overallScore = approved.length
    ? approved.reduce((sum, g) => {
        const ach = g.quarterly_achievements?.slice(-1)[0];
        const score = ach?.progress_score ?? 0;
        return sum + (score * g.weightage / 100);
      }, 0)
    : null;

  const trendData = trend
    .filter(t => t.avg_score !== null)
    .map(t => ({ quarter: t.quarter, score: t.avg_score }));

  // Radar data — per thrust area
  const thrustScores = approved.reduce<Record<string, number[]>>((acc, g) => {
    const ach = g.quarterly_achievements?.slice(-1)[0];
    if (ach?.progress_score !== undefined) {
      if (!acc[g.thrust_area]) acc[g.thrust_area] = [];
      acc[g.thrust_area].push(ach.progress_score);
    }
    return acc;
  }, {});
  const radarData = Object.entries(thrustScores).map(([area, scores]) => ({
    area: area.split(" ")[0],
    score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  }));

  const scoreColor = overallScore !== null
    ? overallScore >= 90 ? "text-emerald-500"
    : overallScore >= 70 ? "text-blue-500"
    : overallScore >= 50 ? "text-amber-500"
    : "text-red-500"
    : "text-slate-400";

  return (
    <div>
      <TopBar title="My Progress" subtitle={`${cycle.cycleName} · Performance overview`} />
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Overall score hero */}
        {loading || cycle.loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Big score card */}
            <Card className="md:col-span-1">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950 rounded-2xl flex items-center justify-center mb-3">
                  <Award className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Overall Weighted Score</p>
                <p className={cn("text-5xl font-bold", scoreColor)}>
                  {overallScore !== null ? `${overallScore.toFixed(1)}%` : "—"}
                </p>
                <p className="text-xs text-slate-400 mt-2">Based on {approved.length} approved goals</p>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="md:col-span-2 grid grid-cols-3 gap-4">
              {[
                { label: "Total Goals", value: goals.length, icon: Target, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
                { label: "Completed", value: approved.filter(g => g.progress_status === "completed").length, icon: Award, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
                { label: "On Track", value: approved.filter(g => g.progress_status === "on_track").length, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <Card key={s.label}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{s.value}</p>
                        </div>
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", s.bg)}>
                          <Icon className={cn("w-4 h-4", s.color)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QoQ Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" /> Quarter-on-Quarter Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <ChartSkeleton height={200} /> : trendData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  No check-in data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(v) => [`${v}%`, "Score"]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                    />
                    <Line
                      type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5}
                      dot={{ fill: "#3b82f6", r: 5, strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Radar chart by thrust area */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performance by Thrust Area</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <ChartSkeleton height={200} /> : radarData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  No scored goals yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} />
                    <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip formatter={(v) => [`${v}%`, "Score"]} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Per-goal breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Goal-wise Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            ) : approved.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No approved goals yet</p>
            ) : (
              approved.map(g => {
                const latestAch = g.quarterly_achievements?.slice(-1)[0];
                const score = latestAch?.progress_score;
                const status = latestAch?.progress_status || "not_started";
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{g.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-400">{g.thrust_area}</span>
                          <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-xs text-slate-400">{g.weightage}% weight</span>
                          {latestAch && (
                            <>
                              <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
                              <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full", getStatusColor(status))}>
                                {status.replace("_", " ")}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={cn("text-sm font-bold flex-shrink-0", getScoreColor(score))}>
                        {formatScore(score)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(score || 0, 100)}
                      className="h-2"
                      indicatorClassName={PROGRESS_BAR_COLOR[status] || "bg-slate-300"}
                    />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
