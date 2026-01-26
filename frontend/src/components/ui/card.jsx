import { cn } from "../../lib/utils";

export const Card = ({ className, children }) => (
  <div className={cn(
    "rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow duration-200",
    className
  )}>{children}</div>
);

export const CardHeader = ({ className, children }) => (
  <div className={cn("p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white", className)}>{children}</div>
);

export const CardTitle = ({ className, children }) => (
  <h3 className={cn("text-lg font-bold text-slate-900 tracking-tight", className)}>{children}</h3>
);

export const CardContent = ({ className, children }) => (
  <div className={cn("p-6 text-sm text-slate-700", className)}>{children}</div>
);

