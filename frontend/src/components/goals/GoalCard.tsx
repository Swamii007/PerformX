"use client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn, getStatusColor, getUoMLabel, formatScore, getScoreColor } from "@/lib/utils";
import { Lock, Share2, TrendingUp, Weight, Target, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export interface Goal {
  id: string;
  thrust_area: string;
  title: string;
  description?: string;
  uom_type: string;
  target_value?: number;
  target_date?: string;
  weightage: number;
  status: string;
  progress_status: string;
  quarterly_achievements: Array<{
    quarter: string;
    actual_value?: number;
    progress_status: string;
    progress_score?: number;
    notes?: string;
  }>;
  is_shared?: boolean;
  is_primary?: boolean;
  shared_goal_id?: string;
  manager_comment?: string;
  employee_name?: string;
}

interface GoalCardProps {
  goal: Goal;
  showEmployee?: boolean;
  onEdit?: (goal: Goal) => void;
  onDelete?: (id: string) => void;
  onApprove?: (goal: Goal) => void;
  onReturn?: (goal: Goal) => void;
  onUpdateAchievement?: (goal: Goal) => void;
  onViewDetails?: (goal: Goal) => void;
  onCheckinComment?: (goal: Goal) => void;
  role?: "employee" | "manager" | "admin";
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Pending Approval",
  approved: "Approved",
  returned: "Needs Rework",
  not_started: "Not Started",
  on_track: "On Track",
  completed: "Completed",
  at_risk: "At Risk",
};

const THRUST_COLORS: Record<string, string> = {
  "Revenue Growth": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Cost Optimization": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Customer Satisfaction": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Operational Excellence": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "People Development": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  "Innovation": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Compliance & Risk": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "Quality": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

const PROGRESS_BAR_COLOR: Record<string, string> = {
  completed: "bg-emerald-500",
  on_track: "bg-blue-500",
  at_risk: "bg-amber-500",
  not_started: "bg-slate-300",
};

export function GoalCard({
  goal, showEmployee, onEdit, onDelete, onApprove, onReturn,
  onUpdateAchievement, onViewDetails, onCheckinComment, role = "employee"
}: GoalCardProps) {
  const latestAchievement = goal.quarterly_achievements?.slice(-1)[0];
  const latestScore = latestAchievement?.progress_score;
  const isLocked = goal.status === "approved";
  const isShared = goal.is_shared;
  const isSharedRecipient = isShared && !goal.is_primary;

  // Employees can edit shared goals only for weightage (not title/target)
  const canEdit = role === "employee" && !isLocked && !isSharedRecipient;
  const canEditWeightage = role === "employee" && !isLocked && isSharedRecipient;
  const canDelete = role === "employee" && !isLocked && !isShared;

  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-xl border transition-all duration-200 hover:shadow-md group",
      goal.status === "returned"
        ? "border-red-200 dark:border-red-900"
        : isShared
        ? "border-blue-200 dark:border-blue-800"
        : "border-slate-200 dark:border-slate-800"
    )}>
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
              THRUST_COLORS[goal.thrust_area] || "bg-slate-100 text-slate-600"
            )}>
              {goal.thrust_area}
            </span>
            {isShared && (
              <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full flex-shrink-0">
                <Share2 className="w-3 h-3" />
                {goal.is_primary ? "Shared (Owner)" : "Shared KPI"}
              </span>
            )}
            {isLocked && (
              <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />
            )}
          </div>
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
            getStatusColor(goal.status)
          )}>
            {STATUS_LABELS[goal.status] || goal.status}
          </span>
        </div>

        <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-snug mb-1 line-clamp-2">
          {goal.title}
        </h3>
        {goal.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{goal.description}</p>
        )}
        {showEmployee && goal.employee_name && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">{goal.employee_name}</p>
        )}
      </div>

      {/* Metrics row */}
      <div className="px-5 pb-3 grid grid-cols-3 gap-3 border-t border-slate-50 dark:border-slate-800 pt-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
            <Weight className="w-3 h-3" />
            <span className="text-xs">Weight</span>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{goal.weightage}%</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
            <Target className="w-3 h-3" />
            <span className="text-xs">Target</span>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {goal.target_value !== null && goal.target_value !== undefined
              ? goal.target_value.toLocaleString()
              : goal.target_date
              ? format(new Date(goal.target_date), "MMM yy")
              : goal.uom_type === "zero" ? "0" : "—"}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs">Score</span>
          </div>
          <p className={cn("text-sm font-bold", getScoreColor(latestScore))}>
            {formatScore(latestScore)}
          </p>
        </div>
      </div>

      {/* Progress bar for approved goals with scores */}
      {goal.status === "approved" && latestScore !== null && latestScore !== undefined && (
        <div className="px-5 pb-3">
          <Progress
            value={Math.min(latestScore, 100)}
            className="h-1.5"
            indicatorClassName={PROGRESS_BAR_COLOR[latestAchievement?.progress_status || "not_started"]}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-slate-400">
              {latestAchievement?.quarter} · {STATUS_LABELS[latestAchievement?.progress_status || "not_started"]}
            </p>
            {latestAchievement?.actual_value !== undefined && (
              <p className="text-xs text-slate-400">
                Actual: <span className="font-medium text-slate-600 dark:text-slate-300">{latestAchievement.actual_value.toLocaleString()}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rework comment */}
      {goal.status === "returned" && goal.manager_comment && (
        <div className="mx-5 mb-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-100 dark:border-red-900">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">Manager Feedback</p>
              <p className="text-xs text-red-600 dark:text-red-400">{goal.manager_comment}</p>
            </div>
          </div>
        </div>
      )}

      {/* UoM tag */}
      <div className="px-5 pb-3">
        <span className="text-xs text-slate-400">{getUoMLabel(goal.uom_type)}</span>
      </div>

      {/* Actions */}
      <div className="px-5 pb-4 flex gap-2 flex-wrap border-t border-slate-100 dark:border-slate-800 pt-3">
        {onViewDetails && (
          <Button variant="ghost" size="sm" onClick={() => onViewDetails(goal)} className="text-xs h-7">
            Details
          </Button>
        )}

        {/* Employee actions */}
        {canEdit && onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(goal)} className="text-xs h-7">
            Edit
          </Button>
        )}
        {canEditWeightage && onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(goal)} className="text-xs h-7 text-blue-600 border-blue-200">
            Adjust Weight
          </Button>
        )}
        {canDelete && onDelete && (
          <Button
            variant="ghost" size="sm"
            onClick={() => onDelete(goal.id)}
            className="text-xs h-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Delete
          </Button>
        )}
        {role === "employee" && isLocked && onUpdateAchievement && (
          <Button variant="default" size="sm" onClick={() => onUpdateAchievement(goal)} className="text-xs h-7">
            Update Achievement
          </Button>
        )}

        {/* Manager/Admin actions */}
        {(role === "manager" || role === "admin") && goal.status === "submitted" && (
          <>
            {onApprove && (
              <Button variant="success" size="sm" onClick={() => onApprove(goal)} className="text-xs h-7">
                Approve
              </Button>
            )}
            {onReturn && (
              <Button variant="destructive" size="sm" onClick={() => onReturn(goal)} className="text-xs h-7">
                Return
              </Button>
            )}
          </>
        )}
        {(role === "manager" || role === "admin") && goal.status === "approved" && onUpdateAchievement && (
          <Button variant="outline" size="sm" onClick={() => onUpdateAchievement(goal)} className="text-xs h-7">
            Check-in
          </Button>
        )}
        {(role === "manager" || role === "admin") && goal.status === "approved" && onCheckinComment && (
          <Button variant="ghost" size="sm" onClick={() => onCheckinComment(goal)} className="text-xs h-7 text-blue-600">
            <MessageSquare className="w-3 h-3 mr-1" /> Comment
          </Button>
        )}
      </div>
    </div>
  );
}
