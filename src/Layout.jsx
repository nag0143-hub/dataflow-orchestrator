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
  HelpCircle,
  PanelLeftClose,
  PanelLeft,
  Database,
  ScrollText,
  Activity,
  Wind,
  Code2,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Layout({ children }) {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("dataflow-dark") === "true";
  });
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("dataflow-sidebar-collapsed") === "true";
  });
  const [adminMode, setAdminMode] = useState(() => {
    return localStorage.getItem("dataflow-admin") === "true";
  });
  
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dataflow-dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("dataflow-sidebar-collapsed", collapsed);
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem("dataflow-admin", adminMode);
  }, [adminMode]);

  const navItems = [
    { name: "Dashboard", icon: Home, page: "Dashboard" },
    { name: "Connections", icon: Cable, page: "Connections" },
    { name: "Pipelines", icon: Play, page: "Pipelines" },
    { name: "Data Catalog", icon: BookOpen, page: "DataCatalog" },
    { name: "User Guide", icon: HelpCircle, page: "UserGuide" },
  ];

  const adminNavItems = [
    { name: "Data Model", icon: Database, page: "DataModel" },
    { name: "Audit Trail", icon: ScrollText, page: "AuditTrail" },
    { name: "Activity Logs", icon: Activity, page: "ActivityLogs" },
    { name: "Airflow", icon: Wind, page: "Airflow" },
    { name: "Custom Functions", icon: Code2, page: "CustomFunctions" },
  ];

  const isActive = (page) => {
    const path = location.pathname.toLowerCase();
    return path.includes(page.toLowerCase()) || 
           (page === "Dashboard" && path === "/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 z-50 flex flex-col border-r transition-all duration-300",
        "bg-[hsl(var(--sidebar-background))] border-[hsl(var(--sidebar-border))]",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}>
        <div className={cn(
          "flex items-center h-16 border-b border-[hsl(var(--sidebar-border))]",
          collapsed ? "justify-center px-2" : "px-4 gap-3"
        )}>
          <div className="w-9 h-9 rounded-lg bg-[#0060AF] flex items-center justify-center flex-shrink-0">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-white truncate">DataFlow</h1>
              <p className="text-[11px] text-[hsl(var(--sidebar-foreground))] truncate">Data Connector Platform</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                isActive(item.page)
                  ? "bg-[#0060AF] text-white shadow-sm shadow-[#0060AF]/30"
                  : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
              )}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          ))}
          {adminMode && (
            <>
              <div className="h-px bg-[hsl(var(--sidebar-border))] mx-2 my-2" />
              {!collapsed && (
                <div className="text-[10px] uppercase tracking-widest text-[hsl(var(--sidebar-foreground))] opacity-60 px-3 mb-1">Admin</div>
              )}
              {adminNavItems.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  title={collapsed ? item.name : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                    collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                    isActive(item.page)
                      ? "bg-[#0060AF] text-white shadow-sm shadow-[#0060AF]/30"
                      : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
                  )}
                >
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className={cn(
          "border-t border-[hsl(var(--sidebar-border))] py-3 px-2 space-y-1"
        )}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={cn(
              "flex items-center gap-3 w-full rounded-lg text-sm font-medium transition-colors",
              "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white",
              collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
            )}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun className="w-[18px] h-[18px] flex-shrink-0 text-amber-400" /> : <Moon className="w-[18px] h-[18px] flex-shrink-0" />}
            {!collapsed && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          <button
            onClick={() => setAdminMode(!adminMode)}
            className={cn(
              "flex items-center gap-3 w-full rounded-lg text-sm font-medium transition-colors",
              "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white",
              collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
            )}
            title={adminMode ? "Disable admin mode" : "Enable admin mode"}
          >
            <Shield className={cn("w-[18px] h-[18px] flex-shrink-0", adminMode && "text-amber-400")} />
            {!collapsed && <span>Admin Mode</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex items-center gap-3 w-full rounded-lg text-sm font-medium transition-colors",
              "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white",
              collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="w-[18px] h-[18px] flex-shrink-0" /> : <PanelLeftClose className="w-[18px] h-[18px] flex-shrink-0" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
      
      <main className={cn(
        "flex-1 min-h-screen transition-all duration-300",
        collapsed ? "ml-[60px]" : "ml-[240px]"
      )}>
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
