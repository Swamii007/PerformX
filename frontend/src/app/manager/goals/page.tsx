"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { GoalCard, type Goal } from "@/components/goals/GoalCard";
import { AchievementModal } from "@/components/goals/AchievementModal";
import { Button } from "@/components/ui/button";
import { GoalCardSkeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { goalsApi, usersApi } from "@/lib/api";
import { useCycleWindow } from "@/hooks/useCycleWindow";
import { cn } from "@/lib/utils";
import { Filter, CheckCircle, XCircle } from "lucide-react";

interface TeamMember { id: string; name: string; }

// Extend Goal with employee_id for manager view
interface ManagerGoal extends Goal {
  employee_id: string;
}

const STATUS_FILTERS = ["all", "submitted", "approved", "draft", "returned"];

export default function ManagerGoalsPage() {
  const [goals, setGoals] = useState<ManagerGoal[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("submitted"); // default to pending
  const [employeeFilter, setEmployeeFilter] = useState("all");

  const cycle = useCycleWindow();

  // Modals
  const [approveGoal, setApproveGoal] = useState<Goal | null>(null);
  const [returnGoal, setReturnGoal] = useState<Goal | null>(null);
  const [returnComment, setReturnComment] = useState("");
  const [achievementGoal, setAchievementGoal] = useState<Goal | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editTarget, setEditTarget] = useState("");
  const [editWeightage, setEditWeightage] = useState("");

  const loadGoals = useCallback(async () => {
    if (cycle.loading) return;
    try {
      const [goalsRes, teamRes] = await Promise.all([
        goalsApi.getTeamGoals(cycle.cycleId),
        usersApi.getTeam(),
      ]);
      setGoals(goalsRes.data as ManagerGoal[]);
      setTeam(teamRes.data);
    } catch {
      toast.error("Failed to load team goals");
    } finally {
      setLoading(false);
    }
  }, [cycle.cycleId, cycle.loading]);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  const filtered = goals.filter(g => {
    if (statusFilter !== "all" && g.status !== statusFilter) return false;
    if (employeeFilter !== "all" && g.employee_id !== employeeFilter) return false;
    return true;
  });

  const pendingCount = goals.filter(g => g.status === "submitted").length;

  const handleApprove = async () => {
    if (!approveGoal) return;
    setActionLoading(true);
    try {
      const editData: Record<string, unknown> = {};
      if (editTarget) editData.target_value = parseFloat(editTarget);
      if (editWeightage) editData.weightage = parseFloat(editWeightage);
      await goalsApi.approve(approveGoal.id, Object.keys(editData).length ? editData : undefined);
      toast.success(`Goal approved for ${approveGoal.employee_name || "employee"}`);
      setApproveGoal(null);
      loadGoals();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!returnGoal || !returnComment.trim()) return;
    setActionLoading(true);
    try {
      await goalsApi.return(returnGoal.id, { rework_comment: returnComment });
      toast.success("Goal returned for rework");
      setReturnGoal(null);
      setReturnComment("");
      loadGoals();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Return failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <TopBar
        title="Team Goals"
        subtitle={`${cycle.cycleName} · ${pendingCount > 0 ? `${pendingCount} pending approval` : `${goals.length} total goals`}`}
      />
      <div className="p-6 space-y-5 animate-fade-in">
        {/* Pending alert */}
        {pendingCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-amber-700 dark:text-amber-300 font-bold text-sm">{pendingCount}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {pendingCount} goal{pendingCount > 1 ? "s" : ""} awaiting your approval
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500">Review and approve or return for rework</p>
            </div>
            <Button
              size="sm"
              variant="warning"
              className="ml-auto flex-shrink-0"
              onClick={() => setStatusFilter("submitted")}
            >
              Review Now
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
                  statusFilter === s
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-300"
                )}
              >
                {s === "all" ? `All (${goals.length})` : `${s} (${goals.filter(g => g.status === s).length})`}
              </button>
            ))}
          </div>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <Filter className="w-3 h-3 mr-1.5 text-slate-400" />
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {team.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Goals grid */}
        {loading || cycle.loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map(i => <GoalCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              {statusFilter === "submitted" ? "No pending approvals — all caught up!" : "No goals match this filter"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                showEmployee
                role="manager"
                onApprove={(goal) => { setApproveGoal(goal); setEditTarget(""); setEditWeightage(""); }}
                onReturn={(goal) => { setReturnGoal(goal); setReturnComment(""); }}
                onUpdateAchievement={cycle.isCheckinOpen ? (goal) => setAchievementGoal(goal) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <Dialog open={!!approveGoal} onOpenChange={() => setApproveGoal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" /> Approve Goal
            </DialogTitle>
          </DialogHeader>
          {approveGoal && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{approveGoal.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{approveGoal.employee_name} · {approveGoal.thrust_area}</p>
              </div>
              <p className="text-xs text-slate-500">Optionally adjust target or weightage before approving:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Target Value (optional)</Label>
                  <Input
                    type="number"
                    value={editTarget}
                    onChange={e => setEditTarget(e.target.value)}
                    placeholder={approveGoal.target_value?.toString() || "Current"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Weightage % (optional)</Label>
                  <Input
                    type="number"
                    value={editWeightage}
                    onChange={e => setEditWeightage(e.target.value)}
                    placeholder={approveGoal.weightage?.toString()}
                    min={10} max={100}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveGoal(null)}>Cancel</Button>
            <Button variant="success" onClick={handleApprove} loading={actionLoading}>
              <CheckCircle className="w-4 h-4 mr-1.5" /> Approve Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Modal */}
      <Dialog open={!!returnGoal} onOpenChange={() => setReturnGoal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" /> Return for Rework
            </DialogTitle>
          </DialogHeader>
          {returnGoal && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{returnGoal.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{returnGoal.employee_name}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Feedback for Employee *</Label>
                <Textarea
                  value={returnComment}
                  onChange={e => setReturnComment(e.target.value)}
                  placeholder="Explain what needs to be changed or improved..."
                  rows={3}
                />
                {returnComment.length === 0 && (
                  <p className="text-xs text-slate-400">Feedback is required so the employee knows what to fix</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnGoal(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReturn}
              loading={actionLoading}
              disabled={!returnComment.trim()}
            >
              Return for Rework
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AchievementModal
        open={!!achievementGoal}
        onClose={() => setAchievementGoal(null)}
        onSuccess={loadGoals}
        goal={achievementGoal}
        currentPhase={cycle.currentPhase}
      />
    </div>
  );
}
