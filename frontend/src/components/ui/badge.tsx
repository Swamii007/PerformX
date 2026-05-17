import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blue-600 text-white",
        secondary: "border-transparent bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
        destructive: "border-transparent bg-red-500 text-white",
        outline: "text-slate-950 dark:text-slate-50",
        success: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        warning: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
        info: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
