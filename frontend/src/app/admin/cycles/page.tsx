"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cyclesApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Calendar, Settings, Power } from "lucide-react";
import { format } from "date-fns";

interface Cycle {
  id: string;
  name: string;
  current_phase: string;
  goal_setting_start: string;
  goal_setting_end: string;
  q1_start: string;
  q1_end: string;
  q2_start: string;
  q2_end: string;
  q3_start: string;
  q3_end: string;
  q4_start: string;
  q4_end: string;
  is_active: boolean;
}

const PHASES = [
  { value: "goal_setting", label: "Goal Setting" },
  { value: "q1_checkin", label: "Q1 Check-in" },
  { value: "q2_checkin", label: "Q2 Check-in" },
  { value: "q3_checkin", label: "Q3 Check-in" },
  { value: "q4_annual", label: "Q4 / Annual" },
  { value: "closed", label: "Closed" },
];

const phaseColors: Record<string, string> = {
  goal_setting: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  q1_checkin: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  q2_checkin: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  q3_checkin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  q4_annual: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  closed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

interface CreateCycleForm {
  id: string;
  name: string;
  goal_setting_start: string;
  goal_setting_end: string;
  q1_start: string;
  q1_end: string;
  q2_start: string;
  q2_end: string;
  q3_start: string;
  q3_end: string;
  q4_start: string;
  q4_end: string;
}

const EMPTY_FORM: CreateCycleForm = {
  id: "", name: "",
  goal_setting_start: "", goal_setting_end: "",
  q1_start: "", q1_end: "",
  q2_start: "", q2_end: "",
  q3_start: "", q3_end: "",
  q4_start: "", q4_end: "",
};

export default function AdminCyclesPage() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCycle, setEditCycle] = useState<Cycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPhase, setNewPhase] = useState("");
  const [form, setForm] = useState<CreateCycleForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateCycleForm, string>>>({});

  const loadCycles = async () => {
    try {
      const res = await cyclesApi.list();
      setCycles(res.data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCycles(); }, []);

  const handleUpdatePhase = async (cycle: Cycle) => {
    if (!newPhase) return;
    setSaving(true);
    try {
      await cyclesApi.update(cycle.id, { current_phase: newPhase });
      await loadCycles();
      setEditCycle(null);
      toast.success(`Cycle phase updated to: ${PHASES.find(p => p.value === newPhase)?.label}`);
    } catch {
      toast.error("Failed to update cycle phase");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cycle: Cycle) => {
    try {
      await cyclesApi.update(cycle.id, { is_active: !cycle.is_active });
      await loadCycles();
      toast.success(cycle.is_active ? "Cycle deactivated" : "Cycle activated");
    } catch {
      toast.error("Failed to update cycle status");
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CreateCycleForm, string>> = {};
    if (!form.id.trim()) errors.id = "Cycle ID is required (e.g. 2025-2026)";
    if (!form.name.trim()) errors.name = "Cycle name is required";

    const phases: Array<[keyof CreateCycleForm, keyof CreateCycleForm, string]> = [
      ["goal_setting_start", "goal_setting_end", "Goal Setting"],
      ["q1_start", "q1_end", "Q1"],
      ["q2_start", "q2_end", "Q2"],
      ["q3_start", "q3_end", "Q3"],
      ["q4_start", "q4_end", "Q4"],
    ];

    for (const [startKey, endKey, label] of phases) {
      if (!form[startKey]) { errors[startKey] = `${label} start date required`; continue; }
      if (!form[endKey]) { errors[endKey] = `${label} end date required`; continue; }
      if (new Date(form[startKey]) >= new Date(form[endKey])) {
        errors[endKey] = `${label} end must be after start`;
      }
    }

    // Check sequential ordering
    const orderedEnds = [form.goal_setting_end, form.q1_end, form.q2_end, form.q3_end, form.q4_end];
    const orderedStarts = [form.q1_start, form.q2_start, form.q3_start, form.q4_start];
    for (let i = 0; i < orderedStarts.length; i++) {
      if (orderedEnds[i] && orderedStarts[i] && new Date(orderedEnds[i]) > new Date(orderedStarts[i])) {
        const phaseNames = ["Goal Setting", "Q1", "Q2", "Q3"];
        errors[["q1_start", "q2_start", "q3_start", "q4_start"][i] as keyof CreateCycleForm] =
          `${phaseNames[i + 1] || "Q4"} start must be after ${phaseNames[i]} end`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setCreating(true);
    try {
      await cyclesApi.create({
        id: form.id.trim(),
        name: form.name.trim(),
        goal_setting_start: new Date(form.goal_setting_start).toISOString(),
        goal_setting_end: new Date(form.goal_setting_end).toISOString(),
        q1_start: new Date(form.q1_start).toISOString(),
        q1_end: new Date(form.q1_end).toISOString(),
        q2_start: new Date(form.q2_start).toISOString(),
        q2_end: new Date(form.q2_end).toISOString(),
        q3_start: new Date(form.q3_start).toISOString(),
        q3_end: new Date(form.q3_end).toISOString(),
        q4_start: new Date(form.q4_start).toISOString(),
        q4_end: new Date(form.q4_end).toISOString(),
      });
      toast.success(`Cycle "${form.name}" created successfully`);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setFormErrors({});
      await loadCycles();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Failed to create cycle");
    } finally {
      setCreating(false);
    }
  };

  const setField = (key: keyof CreateCycleForm, value: string) => {
    setForm(p => ({ ...p, [key]: value }));
    if (formErrors[key]) setFormErrors(p => ({ ...p, [key]: undefined }));
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), "MMM d, yyyy"); } catch { return d; }
  };

  return (
    <div>
      <TopBar
        title="Performance Cycles"
        subtitle="Manage goal-setting and check-in windows"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Cycle
          </Button>
        }
      />
      <div className="p-6 space-y-5 animate-fade-in">
        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
          </div>
        ) : cycles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium mb-1">No cycles configured yet</p>
              <p className="text-slate-400 text-sm mb-4">Create your first performance cycle to get started</p>
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Create First Cycle
              </Button>
            </CardContent>
          </Card>
        ) : (
          cycles.map(c => (
            <Card key={c.id} className={cn(c.is_active ? "border-blue-200 dark:border-blue-800" : "opacity-75")}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{c.name}</h3>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                        c.is_active
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", phaseColors[c.current_phase])}>
                      {PHASES.find(p => p.value === c.current_phase)?.label || c.current_phase}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => handleToggleActive(c)}
                      className={cn("gap-1.5 text-xs",
                        c.is_active
                          ? "text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
                          : "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      )}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {c.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setEditCycle(c); setNewPhase(c.current_phase); }} className="gap-1.5">
                      <Settings className="w-3.5 h-3.5" /> Update Phase
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    { label: "Goal Setting", start: c.goal_setting_start, end: c.goal_setting_end },
                    { label: "Q1 Check-in", start: c.q1_start, end: c.q1_end },
                    { label: "Q2 Check-in", start: c.q2_start, end: c.q2_end },
                    { label: "Q3 Check-in", start: c.q3_start, end: c.q3_end },
                    { label: "Q4 / Annual", start: c.q4_start, end: c.q4_end },
                  ].map(phase => (
                    <div key={phase.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{phase.label}</p>
                      <p className="text-xs text-slate-400">{formatDate(phase.start)}</p>
                      <p className="text-xs text-slate-400">→ {formatDate(phase.end)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Cycle Modal */}
      <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) { setForm(EMPTY_FORM); setFormErrors({}); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Performance Cycle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cycle ID *</Label>
                <Input
                  value={form.id}
                  onChange={e => setField("id", e.target.value)}
                  placeholder="e.g. 2026-2027"
                  className={formErrors.id ? "border-red-400" : ""}
                />
                {formErrors.id && <p className="text-xs text-red-500">{formErrors.id}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Cycle Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setField("name", e.target.value)}
                  placeholder="e.g. FY 2026-2027"
                  className={formErrors.name ? "border-red-400" : ""}
                />
                {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
              </div>
            </div>

            {/* Phase date ranges */}
            {[
              { label: "Goal Setting Phase", startKey: "goal_setting_start" as const, endKey: "goal_setting_end" as const },
              { label: "Q1 Check-in Phase", startKey: "q1_start" as const, endKey: "q1_end" as const },
              { label: "Q2 Check-in Phase", startKey: "q2_start" as const, endKey: "q2_end" as const },
              { label: "Q3 Check-in Phase", startKey: "q3_start" as const, endKey: "q3_end" as const },
              { label: "Q4 / Annual Phase", startKey: "q4_start" as const, endKey: "q4_end" as const },
            ].map(({ label, startKey, endKey }) => (
              <div key={label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Date *</Label>
                    <Input
                      type="date"
                      value={form[startKey]}
                      onChange={e => setField(startKey, e.target.value)}
                      className={formErrors[startKey] ? "border-red-400" : ""}
                    />
                    {formErrors[startKey] && <p className="text-xs text-red-500">{formErrors[startKey]}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">End Date *</Label>
                    <Input
                      type="date"
                      value={form[endKey]}
                      onChange={e => setField(endKey, e.target.value)}
                      className={formErrors[endKey] ? "border-red-400" : ""}
                    />
                    {formErrors[endKey] && <p className="text-xs text-red-500">{formErrors[endKey]}</p>}
                  </div>
                </div>
              </div>
            ))}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); setFormErrors({}); }}>
                Cancel
              </Button>
              <Button type="submit" loading={creating}>Create Cycle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Phase Modal */}
      <Dialog open={!!editCycle} onOpenChange={() => setEditCycle(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Cycle Phase</DialogTitle>
          </DialogHeader>
          {editCycle && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">{editCycle.name}</p>
              <div className="space-y-1.5">
                <Label>Current Phase</Label>
                <Select value={newPhase} onValueChange={setNewPhase}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PHASES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCycle(null)}>Cancel</Button>
            <Button onClick={() => editCycle && handleUpdatePhase(editCycle)} loading={saving}>Update Phase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
