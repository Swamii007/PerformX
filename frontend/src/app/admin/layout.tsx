"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppLayout } from "@/components/layout/AppLayout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
    else if (user?.role !== "admin") router.replace(`/${user?.role}/dashboard`);
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== "admin") return null;
  return <AppLayout>{children}</AppLayout>;
}
