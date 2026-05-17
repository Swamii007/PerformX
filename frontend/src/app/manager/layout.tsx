"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppLayout } from "@/components/layout/AppLayout";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
    else if (user?.role !== "manager") router.replace(`/${user?.role}/dashboard`);
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== "manager") return null;
  return <AppLayout>{children}</AppLayout>;
}
