import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800", className)}
      {...props}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  );
}

export function GoalCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="grid grid-cols-3 gap-3 pt-1">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-16 rounded-lg" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return <Skeleton className="w-full rounded-xl" style={{ height }} />;
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <GoalCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export { Skeleton };
