import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PipelineStepIndicator({ steps, activeStep, onStepClick, completedSteps = [] }) {
  return (
    <div className="flex items-center gap-0 w-full mb-6">
      {steps.map((step, idx) => {
        const isActive = step.key === activeStep;
        const isCompleted = completedSteps.includes(step.key);
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onStepClick(step.key)}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 min-w-0 px-1 py-1 rounded-lg transition-all group",
                isActive ? "opacity-100" : "opacity-60 hover:opacity-80"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                isCompleted && !isActive
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : isActive
                  ? "bg-[#0060AF] border-[#0060AF] text-white dark:bg-[#0060AF] dark:border-[#0060AF]"
                  : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 group-hover:border-slate-400"
              )}>
                {isCompleted && !isActive ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span className={cn(
                "text-xs font-medium truncate max-w-full",
                isActive ? "text-slate-800 dark:text-white" : isCompleted ? "text-emerald-600" : "text-slate-400"
              )}>
                {step.label}
              </span>
            </button>

            {!isLast && (
              <div className={cn(
                "h-0.5 w-4 shrink-0 mx-0.5 rounded",
                isCompleted ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}