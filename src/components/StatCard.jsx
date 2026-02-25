import { cn } from "@/lib/utils";

export default function StatCard({ title, value, subtitle, icon: Icon, trend, className }) {
  return (
    <div className={cn(
      "bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow duration-300",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 mt-2 text-sm font-medium",
              trend.positive ? "text-emerald-600" : "text-red-600"
            )}>
              <span>{trend.positive ? "↑" : "↓"} {trend.value}</span>
              <span className="text-slate-400 dark:text-slate-500">vs last week</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Icon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </div>
        )}
      </div>
    </div>
  );
}