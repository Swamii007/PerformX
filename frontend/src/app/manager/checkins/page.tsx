"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { goalsApi, checkinsApi, usersApi } from "@/lib/api";
import { useCycleWindow } from "@/hooks/useCycleWindow";
import { cn, getStatusColor, getScoreColor, formatScore } from "@/lib/utils";
import { MessageSquare, Sparkles, Loader2, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";

interface TeamMember { id: string; name: string; department?: string; }
interface Goal {
  id: string;
  title: string;
  thrust_area: string;
  uom_type: string;
  target_value?: number;
  weightage: number;
  status: string;
  quarterly_achievements: Array<{
    quarter: string;
    actual_value?: number;
    progress_status: string;
    progress_score?: number;
    notes?: string;
  }>;
}

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export default function ManagerCheckinsPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<TeamMember | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [existingComments, setExistingComments] = useState<Record<string, unknown[]>>({});
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [savingComment, setSavingComment] = useState<string | null>(null);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const cycle = useCycleWindow();

  // Sync quarter to active phase
  useEffect(() => {
    const map: Record<string, string> = { q1_checkin: "Q1", q2_checkin: "Q2", q3_checkin: "Q3", q4_annual: "Q4" };
    if (!cycle.loading && map[cycle.currentPhase]) {
      setSelectedQuarter(map[cycle.currentPhase]);
    }
  }, [cycle.loading, cycle.currentPhase]);

  useEffect(() => {
    if (cycle.loading) return;
    usersApi.getTeam().then(res => {
      setTeam(res.data);
      if (res.data.length > 0) setSelectedEmployee(res.data[0]);
    }).catch(() => toast.error("Failed to load team")).finally(() => setLoading(false));
  }, [cycle.loading]);

  const loadEmployeeGoals = useCallback(async () => {
    if (!selectedEmployee || cycle.loading) return;
    try {
      const res = await goalsApi.getTeamGoals(cycle.cycleId, { employee_id: selectedEmployee.id, status: "approved" });
      setGoals(res.data);
      const commentMap: Record<string, unknown[]> = {};
      for (const g of res.data) {
        try {
          const cRes = await checkinsApi.getGoalCheckins(g.id, selectedQuarter);
          commentMap[g.id] = cRes.data;
        } catch { /* empty */ }
      }
      setExistingComments(commentMap);
    } catch {
      toast.error("Failed to load goals");
    }
  }, [selectedEmployee, selectedQuarter, cycle.cycleId, cycle.loading]);

  useEffect(() => { loadEmployeeGoals(); }, [loadEmployeeGoals]);

  const handleSaveComment = async (goalId: string) => {
    const comment = comments[goalId];
    if (!comment?.trim()) {
      toast.warning("Please enter a comment before saving");
      return;
    }
    setSavingComment(goalId);
    try {
      await checkinsApi.addComment({ goal_id: goalId, quarter: selectedQuarter, comment, manager_id: "" });
      setComments(prev => ({ ...prev, [goalId]: "" }));
      toast.success("Check-in comment saved");
      loadEmployeeGoals();
    } catch {
      toast.error("Failed to save comment");
    } finally {
      setSavingComment(null);
    }
  };

  const handleAiSummarize = async () => {
    if (!selectedEmployee || goals.length === 0) {
      toast.warning("No goals to summarize");
      return;
    }
    setAiLoading(true);
    try {
      const res = await checkinsApi.summarize({
        goal_ids: goals.map(g => g.id),
        quarter: selectedQuarter,
        employee_id: selectedEmployee.id,
      });
      setAiSummary(res.data.summary);
      toast.success("AI summary generated");
    } catch {
      toast.error("AI summarization failed");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <TopBar title="Team Check-ins" subtitle={`${cycle.cycleName} · Review and comment on team progress`} />
      <div className="p-6 space-y-5 animate-fade-in">
        {/* Controls */}
        <div className="flex gap-4 flex-wrap">
          {/* Quarter tabs */}
          <div className="flex gap-2">
            {QUARTERS.map(q => {
              const isActive = q === cycle.activeQuarter && cycle.isCheckinOpen;
              return (
                <button key={q} onClick={() => setSelectedQuarter(q)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                    selectedQuarter === q
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:border-blue-300"
                  )}>
                  {q}
                  {isActive && <span className="w-1.5 h-1.5 bg-white rounded-full opacity-80" />}
                </button>
              );
            })}
          </div>

          {/* Employee tabs */}
          <div className="flex gap-2 flex-wrap">
            {loading
              ? [1,2].map(i => <Skeleton key={i} className="h-9 w-28 rounded-lg" />)
              : team.map(m => (
                <button key={m.id} onClick={() => setSelectedEmployee(m)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    selectedEmployee?.id === m.id
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-400"
                  )}>
                  {m.name}
                </button>
              ))}
          </div>
        </div>

        {selectedEmployee && (
          <>
            {/* AI Summary card */}
            <Card className="border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                      AI Check-in Summary — {selectedEmployee.name} · {selectedQuarter}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAiSummarize} disabled={aiLoading}
                    className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800">
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                    Generate Summary
                  </Button>
                </div>
                {aiSummary ? (
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiSummary}</p>
                ) : (
                  <p className="text-xs text-slate-400">
                    Click &ldquo;Generate Summary&rdquo; for an AI-powered overview of {selectedEmployee.name}&apos;s {selectedQuarter} performance.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Goals */}
            <div className="space-y-3">
              {goals.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400">No approved goals for {selectedEmployee.name}</p>
                  </CardContent>
                </Card>
              ) : goals.map(g => {
                const qAch = g.quarterly_achievements?.find(a => a.quarter === selectedQuarter);
                const goalComments = existingComments[g.id] || [];
                const isExpanded = expandedGoal === g.id;

                return (
                  <Card key={g.id}>
                    <CardContent className="p-5">
                      {/* Goal header — always visible */}
                      <div
                        className="flex items-start justify-between gap-3 cursor-pointer"
                        onClick={() => setExpandedGoal(isExpanded ? null : g.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 mb-0.5">{g.thrust_area} · {g.weightage}%</p>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{g.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {qAch?.progress_score !== undefined && qAch.progress_score !== null && (
                            <span className={cn("text-sm font-bold", getScoreColor(qAch.progress_score))}>
                              {formatScore(qAch.progress_score)}
                            </span>
                          )}
                          {!qAch && (
                            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              Not updated
                            </span>
                          )}
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-slate-400" />
                            : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 space-y-4">
                          {/* Planned vs Actual */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                              <p className="text-xs text-slate-400 mb-1">Planned Target</p>
                              <p className="text-xl font-bold text-slate-900 dark:text-white">
                                {g.target_value?.toLocaleString() ?? "—"}
                              </p>
                            </div>
                            <div className={cn("rounded-lg p-3", qAch ? "bg-blue-50 dark:bg-blue-950/30" : "bg-slate-50 dark:bg-slate-800")}>
                              <p className="text-xs text-slate-400 mb-1">Actual ({selectedQuarter})</p>
                              <p className="text-xl font-bold text-slate-900 dark:text-white">
                                {qAch?.actual_value?.toLocaleString() ?? "Not updated"}
                              </p>
                            </div>
                          </div>

                          {qAch && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", getStatusColor(qAch.progress_status))}>
                                  {qAch.progress_status.replace("_", " ")}
                                </span>
                                {qAch.progress_score !== null && qAch.progress_score !== undefined && (
                                  <span className={cn("text-sm font-bold", getScoreColor(qAch.progress_score))}>
                                    {formatScore(qAch.progress_score)}
                                  </span>
                                )}
                              </div>
                              {qAch.progress_score !== null && qAch.progress_score !== undefined && (
                                <Progress
                                  value={Math.min(qAch.progress_score, 100)}
                                  className="h-1.5"
                                  indicatorClassName={
                                    qAch.progress_score >= 90 ? "bg-emerald-500" :
                                    qAch.progress_score >= 70 ? "bg-blue-500" :
                                    qAch.progress_score >= 50 ? "bg-amber-500" : "bg-red-500"
                                  }
                                />
                              )}
                              {qAch.notes && (
                                <p className="text-xs text-slate-500 mt-2 italic">&ldquo;{qAch.notes}&rdquo;</p>
                              )}
                            </div>
                          )}

                          {/* Existing comments */}
                          {(goalComments as Array<{ id: string; manager_name: string; comment: string }>).map(c => (
                            <div key={c.id} className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
                              <MessageSquare className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">{c.manager_name}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{c.comment}</p>
                              </div>
                            </div>
                          ))}

                          {/* Add comment */}
                          <div className="space-y-2">
                            <Textarea
                              value={comments[g.id] || ""}
                              onChange={e => setComments(prev => ({ ...prev, [g.id]: e.target.value }))}
                              placeholder={`Add a structured check-in comment for ${selectedEmployee.name}...`}
                              rows={2}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveComment(g.id)}
                              loading={savingComment === g.id}
                              disabled={!comments[g.id]?.trim()}
                            >
                              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                              Save Comment
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
