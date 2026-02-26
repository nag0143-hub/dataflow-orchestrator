import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { useState, useEffect } from "react";
import { 
        Workflow,
        Home,
        Cable,
        Play,
        Sun,
        Moon,
        BookOpen,
        HelpCircle
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
        { name: "Pipelines", icon: Play, page: "Pipelines" },
        { name: "Data Catalog", icon: BookOpen, page: "DataCatalog" },
        { name: "User Guide", icon: HelpCircle, page: "UserGuide" },
        ];

  const isActive = (page) => {
    const path = location.pathname.toLowerCase();
    return path.includes(page.toLowerCase()) || 
           (page === "Dashboard" && path === "/");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="fixed top-0 left-0 right-0 h-16 border-b z-50 shadow-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center">
                <Workflow className="w-5 h-5 text-white" />
              </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">DataFlow</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Data Connector Platform</p>
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
                      ? "bg-slate-800 dark:bg-slate-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
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
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-600"
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
      
      <main className="pt-16 min-h-screen">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
