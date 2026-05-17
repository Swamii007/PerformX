"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { GoalCard, type Goal } from "@/components/goals/GoalCard";
import { CreateGoalModal } from "@/components/goals/CreateGoalModal";
import { AchievementModal } from "@/components/goals/AchievementModal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GoalCardSkeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { goalsApi } from "@/lib/api";
import { useCycleWindow } from "@/hooks/useCycleWindow";
import { cn } from "@/lib/utils";
import { Plus, Send, AlertCircle, CheckCircle, Info, Lock } from "lucide-react";

export default function EmployeeGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [achievementGoal, setAchievementGoal] = useState<Goal | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const cycle = useCycleWindow();

  const loadGoals = useCallback(async () => {
    if (cycle.loading) return;
    try {
      const res = await goalsApi.getMyGoals(cycle.cycleId);
      setGoals(res.data);
    } catch {
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, [cycle.cycleId, cycle.loading]);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  const activeGoals = goals.filter(g => g.status !== "returned");
  const totalWeight = activeGoals.reduce((s, g) => s + g.weightage, 0);
  const canSubmit = Math.abs(totalWeight - 100) < 0.01 && goals.some(g => g.status === "draft" || g.status === "returned");
  const draftCount = goals.filter(g => g.status === "draft" || g.status === "returned").length;
  const isGoalSettingOpen = cycle.isGoalSettingOpen;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await goalsApi.submit(cycle.cycleId);
      toast.success(res.data.message || "Goals submitted for approval");
      loadGoals();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteGoalId(id);
  };

  const confirmDelete = async () => {
    if (!deleteGoalId) return;
    setDeleting(true);
    try {
      await goalsApi.delete(deleteGoalId);
      toast.success("Goal deleted");
      loadGoals();
    } catch {
      toast.error("Failed to delete goal");
    } finally {
      setDeleting(false);
      setDeleteGoalId(null);
    }
  };

  return (
    <div>
      <TopBar
        title="My Goals"
        subtitle={`${cycle.cycleName} · ${goals.length}/8 goals`}
        actions={
          <div className="flex gap-2">
            {draftCount > 0 && isGoalSettingOpen && (
              <Button
                onClick={handleSubmit}
                loading={submitting}
                disabled={!canSubmit}
                variant={canSubmit ? "default" : "secondary"}
                size="sm"
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Submit for Approval
              </Button>
            )}
            {goals.length < 8 && isGoalSettingOpen && (
              <Button onClick={() => { setEditGoal(null); setCreateOpen(true); }} size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Add Goal
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-5 animate-fade-in">
        {/* Cycle phase banner */}
        {!cycle.loading && !isGoalSettingOpen && (
          <div className={cn(
            "flex items-start gap-3 rounded-xl p-4 border",
            cycle.isClosed
              ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
          )}>
            {cycle.isClosed ? <Lock className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" /> : <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />}
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {cycle.isClosed ? "Cycle Closed" : `${cycle.cycleName} — ${cycle.currentPhase.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())} Phase`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {cycle.isClosed
                  ? "This performance cycle is closed. All goals are read-only."
                  : `Goal setting window is closed. You can update achievements for ${cycle.activeQuarter || "the current quarter"}.`}
              </p>
            </div>
          </div>
        )}

        {/* Weightage tracker */}
        {isGoalSettingOpen && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {totalWeight === 100
                  ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                  : <AlertCircle className="w-4 h-4 text-amber-500" />}
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  Total Weightage:{" "}
                  <span className={cn("font-bold", totalWeight === 100 ? "text-emerald-600" : totalWeight > 100 ? "text-red-600" : "text-amber-600")}>
                    {totalWeight}%
                  </span>
                  {" "}/ 100%
                </span>
              </div>
              <span className="text-xs text-slate-400">{goals.length}/8 goals · Min 10% each</span>
            </div>
            <Progress
              value={Math.min(totalWeight, 100)}
              indicatorClassName={totalWeight === 100 ? "bg-emerald-500" : totalWeight > 100 ? "bg-red-500" : "bg-amber-500"}
            />
            {!canSubmit && draftCount > 0 && totalWeight !== 100 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                {totalWeight < 100
                  ? `Add ${100 - totalWeight}% more weightage to reach 100% and submit`
                  : `Reduce weightage by ${totalWeight - 100}% — total cannot exceed 100%`}
              </p>
            )}
          </div>
        )}

        {/* Goals grid */}
        {loading || cycle.loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <GoalCardSkeleton key={i} />)}
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No goals yet</h3>
            <p className="text-slate-500 text-sm mb-4">
              {isGoalSettingOpen
                ? `Create your first goal for ${cycle.cycleName}`
                : "No goals found for this cycle"}
            </p>
            {isGoalSettingOpen && (
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Create First Goal
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {goals.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                role="employee"
                onEdit={isGoalSettingOpen ? (goal) => { setEditGoal(goal); setCreateOpen(true); } : undefined}
                onDelete={isGoalSettingOpen ? handleDelete : undefined}
                onUpdateAchievement={cycle.isCheckinOpen ? (goal) => setAchievementGoal(goal) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <CreateGoalModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditGoal(null); }}
        onSuccess={loadGoals}
        cycleId={cycle.cycleId}
        editGoal={editGoal as Record<string, unknown> | null}
        isSharedGoal={editGoal?.is_shared === true && !editGoal?.is_primary}
      />
      <AchievementModal
        open={!!achievementGoal}
        onClose={() => setAchievementGoal(null)}
        onSuccess={loadGoals}
        goal={achievementGoal}
        currentPhase={cycle.currentPhase}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteGoalId} onOpenChange={v => { if (!v) setDeleteGoalId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete this goal? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGoalId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} loading={deleting}>Delete Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
