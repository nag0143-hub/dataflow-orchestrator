import { FileText, CheckCircle2, Users, Database, Shield, Eye } from "lucide-react";
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
      <div>
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">DataFlow Requirements & Use Cases</h1>
        </div>
        <p className="text-slate-600 text-lg">Enterprise data connector platform for managing data transfer pipelines</p>
      </div>

      {/* Core Features */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Core Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <Card key={i} className="border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Icon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
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
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Key Use Cases</h2>
        <div className="space-y-3">
          {useCases.map((uc, i) => (
            <Card key={i} className="border-slate-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-slate-900 mb-1">{uc.title}</h3>
                <p className="text-sm text-slate-600">{uc.desc}</p>
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
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Success Metrics</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { label: "Target Success Rate", value: "> 95%" },
            { label: "Data Retention", value: "2 Years" },
            { label: "Platform Availability", value: "99% SLA" },
            { label: "Performance", value: "< 5s Updates" }
          ].map((m, i) => (
            <Card key={i} className="border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-slate-600 mb-2">{m.label}</p>
                <p className="text-2xl font-bold text-blue-600">{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 rounded-lg p-6 text-center text-sm text-slate-600">
        <p>For detailed technical specifications and architecture documentation, contact your DataFlow administrator.</p>
      </div>
    </div>
  );
}