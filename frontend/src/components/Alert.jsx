import { cn } from "../lib/utils";

export const Alert = ({ variant = "info", children }) => {
  const classes = {
    info: "bg-blue-50 text-blue-800 border-blue-200",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    error: "bg-red-50 text-red-800 border-red-200",
  };
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", classes[variant] || classes.info)}>
      {children}
    </div>
  );
};

