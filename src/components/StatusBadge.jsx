import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Loader2, AlertTriangle, Pause } from "lucide-react";

const statusConfig = {
  // Job statuses
  idle: { color: "bg-slate-100 text-slate-700", icon: Clock, label: "Idle" },
  running: { color: "bg-blue-100 text-blue-700", icon: Loader2, label: "Running", animate: true },
  completed: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "Completed" },
  failed: { color: "bg-red-100 text-red-700", icon: XCircle, label: "Failed" },
  paused: { color: "bg-amber-100 text-amber-700", icon: Pause, label: "Paused" },
  retrying: { color: "bg-orange-100 text-orange-700", icon: Loader2, label: "Retrying", animate: true },
  cancelled: { color: "bg-slate-100 text-slate-600", icon: XCircle, label: "Cancelled" },
  
  // Connection statuses
  active: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "Active" },
  inactive: { color: "bg-slate-100 text-slate-600", icon: Clock, label: "Inactive" },
  error: { color: "bg-red-100 text-red-700", icon: AlertTriangle, label: "Error" },
  pending_setup: { color: "bg-amber-100 text-amber-700", icon: AlertTriangle, label: "Pending Setup" },
  
  // Log types
  info: { color: "bg-blue-100 text-blue-700", icon: Clock, label: "Info" },
  warning: { color: "bg-amber-100 text-amber-700", icon: AlertTriangle, label: "Warning" },
  success: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "Success" },
};

export default function StatusBadge({ status, size = "default" }) {
  const config = statusConfig[status] || statusConfig.idle;
  const Icon = config.icon;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-medium",
      config.color,
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
    )}>
      <Icon className={cn(
        size === "sm" ? "w-3 h-3" : "w-4 h-4",
        config.animate && "animate-spin"
      )} />
      {config.label}
    </span>
  );
}