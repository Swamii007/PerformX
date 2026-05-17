"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { goalsApi, usersApi, cyclesApi } from "@/lib/api";
import { cn, getStatusColor } from "@/lib/utils";
import { Users, Target, Clock, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  department?: string;
}

interface Goal {
  id: string;
  employee_id: string;
  employee_name: string;
  title: string;
  status: string;
  weightage: number;
  thrust_area: string;
}

export default function ManagerDashboard() {
  const { user } = useAuthStore();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cycleId, setCycleId] = useState("2025-2026");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const cycleRes = await cyclesApi.getActive();
        const cid = cycleRes.data.id;
        setCycleId(cid);
        const [teamRes, goalsRes] = await Promise.all([
          usersApi.getTeam(),
          goalsApi.getTeamGoals(cid),
        ]);
        setTeam(teamRes.data);
        setGoals(goalsRes.data);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const pending = goals.filter(g => g.status === "submitted");
  const approved = goals.filter(g => g.status === "approved");
  const returned = goals.filter(g => g.status === "returned");

  const stats = [
    { label: "Team Members", value: team.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
    { label: "Pending Approval", value: pending.length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
    { label: "Approved Goals", value: approved.length, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
    { label: "Returned", value: returned.length, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
  ];

  return (
    <div>
      <TopBar title={`Manager Dashboard`} subtitle={`Welcome, ${user?.name} · FY ${cycleId}`} />
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{s.value}</p>
                    </div>
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.bg)}>
                      <Icon className={cn("w-5 h-5", s.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pending approvals alert */}
        {pending.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {pending.length} goal{pending.length > 1 ? "s" : ""} awaiting your approval
              </p>
              <Link href="/manager/goals" className="text-xs text-amber-600 underline">Review now →</Link>
            </div>
          </div>
        )}

        {/* Team overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Team Members</CardTitle>
                <Link href="/manager/goals" className="text-xs text-blue-600 hover:underline">View goals →</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {team.map(member => {
                const memberGoals = goals.filter(g => g.employee_id === member.id);
                const memberPending = memberGoals.filter(g => g.status === "submitted").length;
                const memberApproved = memberGoals.filter(g => g.status === "approved").length;
                return (
                  <div key={member.id} className="flex items-center gap-3 px-6 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-semibold flex-shrink-0">
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{member.name}</p>
                      <p className="text-xs text-slate-400">{memberGoals.length} goals · {memberApproved} approved</p>
                    </div>
                    {memberPending > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                        {memberPending} pending
                      </span>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Goal Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {goals.slice(0, 6).map(g => (
                <div key={g.id} className="flex items-center gap-3 px-6 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{g.title}</p>
                    <p className="text-xs text-slate-400">{g.employee_name}</p>
                  </div>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0", getStatusColor(g.status))}>
                    {g.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
