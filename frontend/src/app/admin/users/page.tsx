"use client";
import { useEffect, useState, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { usersApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Search, Users, Pencil, PowerOff, Power } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  manager_id?: string;
  manager_name?: string;
  is_active: boolean;
}

const DEPARTMENTS = ["Sales", "Engineering", "Marketing", "HR", "Finance", "Operations", "Product"];
const ROLES = ["employee", "manager", "admin"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Create form state
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "employee", department: "", manager_id: "" });

  // Edit form state
  const [editForm, setEditForm] = useState({ name: "", department: "", manager_id: "", role: "" });

  const loadUsers = useCallback(async () => {
    try {
      const res = await usersApi.list();
      setUsers(res.data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const managers = users.filter(u => u.role === "manager");

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await usersApi.create({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        department: form.department || undefined,
        manager_id: form.manager_id || undefined,
      });
      toast.success(`User ${form.name} created successfully`);
      setCreateOpen(false);
      setForm({ name: "", email: "", password: "", role: "employee", department: "", manager_id: "" });
      loadUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setEditForm({
      name: user.name,
      department: user.department || "",
      manager_id: user.manager_id || "",
      role: user.role,
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditing(true);
    try {
      await usersApi.update(editUser.id, {
        name: editForm.name || undefined,
        department: editForm.department || undefined,
        manager_id: editForm.manager_id || undefined,
      });
      toast.success(`${editForm.name} updated successfully`);
      setEditUser(null);
      loadUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Failed to update user");
    } finally {
      setEditing(false);
    }
  };

  const handleToggleActive = async () => {
    if (!deactivateUser) return;
    setToggling(true);
    try {
      await usersApi.update(deactivateUser.id, { is_active: !deactivateUser.is_active });
      toast.success(deactivateUser.is_active
        ? `${deactivateUser.name} deactivated`
        : `${deactivateUser.name} reactivated`
      );
      setDeactivateUser(null);
      loadUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Failed to update user status");
    } finally {
      setToggling(false);
    }
  };

  const roleColors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    employee: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };

  return (
    <div>
      <TopBar
        title="User Management"
        subtitle={`${users.length} users in the organization`}
        actions={
          <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Add User
          </Button>
        }
      />
      <div className="p-6 space-y-5 animate-fade-in">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5">
            {["all", "employee", "manager", "admin"].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
                  roleFilter === r ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:border-blue-300")}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Users table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex items-center gap-4 px-2 py-1">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-40" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-56" />
                    </div>
                    <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                    <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-5 w-14 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                    <div className="h-7 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Department</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Manager</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => (
                      <tr key={u.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
                              u.is_active
                                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            )}>
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <p className={cn("font-medium", u.is_active ? "text-slate-900 dark:text-white" : "text-slate-400 line-through")}>{u.name}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full capitalize", roleColors[u.role])}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.department || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.manager_name || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                            u.is_active
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          )}>
                            {u.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => openEdit(u)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              title="Edit user"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => setDeactivateUser(u)}
                              className={cn("h-7 w-7 p-0",
                                u.is_active
                                  ? "text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              )}
                              title={u.is_active ? "Deactivate user" : "Reactivate user"}
                            >
                              {u.is_active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="p-8 text-center">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No users found</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create User Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" required />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="john@company.com" required />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 8 characters" required minLength={8} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.department} onValueChange={v => setForm(p => ({ ...p, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.role === "employee" && (
              <div className="space-y-1.5">
                <Label>Reporting Manager</Label>
                <Select value={form.manager_id} onValueChange={v => setForm(p => ({ ...p, manager_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select manager..." /></SelectTrigger>
                  <SelectContent>
                    {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" loading={creating}>Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={!!editUser} onOpenChange={v => { if (!v) setEditUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User — {editUser?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Full name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={editForm.department} onValueChange={v => setEditForm(p => ({ ...p, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editUser?.role === "employee" && (
              <div className="space-y-1.5">
                <Label>Reporting Manager</Label>
                <Select value={editForm.manager_id} onValueChange={v => setEditForm(p => ({ ...p, manager_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select manager..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
                    {managers.filter(m => m.id !== editUser?.id).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-500">
                <span className="font-medium">Email:</span> {editUser?.email} · <span className="font-medium">Role:</span> {editUser?.role}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Email and role cannot be changed after creation.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button type="submit" loading={editing}>Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate / Reactivate Confirmation */}
      <Dialog open={!!deactivateUser} onOpenChange={v => { if (!v) setDeactivateUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {deactivateUser?.is_active ? "Deactivate User" : "Reactivate User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {deactivateUser?.is_active
                ? <>Are you sure you want to deactivate <span className="font-semibold text-slate-900 dark:text-white">{deactivateUser?.name}</span>? They will no longer be able to log in.</>
                : <>Reactivate <span className="font-semibold text-slate-900 dark:text-white">{deactivateUser?.name}</span>? They will regain access to the system.</>
              }
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateUser(null)}>Cancel</Button>
            <Button
              onClick={handleToggleActive}
              loading={toggling}
              variant={deactivateUser?.is_active ? "destructive" : "default"}
            >
              {deactivateUser?.is_active ? "Deactivate" : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
