import { useState } from "react";
import { Shield, Server, Users, Key, Lock, AlertCircle, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  { icon: Users, title: "User Sync", description: "Automatically sync users and groups from your LDAP/Active Directory." },
  { icon: Key, title: "SSO Authentication", description: "Allow users to log in with their corporate credentials." },
  { icon: Lock, title: "Role Mapping", description: "Map LDAP groups to DataFlow roles (admin, user, viewer)." },
  { icon: Shield, title: "Access Control", description: "Enforce attribute-based access control from directory attributes." },
];

export default function LDAPIntegration() {
  const [formData, setFormData] = useState({
    server_url: "",
    base_dn: "",
    bind_dn: "",
    bind_password: "",
    user_search_filter: "(sAMAccountName={username})",
    group_search_base: "",
  });

  const handleChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">LDAP / Active Directory</h1>
              <p className="text-slate-500 text-sm">Enterprise directory integration</p>
            </div>
          </div>
        </div>
        <Badge className="bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1.5 px-3 py-1.5">
          <Clock className="w-3.5 h-3.5" />
          Coming Soon
        </Badge>
      </div>

      {/* Coming Soon Banner */}
      <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-5 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-violet-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-violet-900">Integration in Progress</p>
          <p className="text-sm text-violet-700 mt-0.5">
            LDAP/AD integration is currently under development. The configuration below is a preview of the upcoming feature.
            Fields are disabled until the integration is released.
          </p>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-2 gap-4">
        {features.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="border-slate-200 opacity-75">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Config Form (disabled preview) */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-500" />
            Server Configuration
            <span className="ml-auto text-xs font-normal text-slate-400">Preview — not yet active</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-slate-500">LDAP Server URL</Label>
              <Input disabled value={formData.server_url} onChange={e => handleChange("server_url", e.target.value)}
                placeholder="ldap://your-ad-server.corp.com:389" className="bg-slate-50 cursor-not-allowed" />
            </div>
            <div className="col-span-2">
              <Label className="text-slate-500">Base DN</Label>
              <Input disabled value={formData.base_dn} onChange={e => handleChange("base_dn", e.target.value)}
                placeholder="DC=corp,DC=example,DC=com" className="bg-slate-50 cursor-not-allowed" />
            </div>
            <div>
              <Label className="text-slate-500">Bind DN (Service Account)</Label>
              <Input disabled value={formData.bind_dn} onChange={e => handleChange("bind_dn", e.target.value)}
                placeholder="CN=svc-dataflow,OU=ServiceAccounts,DC=corp,DC=com" className="bg-slate-50 cursor-not-allowed" />
            </div>
            <div>
              <Label className="text-slate-500">Bind Password</Label>
              <Input disabled type="password" value={formData.bind_password} onChange={e => handleChange("bind_password", e.target.value)}
                placeholder="••••••••" className="bg-slate-50 cursor-not-allowed" />
            </div>
            <div className="col-span-2">
              <Label className="text-slate-500">User Search Filter</Label>
              <Input disabled value={formData.user_search_filter} onChange={e => handleChange("user_search_filter", e.target.value)}
                className="bg-slate-50 cursor-not-allowed font-mono text-xs" />
              <p className="text-xs text-slate-400 mt-1">Use {"{username}"} as a placeholder for the login name.</p>
            </div>
            <div className="col-span-2">
              <Label className="text-slate-500">Group Search Base</Label>
              <Input disabled value={formData.group_search_base} onChange={e => handleChange("group_search_base", e.target.value)}
                placeholder="OU=Groups,DC=corp,DC=example,DC=com" className="bg-slate-50 cursor-not-allowed" />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-300" />
              TLS/LDAPS support will be available at launch
            </p>
            <div className="flex gap-2">
              <Button disabled variant="outline" size="sm">Test Connection</Button>
              <Button disabled size="sm" className="gap-1.5">
                Save Configuration
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}