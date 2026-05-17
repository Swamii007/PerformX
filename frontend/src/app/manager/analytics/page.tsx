"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyticsApi, cyclesApi } from "@/lib/api";
import { toast } from "sonner";
import { cn, getScoreColor, formatScore } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Sparkles, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

export default function ManagerAnalyticsPage() {
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [teamPerf, setTeamPerf] = useState<Array<Record<string, unknown>>>([]);
  const [trend, setTrend] = useState<Array<{ quarter: string; avg_score: number | null }>>([]);
  const [aiInsights, setAiInsights] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [cycleId, setCycleId] = useState("2025-2026");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const cycleRes = await cyclesApi.getActive();
        const cid = cycleRes.data.id;
        setCycleId(cid);
        const [ovRes, perfRes, trendRes] = await Promise.all([
          analyticsApi.getOverview(cid),
          analyticsApi.getTeamPerformance(cid),
          analyticsApi.getQuarterlyTrend(cid),
        ]);
        setOverview(ovRes.data);
        setTeamPerf(perfRes.data.employees || []);
        setTrend(trendRes.data.trend || []);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleAiInsights = async () => {
    setAiLoading(true);
    try {
      const res = await analyticsApi.getAiInsights(cycleId);
      if (res.data.success === false) {
        toast.error(res.data.message || "AI insights temporarily unavailable. Please try again.");
      } else {
        setAiInsights(res.data.insights);
        toast.success("AI insights generated");
      }
    } catch {
      toast.error("Failed to generate insights. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const renderInsights = (text: string) =>
    text.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return (
        <p key={i} className={line.trim() === "" ? "mt-2" : ""}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j} className="font-semibold text-slate-900 dark:text-white">{part}</strong> : part
          )}
        </p>
      );
    });

  const thrustData = overview
    ? Object.entries(overview.thrust_area_breakdown as Record<string, number> || {}).map(([name, value]) => ({ name: name.split(" ")[0], value }))
    : [];

  const trendData = trend.filter(t => t.avg_score !== null).map(t => ({ quarter: t.quarter, score: t.avg_score }));

  const teamScoreData = teamPerf.map(e => ({
    name: (e.employee_name as string).split(" ")[0],
    score: e.overall_score || 0,
    goals: e.total_goals,
  }));

  return (
    <div>
      <TopBar title="Team Analytics" subtitle={`FY ${cycleId} · Performance insights`} />
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Overview stats */}
        {overview && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Submission Rate", value: `${overview.submission_rate}%`, color: "text-blue-600" },
              { label: "Approval Rate", value: `${overview.approval_rate}%`, color: "text-emerald-600" },
              { label: "Avg Progress Score", value: `${overview.avg_progress_score}%`, color: "text-purple-600" },
              { label: "Total Goals", value: overview.total_goals as number, color: "text-slate-900 dark:text-white" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-5">
                  <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                  <p className={cn("text-2xl font-bold mt-1", s.color)}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* AI Insights */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">AI Analytics Insights</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleAiInsights} disabled={aiLoading}
                className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800">
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                Generate Insights
              </Button>
            </div>
            {aiInsights ? (
              <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">{renderInsights(aiInsights)}</div>
            ) : (
              <p className="text-xs text-slate-400">Click "Generate Insights" for AI-powered analysis of your team&apos;s performance data.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team scores */}
          {teamScoreData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Team Performance Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={teamScoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => [`${v}%`, "Score"]} />
                    <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Thrust area distribution */}
          {thrustData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Goals by Thrust Area</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={thrustData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={false} labelLine={false}>
                      {thrustData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* QoQ Trend */}
        {trendData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quarter-on-Quarter Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v}%`, "Avg Score"]} />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Team performance table */}
        {teamPerf.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Individual Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Goals</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Completed</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">On Track</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPerf.map((e) => (
                      <tr key={e.employee_id as string} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{e.employee_name as string}</td>
                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">{e.total_goals as number}</td>
                        <td className="px-4 py-3 text-center text-emerald-600">{e.goals_completed as number}</td>
                        <td className="px-4 py-3 text-center text-blue-600">{e.goals_on_track as number}</td>
                        <td className={cn("px-6 py-3 text-right font-bold", getScoreColor(e.overall_score as number))}>
                          {formatScore(e.overall_score as number)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
