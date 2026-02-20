import { Database, Server, Cloud, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";

const platformConfig = {
  sql_server: { icon: Server, color: "bg-red-100 text-red-600", label: "SQL Server" },
  oracle: { icon: Database, color: "bg-orange-100 text-orange-600", label: "Oracle" },
  postgresql: { icon: Database, color: "bg-blue-100 text-blue-600", label: "PostgreSQL" },
  mysql: { icon: Database, color: "bg-cyan-100 text-cyan-600", label: "MySQL" },
  mongodb: { icon: Database, color: "bg-green-100 text-green-600", label: "MongoDB" },
  adls2: { icon: Cloud, color: "bg-sky-100 text-sky-600", label: "Azure ADLS Gen2" },
  s3: { icon: HardDrive, color: "bg-amber-100 text-amber-600", label: "AWS S3" },
};

export default function PlatformIcon({ platform, showLabel = false, size = "default" }) {
  const config = platformConfig[platform] || { icon: Database, color: "bg-slate-100 text-slate-600", label: platform };
  const Icon = config.icon;
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "rounded-lg flex items-center justify-center",
        config.color,
        size === "sm" ? "w-7 h-7" : "w-9 h-9"
      )}>
        <Icon className={size === "sm" ? "w-4 h-4" : "w-5 h-5"} />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-slate-700">{config.label}</span>
      )}
    </div>
  );
}

export { platformConfig };