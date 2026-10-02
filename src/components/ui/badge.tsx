import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none select-none",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-indigo-600 text-white shadow-sm shadow-indigo-600/30",
        secondary:
          "border border-slate-700 bg-slate-800 text-slate-300",
        destructive:
          "border border-transparent bg-rose-600/20 text-rose-300 border border-rose-500/30",
        outline:
          "text-slate-300 border border-slate-700",
        success:
          "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 font-medium",
        warning:
          "border border-amber-500/30 bg-amber-500/15 text-amber-300 font-medium",
        subtle:
          "bg-slate-800/80 text-slate-300 border border-slate-700/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
