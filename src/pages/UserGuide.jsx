import { BookOpen, ChevronDown, CheckCircle2, AlertCircle, Lightbulb, Code2, Play, Settings, Cable } from "lucide-react";
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
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-8 border border-emerald-100">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-emerald-600 rounded-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900">DataFlow User Guide</h1>
        </div>
        <p className="text-slate-700 text-lg ml-16">Step-by-step instructions for using the data transfer platform</p>
      </div>

      {/* Quick Reference */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Cable, title: "Create Connection", desc: "Set up source & target systems", color: "blue" },
          { icon: Play, title: "Create Job", desc: "Select datasets & configure transfer", color: "purple" },
          { icon: Settings, title: "Run or Schedule", desc: "Execute manually or on schedule", color: "emerald" }
        ].map((step, i) => {
          const Icon = step.icon;
          const bgColor = `from-${step.color}-50 to-${step.color}-50`;
          const borderColor = `border-${step.color}-200`;
          const iconColor = `text-${step.color}-600`;
          return (
            <Card key={i} className={`border-2 ${borderColor} bg-gradient-to-br ${bgColor} hover:shadow-lg transition-all`}>
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-lg ${iconColor} bg-white/50 flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{step.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Accordion Sections */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-slate-900 mt-4 mb-4">Learn the Basics</h2>
        {sections.map((section, idx) => (
          <Card key={idx} className={`border-2 transition-all ${expandedSection === idx ? 'border-emerald-300 bg-emerald-50/30 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
            <button
              onClick={() => setExpandedSection(expandedSection === idx ? -1 : idx)}
              className="w-full p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
            >
              <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
              <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform duration-300 ${expandedSection === idx ? 'rotate-180' : ''}`} />
            </button>

            {expandedSection === idx && (
              <CardContent className="p-5 border-t border-slate-200 space-y-4">
                {section.content.map((item, i) => (
                  <div key={i} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      {item.label}
                    </h3>
                    <p className="text-sm text-slate-600 ml-8">{item.desc}</p>
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
      <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 border-2 border-blue-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Code2 className="w-6 h-6 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-lg">Key Terminology</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-8 text-sm">
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p><strong className="text-blue-700">Connection</strong><br/><span className="text-slate-600">A link to a source or target system</span></p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p><strong className="text-blue-700">Job</strong><br/><span className="text-slate-600">A data transfer pipeline with configuration</span></p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p><strong className="text-blue-700">Dataset</strong><br/><span className="text-slate-600">A table or file being transferred</span></p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p><strong className="text-blue-700">Run</strong><br/><span className="text-slate-600">One execution of a job</span></p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p><strong className="text-blue-700">Schedule</strong><br/><span className="text-slate-600">When/how often a job runs automatically</span></p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p><strong className="text-blue-700">Entitlements</strong><br/><span className="text-slate-600">Roles that can access a job/dataset</span></p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p><strong className="text-blue-700">Spec</strong><br/><span className="text-slate-600">JSON/YAML definition of a job</span></p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p><strong className="text-blue-700">Version</strong><br/><span className="text-slate-600">A snapshot of job configuration over time</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-8 border-2 border-slate-200 text-center">
        <h3 className="font-bold text-slate-900 mb-3 text-lg">Need Help?</h3>
        <p className="text-slate-700 mb-4">Check Activity Logs for detailed error messages or contact your DataFlow administrator</p>
        <p className="text-sm text-slate-500 font-medium">Last updated: 2026-02-23</p>
      </div>
    </div>
  );
}