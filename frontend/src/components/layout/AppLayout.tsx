"use client";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
