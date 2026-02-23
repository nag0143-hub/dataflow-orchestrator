import { BookOpen, ChevronDown, CheckCircle2, AlertCircle, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function UserGuide() {
  const [expandedSection, setExpandedSection] = useState(0);

  const sections = [
    {
      title: "Getting Started",
      content: [
        { label: "Logging In", desc: "Log in with your email and password to access DataFlow" },
        { label: "Dashboard Overview", desc: "View recent jobs, statistics, and quick actions" },
        { label: "Navigation", desc: "Use the left sidebar to access Connections, Jobs, and Activity Logs" }
      ]
    },
    {
      title: "Managing Connections",
      content: [
        { label: "Create a Connection", desc: "Define source and target systems with authentication details" },
        { label: "Connection Profiles", desc: "Save frequently-used settings as reusable profiles" },
        { label: "Test Connections", desc: "Verify connectivity before using in jobs" },
        { label: "Prerequisites", desc: "Track external setup requirements (firewall, DBA access, etc.)" }
      ]
    },
    {
      title: "Creating Data Transfer Jobs",
      content: [
        { label: "General Information", desc: "Set job name, description, cost center, and access controls" },
        { label: "Select Datasets", desc: "Choose which tables/datasets to transfer and configure each" },
        { label: "Configure Settings", desc: "Set schedules (manual, daily, weekly) and retry policies" },
        { label: "Advanced Features", desc: "Data cleansing, column mapping, and quality rules" },
        { label: "Review Job Spec", desc: "View JSON/YAML specification before submitting" }
      ]
    },
    {
      title: "Scheduling & Execution",
      content: [
        { label: "Manual Runs", desc: "Click 'Run' to execute a job immediately" },
        { label: "Automatic Scheduling", desc: "Jobs run on configured schedules without manual intervention" },
        { label: "Pausing Jobs", desc: "Temporarily stop scheduled execution without deleting the job" },
        { label: "Retry Configuration", desc: "Automatically retry failed jobs with exponential backoff" }
      ]
    },
    {
      title: "Monitoring & Observability",
      content: [
        { label: "Jobs List", desc: "View all jobs with status, success rate, and last run time" },
        { label: "Job Details", desc: "See run history, metrics, and detailed execution logs" },
        { label: "Activity Logs", desc: "Track all operations across the system with timestamps and users" },
        { label: "Version History", desc: "View and restore previous job configurations" }
      ]
    },
    {
      title: "Security & Access Control",
      content: [
        { label: "Job-Level Entitlements", desc: "Define which roles can access the entire job" },
        { label: "Dataset-Level Entitlements", desc: "Override access at the table level for sensitive data" },
        { label: "Role Management", desc: "Create custom roles like data_analyst, data_engineer, admin" }
      ]
    },
    {
      title: "Troubleshooting",
      content: [
        { label: "Job Failed", desc: "Check error message, verify connections, review activity logs" },
        { label: "Connection Failed", desc: "Verify host/port/credentials, check firewall rules" },
        { label: "No Data Transferred", desc: "Check filter query, table names, data cleansing rules" },
        { label: "Too Many Retries", desc: "Reduce max retries, fix underlying issue, pause job" }
      ]
    }
  ];

  const bestPractices = [
    { icon: CheckCircle2, title: "Use descriptive names", desc: "Job names like 'Daily Customer Sync' vs 'Job1'" },
    { icon: CheckCircle2, title: "Test first with small data", desc: "Verify jobs work before scheduling production runs" },
    { icon: CheckCircle2, title: "Enable quality rules", desc: "Define checks for critical data transfers" },
    { icon: CheckCircle2, title: "Monitor regularly", desc: "Review success rates and investigate failures" },
    { icon: AlertCircle, title: "Don't store credentials plainly", desc: "Use managed identities instead" },
    { icon: AlertCircle, title: "Control access properly", desc: "Use dataset-level entitlements for sensitive data" }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-emerald-600" />
          <h1 className="text-3xl font-bold text-slate-900">DataFlow User Guide</h1>
        </div>
        <p className="text-slate-600 text-lg">Step-by-step instructions for using the data transfer platform</p>
      </div>

      {/* Quick Reference */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: "1️⃣", title: "Create Connection", desc: "Set up source & target systems" },
          { icon: "2️⃣", title: "Create Job", desc: "Select datasets & configure transfer" },
          { icon: "3️⃣", title: "Run or Schedule", desc: "Execute manually or on schedule" }
        ].map((step, i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-4">
              <div className="text-3xl mb-2">{step.icon}</div>
              <h3 className="font-semibold text-slate-900">{step.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{step.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accordion Sections */}
      <div className="space-y-3">
        {sections.map((section, idx) => (
          <Card key={idx} className="border-slate-200">
            <button
              onClick={() => setExpandedSection(expandedSection === idx ? -1 : idx)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
              <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform ${expandedSection === idx ? 'rotate-180' : ''}`} />
            </button>

            {expandedSection === idx && (
              <CardContent className="p-4 border-t border-slate-200 space-y-3">
                {section.content.map((item, i) => (
                  <div key={i} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <h3 className="font-semibold text-slate-900 mb-1">{item.label}</h3>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Best Practices */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-6 h-6 text-amber-600" />
          <h2 className="text-2xl font-bold text-slate-900">Best Practices</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {bestPractices.map((practice, i) => {
            const Icon = practice.icon;
            return (
              <Card key={i} className={`border-l-4 ${practice.icon === CheckCircle2 ? 'border-l-emerald-500 bg-emerald-50' : 'border-l-amber-500 bg-amber-50'}`}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Icon className={`w-5 h-5 flex-shrink-0 mt-1 ${practice.icon === CheckCircle2 ? 'text-emerald-600' : 'text-amber-600'}`} />
                    <div>
                      <h3 className="font-semibold text-slate-900">{practice.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{practice.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Key Terminology */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-slate-900 mb-4 text-lg">Key Terminology</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <p><strong>Connection:</strong> A link to a source or target system</p>
            <p><strong>Job:</strong> A data transfer pipeline with configuration</p>
            <p><strong>Dataset:</strong> A table or file being transferred</p>
            <p><strong>Run:</strong> One execution of a job</p>
          </div>
          <div>
            <p><strong>Schedule:</strong> When/how often a job runs automatically</p>
            <p><strong>Entitlements:</strong> Roles that can access a job/dataset</p>
            <p><strong>Spec:</strong> JSON/YAML definition of a job</p>
            <p><strong>Version:</strong> A snapshot of job configuration over time</p>
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="bg-slate-100 rounded-lg p-6 text-center">
        <h3 className="font-bold text-slate-900 mb-2">Need Help?</h3>
        <p className="text-slate-600 mb-3">Check Activity Logs for detailed error messages or contact your DataFlow administrator</p>
        <p className="text-sm text-slate-500">Last updated: 2026-02-23</p>
      </div>
    </div>
  );
}