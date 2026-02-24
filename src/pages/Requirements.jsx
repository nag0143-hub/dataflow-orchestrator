import { FileText, CheckCircle2, Users, Database, Shield, Eye, TrendingUp, Lock, Zap, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Requirements() {
  const features = [
    {
      icon: Database,
      title: "Multi-Platform Connections",
      desc: "SQL Server, Oracle, PostgreSQL, MySQL, MongoDB, ADLS2, S3, SFTP, NAS, and flat files"
    },
    {
      icon: CheckCircle2,
      title: "Data Quality Rules",
      desc: "Not null checks, value ranges, duplicate detection, row count validation"
    },
    {
      icon: Users,
      title: "Role-Based Access",
      desc: "Job-level and dataset-level entitlements for granular security"
    },
    {
      icon: Eye,
      title: "Complete Audit Trail",
      desc: "Track all operations with activity logs and version history"
    },
    {
      icon: Shield,
      title: "Data Transformation",
      desc: "Column mapping, cleansing rules, and transformations"
    },
    {
      icon: Database,
      title: "Schedule & Monitor",
      desc: "Manual, hourly, daily, weekly, monthly, or custom cron schedules"
    }
  ];

  const useCases = [
    {
      title: "Daily Data Synchronization",
      desc: "Sync customer data from production DB to data warehouse daily"
    },
    {
      title: "Bulk Data Migration",
      desc: "Migrate historical data with filters to minimize load"
    },
    {
      title: "Multi-Team Data Access",
      desc: "Control which teams can access specific datasets"
    },
    {
      title: "Data Quality Assurance",
      desc: "Ensure data integrity during transfers with validation rules"
    },
    {
      title: "Cost Allocation",
      desc: "Track data transfer costs and maintain audit trail"
    }
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 border-2 border-blue-100">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-blue-600 rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900">DataFlow Requirements & Use Cases</h1>
        </div>
        <p className="text-slate-700 text-lg ml-16">Enterprise data connector platform for managing data transfer pipelines</p>
      </div>

      {/* Core Features */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3"><Zap className="w-6 h-6 text-blue-600" /> Core Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <Card key={i} className="border-2 border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all bg-white">
                <CardContent className="p-5">
                  <div className="flex gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Icon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                      <p className="text-sm text-slate-600">{f.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Use Cases */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3"><Target className="w-6 h-6 text-purple-600" /> Key Use Cases</h2>
        <div className="space-y-3">
          {useCases.map((uc, i) => (
            <Card key={i} className="border-2 border-slate-200 hover:border-purple-300 transition-all bg-gradient-to-r from-white to-purple-50/30">
              <CardContent className="p-5">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 font-semibold text-sm">{i + 1}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">{uc.title}</h3>
                    <p className="text-sm text-slate-600">{uc.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Platform Support */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-bold text-slate-900 mb-3 text-lg">Data Sources Supported</h3>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            <p>• <strong>Databases</strong>: SQL Server, Oracle, PostgreSQL, MySQL, MongoDB</p>
            <p>• <strong>Cloud Storage</strong>: Azure ADLS2, AWS S3</p>
            <p>• <strong>File Systems</strong>: SFTP, NAS, Local FS</p>
            <p>• <strong>Formats</strong>: CSV, Fixed-width, COBOL/EBCDIC</p>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-900 mb-3 text-lg">Security & Compliance</h3>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            <p>• <strong>RBAC</strong>: Role-based access control</p>
            <p>• <strong>Row-Level Security</strong>: Dataset-level permissions</p>
            <p>• <strong>Audit Logging</strong>: Complete operation trail</p>
            <p>• <strong>Encryption</strong>: At rest and in transit</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3"><TrendingUp className="w-6 h-6 text-emerald-600" /> Success Metrics</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { label: "Target Success Rate", value: "> 95%", icon: CheckCircle2 },
            { label: "Data Retention", value: "2 Years", icon: Database },
            { label: "Platform Availability", value: "99% SLA", icon: Shield },
            { label: "Performance", value: "< 5s Updates", icon: Zap }
          ].map((m, i) => {
            const Icon = m.icon;
            return (
              <Card key={i} className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-lg transition-shadow">
                <CardContent className="p-5 text-center">
                  <Icon className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 mb-2 font-medium">{m.label}</p>
                  <p className="text-3xl font-bold text-emerald-700">{m.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-8 border-2 border-slate-200 text-center">
        <p className="text-slate-700 font-medium">For detailed technical specifications and architecture documentation, contact your DataFlow administrator.</p>
      </div>
    </div>
  );
}