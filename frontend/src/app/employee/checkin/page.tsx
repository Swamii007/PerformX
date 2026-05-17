"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AchievementModal } from "@/components/goals/AchievementModal";
import { Skeleton } from "@/components/ui/skeleton";
import { goalsApi, checkinsApi } from "@/lib/api";
import { useCycleWindow } from "@/hooks/useCycleWindow";
import { cn, getStatusColor, getScoreColor, formatScore } from "@/lib/utils";
import { MessageSquare, TrendingUp, Lock, CheckCircle, AlertCircle } from "lucide-react";

interface Goal {
  id: string;
  title: string;
  thrust_area: string;
  uom_type: string;
  target_value?: number;
  target_date?: string;
  weightage: number;
  status: string;
  quarterly_achievements: Array<{
    quarter: string;
    actual_value?: number;
    progress_status: string;
    progress_score?: number;
    notes?: string;
    updated_at?: string;
  }>;
}

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const PHASE_QUARTER_MAP: Record<string, string> = {
  q1_checkin: "Q1",
  q2_checkin: "Q2",
  q3_checkin: "Q3",
  q4_annual: "Q4",
};

export default function EmployeeCheckinPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [comments, setComments] = useState<Record<string, unknown[]>>({});
  const [achievementGoal, setAchievementGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  const cycle = useCycleWindow();
  const activeQuarter = PHASE_QUARTER_MAP[cycle.currentPhase] || null;
  const [selectedQuarter, setSelectedQuarter] = useState(activeQuarter || "Q1");

  // Sync selected quarter when cycle loads
  useEffect(() => {
    if (!cycle.loading && activeQuarter) {
      setSelectedQuarter(activeQuarter);
    }
  }, [cycle.loading, activeQuarter]);

  const loadData = useCallback(async () => {
    if (cycle.loading) return;
    try {
      const res = await goalsApi.getMyGoals(cycle.cycleId);
      const approvedGoals = res.data.filter((g: Goal) => g.status === "approved");
      setGoals(approvedGoals);

      const commentMap: Record<string, unknown[]> = {};
      for (const g of approvedGoals) {
        try {
          const cRes = await checkinsApi.getGoalCheckins(g.id, selectedQuarter);
          commentMap[g.id] = cRes.data;
        } catch { /* empty */ }
      }
      setComments(commentMap);
    } catch {
      toast.error("Failed to load check-in data");
    } finally {
      setLoading(false);
    }
  }, [cycle.cycleId, cycle.loading, selectedQuarter]);

  useEffect(() => { loadData(); }, [loadData]);

  const isQuarterOpen = (q: string) => activeQuarter === q && cycle.isCheckinOpen;
  const isQuarterClosed = (q: string) => !isQuarterOpen(q);

  return (
    <div>
      <TopBar
        title="Quarterly Check-ins"
        subtitle={`${cycle.cycleName} · Log your achievements`}
      />
      <div className="p-6 space-y-5 animate-fade-in">
        {/* Quarter selector */}
        <div className="flex gap-2 flex-wrap">
          {QUARTERS.map(q => {
            const isActive = q === activeQuarter && cycle.isCheckinOpen;
            const isClosed = isQuarterClosed(q);
            return (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                  selectedQuarter === q
                    ? isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-700 text-white"
                    : isClosed
                    ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-300"
                )}
              >
                {q}
                {isActive && <span className="w-1.5 h-1.5 bg-white rounded-full opacity-80" />}
                {isClosed && selectedQuarter !== q && <Lock className="w-3 h-3" />}
              </button>
            );
          })}
        </div>

        {/* Window status banner */}
        {!cycle.loading && (
          <div className={cn(
            "flex items-start gap-3 rounded-xl p-4 border",
            isQuarterOpen(selectedQuarter)
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
          )}>
            {isQuarterOpen(selectedQuarter)
              ? <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />}
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {isQuarterOpen(selectedQuarter)
                  ? `${selectedQuarter} check-in window is open`
                  : `${selectedQuarter} check-in window is closed`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isQuarterOpen(selectedQuarter)
                  ? "Update your achievements below. Your manager will review and add comments."
                  : activeQuarter
                  ? `Currently in ${activeQuarter} check-in phase. You can view past data but not edit it.`
                  : cycle.isGoalSettingOpen
                  ? "Goal setting is in progress. Check-in windows will open after goals are approved."
                  : "This cycle is closed."}
              </p>
            </div>
          </div>
        )}

        {/* Goals */}
        {loading || cycle.loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-4" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : goals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 font-medium">No approved goals found</p>
              <p className="text-xs text-slate-400 mt-1">Goals must be approved by your manager before check-ins</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {goals.map(g => {
              const qAch = g.quarterly_achievements?.find(a => a.quarter === selectedQuarter);
              const goalComments = comments[g.id] || [];
              const canUpdate = isQuarterOpen(selectedQuarter);

              return (
                <Card key={g.id} className={cn(!canUpdate && "opacity-90")}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-400">{g.thrust_area}</span>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400">{g.weightage}% weight</span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{g.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Target: {g.target_value?.toLocaleString() ?? "Date-based"} · {g.uom_type}
                        </p>
                      </div>
                      {canUpdate ? (
                        <Button
                          size="sm"
                          variant={qAch ? "outline" : "default"}
                          onClick={() => setAchievementGoal(g)}
                          className="flex-shrink-0"
                        >
                          <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                          {qAch ? "Update" : "Log Achievement"}
                        </Button>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                          <Lock className="w-3 h-3" /> Read-only
                        </span>
                      )}
                    </div>

                    {qAch && (
                      <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-slate-500">Actual: </span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {qAch.actual_value?.toLocaleString() ?? "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", getStatusColor(qAch.progress_status))}>
                              {qAch.progress_status.replace("_", " ")}
                            </span>
                            {qAch.progress_score !== null && qAch.progress_score !== undefined && (
                              <span className={cn("text-sm font-bold", getScoreColor(qAch.progress_score))}>
                                {formatScore(qAch.progress_score)}
                              </span>
                            )}
                          </div>
                        </div>
                        {qAch.notes && <p className="text-xs text-slate-500 mt-1.5 italic">&ldquo;{qAch.notes}&rdquo;</p>}
                      </div>
                    )}

                    {!qAch && (
                      <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                        <p className="text-xs text-slate-400">
                          {canUpdate ? "No achievement logged yet for this quarter" : "No data for this quarter"}
                        </p>
                      </div>
                    )}

                    {/* Manager comments */}
                    {(goalComments as Array<{ id: string; manager_name: string; comment: string; created_at: string }>).map(c => (
                      <div key={c.id} className="flex gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg mt-2">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">{c.manager_name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{c.comment}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AchievementModal
        open={!!achievementGoal}
        onClose={() => setAchievementGoal(null)}
        onSuccess={loadData}
        goal={achievementGoal}
        currentPhase={cycle.currentPhase}
      />
    </div>
  );
}
