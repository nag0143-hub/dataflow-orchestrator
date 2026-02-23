import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { useState, useEffect } from "react";
import { 
        Workflow,
        Database,
        Home,
        Cable,
        Play,
        FileText,
        Sun,
        Moon,
        GitGraph,
        BookOpen,
        Shield
      } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Layout({ children }) {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("dataflow-dark") === "true";
  });
  
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dataflow-dark", darkMode);
  }, [darkMode]);

  const navItems = [
      { name: "Dashboard", icon: Home, page: "Dashboard" },
      { name: "Connections", icon: Cable, page: "Connections" },
      { name: "Jobs", icon: Play, page: "Jobs" },
      { name: "Data Catalog", icon: BookOpen, page: "DataCatalog" },
      { name: "Lineage", icon: GitGraph, page: "Lineage" },
      { name: "Activity Logs", icon: FileText, page: "ActivityLogs" },
    ];

  const isActive = (page) => {
    const path = location.pathname.toLowerCase();
    return path.includes(page.toLowerCase()) || 
           (page === "Dashboard" && path === "/");
  };

  return (
    <div className={cn("min-h-screen", darkMode ? "dark bg-slate-900" : "bg-slate-50")}>
      <style>{`
            :root {
              --brand-primary: #003478;
              --brand-accent: #FFB81C;
              --brand-success: #10b981;
              --brand-warning: #f59e0b;
              --brand-error: #ef4444;
            }
        .dark .dark-card { background: #1e293b; border-color: #334155; }
        .dark .dark-text { color: #f1f5f9; }
        .dark .dark-subtext { color: #94a3b8; }
        .dark .dark-header { background: #0f172a; border-color: #1e293b; }
        .dark .dark-hover:hover { background: #1e293b; }
        .dark .dark-divide { border-color: #1e293b; }
        .dark .dark-input { background: #1e293b; border-color: #334155; color: #f1f5f9; }
      `}</style>
      
      {/* Top Navigation Bar */}
      <header className={cn(
        "fixed top-0 left-0 right-0 h-16 border-b z-50 shadow-sm dark:shadow-lg",
        darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
      )}>
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003478] to-[#001F47] flex items-center justify-center">
                <Workflow className="w-5 h-5 text-white" />
              </div>
            <div>
              <h1 className={cn("text-lg font-semibold tracking-tight", darkMode ? "text-white" : "text-slate-900")}>DataFlow</h1>
              <p className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>Data Connector Platform</p>
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
                      ? darkMode ? "bg-[#003478] text-white shadow-lg shadow-[#003478]/30" : "bg-[#003478] text-white"
                      : darkMode ? "text-slate-300 hover:bg-slate-700 hover:text-white hover:shadow-md" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:shadow-sm"
                 )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                darkMode ? "bg-slate-800 text-amber-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
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