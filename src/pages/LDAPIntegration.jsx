import { useState } from "react";
import { Server, Lock, Eye, EyeOff, LogIn, CheckCircle2, Users, Key, Shield, AlertCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DEFAULT_USER = "admin";
const DEFAULT_PASS = "admin";

export default function LDAPIntegration() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === DEFAULT_USER && password === DEFAULT_PASS) {
      setError("");
      setLoggedIn(true);
    } else {
      setError("Invalid credentials. Use the default administrator account.");
    }
  };

  if (!loggedIn) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo / Title */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center mx-auto shadow-lg">
              <Server className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">LDAP Portal</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Sign in with your directory credentials</p>
          </div>

          {/* Hint Banner */}
          <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Default credentials: <strong>admin / admin</strong></span>
          </div>

          {/* Login Form */}
          <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800 shadow-sm">
            <CardContent className="p-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="dark:text-slate-300">Username</Label>
                  <Input
                    autoFocus
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(""); }}
                    placeholder="administrator"
                    className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="dark:text-slate-300">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(""); }}
                      placeholder="••••••••"
                      className="pr-10 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            LDAP integration is a placeholder — full implementation coming soon.
          </p>
        </div>
      </div>
    );
  }

  // Logged-in state
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">LDAP Portal</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Logged in as <strong className="dark:text-slate-200">{DEFAULT_USER}</strong></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Authenticated
          </Badge>
          <Button variant="outline" size="sm" className="gap-1.5 dark:border-slate-600 dark:text-slate-300" onClick={() => { setLoggedIn(false); setUsername(""); setPassword(""); }}>
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="rounded-xl border border-violet-200 dark:border-violet-700 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 p-5 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-violet-900 dark:text-violet-300">Full Implementation Coming Soon</p>
          <p className="text-sm text-violet-700 dark:text-violet-400 mt-0.5">
            This portal will allow you to configure LDAP/AD sync, manage group role mappings, and enforce directory-based access control.
          </p>
        </div>
      </div>

      {/* Placeholder feature tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Users, label: "Directory Users", value: "—", note: "Sync pending" },
          { icon: Key, label: "Group Mappings", value: "—", note: "Not configured" },
          { icon: Shield, label: "Access Policies", value: "—", note: "Not configured" },
        ].map(({ icon: Icon, label, value, note }) => (
          <Card key={label} className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-lg font-bold text-slate-400 dark:text-slate-500">{value}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{note}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}