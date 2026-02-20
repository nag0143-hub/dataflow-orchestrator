import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { 
  Database, 
  Settings, 
  Activity, 
  AlertCircle, 
  Home,
  Cable,
  Play,
  FileText,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Layout({ children }) {
  const location = useLocation();
  
  const navItems = [
    { name: "Dashboard", icon: Home, page: "Dashboard" },
    { name: "Connections", icon: Cable, page: "Connections" },
    { name: "Jobs", icon: Play, page: "Jobs" },
    { name: "Activity Logs", icon: FileText, page: "ActivityLogs" },
  ];

  const isActive = (page) => {
    const path = location.pathname.toLowerCase();
    return path.includes(page.toLowerCase()) || 
           (page === "Dashboard" && path === "/");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        :root {
          --brand-primary: #0f172a;
          --brand-accent: #3b82f6;
          --brand-success: #10b981;
          --brand-warning: #f59e0b;
          --brand-error: #ef4444;
        }
      `}</style>
      
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight">DataFlow</h1>
              <p className="text-xs text-slate-500">Data Connector Platform</p>
            </div>
          </div>
          
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive(item.page)
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <span className="text-white text-xs font-medium">U</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}