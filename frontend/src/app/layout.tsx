import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "PerformX — Goal Setting & Tracking Portal",
  description: "In-House Goal Setting & Tracking Portal — AtomQuest Hackathon 1.0",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/*
          attribute="class"  → next-themes adds/removes .dark on <html>
          defaultTheme="light" → always start light
          enableSystem={false} → ignore OS preference, user toggle wins
          disableTransitionOnChange → no flash on switch
        */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
