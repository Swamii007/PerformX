"use client";
import { useEffect, useState, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GoalCard } from "@/components/goals/GoalCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { goalsApi, usersApi, cyclesApi } from "@/lib/api";
import { toast } from "sonner";
import { exportToXLSX } from "@/lib/export";
import { cn } from "@/lib/utils";
import { Search, Download, Share2, Unlock } from "lucide-react";

interface Goal {
  id: string;
  employee_id: string;
  employee_name: string;
  title: string;
  thrust_area: string;
  uom_type: string;
  target_value?: number;
  target_date?: string;
  weightage: number;
  status: string;
  progress_status: string;
  quarterly_achievements: Array<{ quarter: string; progress_score?: number; progress_status: string }>;
  is_shared?: boolean;
  manager_comment?: string;
  description?: string;
}

const THRUST_AREAS = [
  "Revenue Growth", "Cost Optimization", "Customer Satisfaction",
  "Operational Excellence", "People Development", "Innovation",
  "Compliance & Risk", "Quality"
];
const UOM_TYPES = [
  { value: "numeric_min", label: "Numeric (Higher is Better)" },
  { value: "numeric_max", label: "Numeric (Lower is Better)" },
  { value: "timeline", label: "Timeline" },
  { value: "zero", label: "Zero-Based" },
];

export default function AdminGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [cycleId, setCycleId] = useState("2025-2026");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [unlockGoal, setUnlockGoal] = useState<Goal | null>(null);
  const [unlockReason, setUnlockReason] = useState("");
  const [sharedOpen, setSharedOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Shared goal form
  const [sharedForm, setSharedForm] = useState({
    thrust_area: "", title: "", description: "", uom_type: "numeric_min",
    target_value: "", default_weightage: "10", employee_ids: [] as string[]
  });

  const loadData = useCallback(async () => {
    try {
      const cycleRes = await cyclesApi.getActive();
      const cid = cycleRes.data.id;
      setCycleId(cid);
      const [goalsRes, usersRes] = await Promise.all([
        goalsApi.getTeamGoals(cid),
        usersApi.list(),
      ]);
      setGoals(goalsRes.data);
      setUsers(usersRes.data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, []);

  const employees = users.filter(u => u.role === "employee");

  const filtered = goals.filter(g => {
    const matchSearch = g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.employee_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleExport = async () => {
    try {
      const res = await goalsApi.getTeamGoals(cycleId);
      const data = (res.data as Goal[]).map(g => ({
        "Employee": g.employee_name || "",
        "Thrust Area": g.thrust_area,
        "Goal Title": g.title,
        "UoM": g.uom_type,
        "Target": g.target_value || "",
        "Weightage (%)": g.weightage,
        "Status": g.status,
        "Progress": g.progress_status,
        "Shared": g.is_shared ? "Yes" : "No",
      }));
      exportToXLSX(data, `PerformX-Goals-${cycleId}`, "Goals");
      toast.success("Goals exported as Excel file");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleUnlock = async () => {
    if (!unlockGoal || !unlockReason.trim()) return;
    setActionLoading(true);
    try {
      await goalsApi.unlock(unlockGoal.id, unlockReason);
      toast.success("Goal unlocked for editing");
      setUnlockGoal(null);
      setUnlockReason("");
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Unlock failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateShared = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sharedForm.employee_ids.length === 0) {
      toast.warning("Select at least one employee");
      return;
    }
    setActionLoading(true);
    try {
      const res = await goalsApi.createShared({
        thrust_area: sharedForm.thrust_area,
        title: sharedForm.title,
        description: sharedForm.description,
        uom_type: sharedForm.uom_type,
        target_value: sharedForm.target_value ? parseFloat(sharedForm.target_value) : undefined,
        cycle_id: cycleId,
        employee_ids: sharedForm.employee_ids,
        default_weightage: parseFloat(sharedForm.default_weightage),
      });
      toast.success(res.data.message || "Shared KPI pushed to employees");
      setSharedOpen(false);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Failed to create shared goal");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <TopBar
        title="All Goals"
        subtitle={`FY ${cycleId} · ${goals.length} total goals`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button size="sm" onClick={() => setSharedOpen(true)} className="gap-2">
              <Share2 className="w-4 h-4" /> Push Shared Goal
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-5 animate-fade-in">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search goals or employees..." className="pl-9" />
          </div>
          <div className="flex gap-1.5">
            {["all", "draft", "submitted", "approved", "returned"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
                  statusFilter === s ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:border-blue-300")}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Goals grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(g => (
              <div key={g.id} className="relative">
                <GoalCard goal={g} showEmployee role="admin" />
                {g.status === "approved" && (
                  <button
                    onClick={() => { setUnlockGoal(g); setUnlockReason(""); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-600 hover:border-amber-300 transition-all"
                    title="Unlock goal"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unlock Modal */}
      <Dialog open={!!unlockGoal} onOpenChange={() => setUnlockGoal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unlock Goal for Editing</DialogTitle>
          </DialogHeader>
          {unlockGoal && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">⚠️ This will unlock an approved goal</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">The employee will be able to edit this goal. This action is logged in the audit trail.</p>
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{unlockGoal.title}</p>
              <div className="space-y-1.5">
                <Label>Reason for Unlocking *</Label>
                <Textarea value={unlockReason} onChange={e => setUnlockReason(e.target.value)} placeholder="Provide a reason..." rows={2} required />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockGoal(null)}>Cancel</Button>
            <Button variant="warning" onClick={handleUnlock} loading={actionLoading} disabled={!unlockReason.trim()}>
              <Unlock className="w-4 h-4 mr-1.5" /> Unlock Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared Goal Modal */}
      <Dialog open={sharedOpen} onOpenChange={setSharedOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Push Shared Departmental KPI</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateShared} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Thrust Area *</Label>
              <Select onValueChange={v => setSharedForm(p => ({ ...p, thrust_area: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {THRUST_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>KPI Title *</Label>
              <Input value={sharedForm.title} onChange={e => setSharedForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Achieve department NPS of 80" required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={sharedForm.description} onChange={e => setSharedForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>UoM Type *</Label>
                <Select value={sharedForm.uom_type} onValueChange={v => setSharedForm(p => ({ ...p, uom_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UOM_TYPES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Target Value</Label>
                <Input type="number" value={sharedForm.target_value} onChange={e => setSharedForm(p => ({ ...p, target_value: e.target.value }))} placeholder="e.g., 80" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Default Weightage (%) *</Label>
              <Input type="number" min={10} max={100} value={sharedForm.default_weightage} onChange={e => setSharedForm(p => ({ ...p, default_weightage: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Assign to Employees *</Label>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {employees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sharedForm.employee_ids.includes(emp.id)}
                      onChange={e => setSharedForm(p => ({
                        ...p,
                        employee_ids: e.target.checked
                          ? [...p.employee_ids, emp.id]
                          : p.employee_ids.filter(id => id !== emp.id)
                      }))}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{emp.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">{sharedForm.employee_ids.length} employees selected</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSharedOpen(false)}>Cancel</Button>
              <Button type="submit" loading={actionLoading} disabled={!sharedForm.title || sharedForm.employee_ids.length === 0}>
                <Share2 className="w-4 h-4 mr-1.5" /> Push to Employees
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
