"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (user?.role === "admin") {
      router.replace("/admin/dashboard");
    } else if (user?.role === "manager") {
      router.replace("/manager/dashboard");
    } else {
      router.replace("/employee/dashboard");
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg animate-pulse" />
        <span className="text-slate-600 dark:text-slate-400">Loading PerformX...</span>
      </div>
    </div>
  );
}
