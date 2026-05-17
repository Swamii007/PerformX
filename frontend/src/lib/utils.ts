import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return `${score.toFixed(1)}%`;
}

export function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "text-slate-400";
  if (score >= 90) return "text-emerald-500";
  if (score >= 70) return "text-blue-500";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

export function getScoreBg(score: number | null | undefined): string {
  if (score === null || score === undefined) return "bg-slate-100 dark:bg-slate-800";
  if (score >= 90) return "bg-emerald-50 dark:bg-emerald-950";
  if (score >= 70) return "bg-blue-50 dark:bg-blue-950";
  if (score >= 50) return "bg-amber-50 dark:bg-amber-950";
  return "bg-red-50 dark:bg-red-950";
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    returned: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    not_started: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    on_track: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    at_risk: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  };
  return map[status] || "bg-slate-100 text-slate-600";
}

export function getUoMLabel(uomType: string): string {
  const map: Record<string, string> = {
    numeric_min: "Numeric (Higher is Better)",
    numeric_max: "Numeric (Lower is Better)",
    timeline: "Timeline",
    zero: "Zero-Based",
  };
  return map[uomType] || uomType;
}

export function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? "" : String(val);
        return str.includes(",") ? `"${str}"` : str;
      }).join(",")
    )
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
