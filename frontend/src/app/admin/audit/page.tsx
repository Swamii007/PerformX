"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { goalsApi, analyticsApi, cyclesApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Shield, Search } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  goal_id: string;
  changed_by_name: string;
  change_type: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  created_at: string;
}

interface Goal {
  id: string;
  title: string;
  employee_name: string;
}

const changeTypeColors: Record<string, string> = {
  approve: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  return: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  edit: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  unlock: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  achievement_update: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

export default function AdminAuditPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>("");
  const [search, setSearch] = useState("");
  const [cycleId, setCycleId] = useState("2025-2026");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const cycleRes = await cyclesApi.getActive();
        const cid = cycleRes.data.id;
        setCycleId(cid);
        const goalsRes = await goalsApi.getTeamGoals(cid);
        setGoals(goalsRes.data);
      } catch { /* empty */ }
    };
    load();
  }, []);

  const loadLogs = async (goalId: string) => {
    setLoading(true);
    try {
      const res = await analyticsApi.getAuditLog(goalId);
      setLogs(res.data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoal(goalId);
    if (goalId) loadLogs(goalId);
    else setLogs([]);
  };

  const filteredGoals = goals.filter(g =>
    g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.employee_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) => {
    try { return format(new Date(d), "MMM d, yyyy HH:mm"); } catch { return d; }
  };

  return (
    <div>
      <TopBar title="Audit Trail" subtitle="Track all goal changes after lock date" />
      <div className="p-6 space-y-5 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Goal selector */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search goals..." className="pl-9" />
            </div>
            <Card>
              <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
                {filteredGoals.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">No goals found</div>
                ) : filteredGoals.map(g => (
                  <button
                    key={g.id}
                    onClick={() => handleGoalSelect(g.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors",
                      selectedGoal === g.id ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    )}
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{g.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{g.employee_name}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Audit logs */}
          <div className="lg:col-span-2">
            {!selectedGoal ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Shield className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Select a goal to view its audit trail</p>
                </CardContent>
              </Card>
            ) : loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
              </div>
            ) : logs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-slate-400 text-sm">No audit logs for this goal</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {logs.map(log => (
                  <Card key={log.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 mt-0.5", changeTypeColors[log.change_type] || "bg-slate-100 text-slate-600")}>
                            {log.change_type.replace("_", " ")}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {log.changed_by_name}
                            </p>
                            {log.field_changed && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                Changed <span className="font-medium">{log.field_changed}</span>
                                {log.old_value && ` from "${log.old_value}"`}
                                {log.new_value && ` to "${log.new_value}"`}
                              </p>
                            )}
                            {log.reason && (
                              <p className="text-xs text-slate-500 mt-0.5">Reason: {log.reason}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 flex-shrink-0">{formatDate(log.created_at)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
