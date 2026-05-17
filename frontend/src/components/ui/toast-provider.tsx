"use client";
import { Toaster } from "sonner";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ToastProvider() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <Toaster position="top-right" richColors closeButton />;

  return (
    <Toaster
      theme={resolvedTheme as "light" | "dark"}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: { fontFamily: "Inter, sans-serif" },
        duration: 4000,
      }}
    />
  );
}
