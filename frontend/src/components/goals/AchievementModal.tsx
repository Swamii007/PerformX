"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { goalsApi } from "@/lib/api";
import { getUoMLabel } from "@/lib/utils";
import { getQuarterWindowMessage } from "@/hooks/useCycleWindow";
import { AlertCircle } from "lucide-react";

interface Goal {
  id: string;
  title: string;
  uom_type: string;
  target_value?: number;
  target_date?: string;
  weightage: number;
}

interface AchievementModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goal: Goal | null;
  currentPhase?: string;
}

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const PROGRESS_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "on_track", label: "On Track" },
  { value: "completed", label: "Completed" },
  { value: "at_risk", label: "At Risk" },
];

export function AchievementModal({ open, onClose, onSuccess, goal, currentPhase = "q1_checkin" }: AchievementModalProps) {
  const [loading, setLoading] = useState(false);
  const [quarter, setQuarter] = useState(() => {
    const map: Record<string, string> = { q1_checkin: "Q1", q2_checkin: "Q2", q3_checkin: "Q3", q4_annual: "Q4" };
    return map[currentPhase] || "Q1";
  });
  const [actualValue, setActualValue] = useState("");
  const [actualDate, setActualDate] = useState("");
  const [progressStatus, setProgressStatus] = useState("on_track");
  const [notes, setNotes] = useState("");

  if (!goal) return null;

  const windowMessage = getQuarterWindowMessage(currentPhase, quarter);
  const isWindowClosed = !!windowMessage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isWindowClosed) {
      toast.error(windowMessage);
      return;
    }

    if (goal.uom_type !== "timeline" && goal.uom_type !== "zero" && !actualValue) {
      toast.warning("Please enter the actual value achieved");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        quarter,
        progress_status: progressStatus,
        notes: notes || undefined,
      };
      if (goal.uom_type !== "timeline") {
        payload.actual_value = parseFloat(actualValue) || 0;
      }
      if (goal.uom_type === "timeline" && actualDate) {
        payload.actual_date = new Date(actualDate).toISOString();
      }
      const res = await goalsApi.updateAchievement(goal.id, payload);
      const score = res.data.progress_score;
      toast.success(
        score !== null && score !== undefined
          ? `Achievement saved! Progress score: ${score.toFixed(1)}%`
          : "Achievement saved successfully"
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Failed to update achievement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Achievement</DialogTitle>
        </DialogHeader>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mb-2">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{goal.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {getUoMLabel(goal.uom_type)} · Target: {goal.target_value ?? "Date-based"} · Weight: {goal.weightage}%
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Quarter *</Label>
            <Select value={quarter} onValueChange={setQuarter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUARTERS.map(q => {
                  const msg = getQuarterWindowMessage(currentPhase, q);
                  return (
                    <SelectItem key={q} value={q} disabled={!!msg}>
                      {q} {msg ? "— Closed" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Window closed warning */}
          {isWindowClosed && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">{windowMessage}</p>
            </div>
          )}

          {!isWindowClosed && (
            <>
              {goal.uom_type !== "timeline" && (
                <div className="space-y-1.5">
                  <Label>Actual Value *</Label>
                  <Input
                    type="number"
                    value={actualValue}
                    onChange={e => setActualValue(e.target.value)}
                    placeholder={goal.uom_type === "zero" ? "Enter 0 for success" : "Enter actual value achieved"}
                  />
                </div>
              )}

              {goal.uom_type === "timeline" && (
                <div className="space-y-1.5">
                  <Label>Completion Date</Label>
                  <Input type="date" value={actualDate} onChange={e => setActualDate(e.target.value)} />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Progress Status *</Label>
                <Select value={progressStatus} onValueChange={setProgressStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROGRESS_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Notes <span className="text-slate-400 text-xs">(optional)</span></Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add context about your progress, blockers, or next steps..."
                  rows={2}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading} disabled={isWindowClosed}>
              {isWindowClosed ? "Window Closed" : "Save Achievement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
