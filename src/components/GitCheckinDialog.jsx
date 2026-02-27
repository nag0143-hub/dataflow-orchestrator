import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Download, Check, Rocket, FileCode2, FileText, ChevronDown, ChevronUp, X, GitBranch, LayoutTemplate, Loader2, AlertCircle, ExternalLink, CheckCircle2, Lock, Eye, EyeOff, RefreshCw, Info } from "lucide-react";
import { buildJobSpec, FLAT_FILE_PLATFORMS } from "@/components/JobSpecExport";
import { BUILTIN_TEMPLATES, getAllTemplates, getTemplatesForSource, getDefaultTemplateId, fillTemplate } from "@/components/DagTemplates";
import { dataflow } from "@/api/client";
import { toYaml } from "@/utils/toYaml";

const DEFAULT_GITHUB_OWNER = "nag0143-hub";
const DEFAULT_GITHUB_REPO = "dataflow-platform";

function ArtifactCard({ title, filename, icon: Icon, content }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <Icon className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-400 font-mono truncate">{filename}</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            type="button" size="sm" variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            type="button" size="sm" variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={handleDownload}
          >
            <Download className="w-3 h-3" />
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>
      {expanded && (
        <div className="bg-slate-950 overflow-hidden">
          <pre className="p-4 text-xs text-emerald-300 font-mono whitespace-pre overflow-auto max-h-64 leading-relaxed">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

function GitLabIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z" />
    </svg>
  );
}

function GitHubIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function StatusBadge({ connected, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
      connected
        ? "bg-emerald-100 text-emerald-700"
        : "bg-red-100 text-red-700"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`} />
      {label}
    </span>
  );
}

export default function GitCheckinDialog({ open, onOpenChange, pipelineData, connections }) {
  if (!pipelineData) return null;

  const sourceConn = connections.find(c => c.id === pipelineData.source_connection_id);
  const sourcePlatform = sourceConn?.platform || "";
  const isFlatFile = FLAT_FILE_PLATFORMS.includes(sourcePlatform);

  const [customTemplates, setCustomTemplates] = useState([]);
  const [templateOverride, setTemplateOverride] = useState(null);
  const [provider, setProvider] = useState("github");

  const [ghOwner, setGhOwner] = useState(DEFAULT_GITHUB_OWNER);
  const [ghRepo, setGhRepo] = useState(DEFAULT_GITHUB_REPO);
  const [commitBranch, setCommitBranch] = useState("main");
  const [commitMsg, setCommitMsg] = useState("");

  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);
  const [deployError, setDeployError] = useState(null);

  const [ghStatus, setGhStatus] = useState(null);
  const [ghChecking, setGhChecking] = useState(false);

  const [glConfig, setGlConfig] = useState(null);
  const [glUsername, setGlUsername] = useState("");
  const [glPassword, setGlPassword] = useState("");
  const [glStatus, setGlStatus] = useState(null);
  const [glAuthenticating, setGlAuthenticating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    dataflow.entities.DagTemplate.list().then(res => {
      if (Array.isArray(res)) setCustomTemplates(res);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setDeployResult(null);
      setDeployError(null);
      setDeploying(false);
      setGlStatus(null);
      checkGitHubStatus();
      fetch("/api/gitlab/config").then(r => r.json()).then(setGlConfig).catch(() => setGlConfig({ configured: false }));
    }
  }, [open]);

  const checkGitHubStatus = async () => {
    setGhChecking(true);
    try {
      const res = await fetch("/api/github/status");
      const data = await res.json();
      setGhStatus(data);
      if (data.defaultOwner) setGhOwner(data.defaultOwner);
      if (data.defaultRepo) setGhRepo(data.defaultRepo);
    } catch {
      setGhStatus({ connected: false, error: "Failed to check status" });
    } finally {
      setGhChecking(false);
    }
  };

  const allTemplates = getAllTemplates(customTemplates);
  const selectedTemplateId = templateOverride || pipelineData.dag_template_id || getDefaultTemplateId(sourcePlatform);

  const nameClean = (pipelineData.name || "pipeline").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  const dagFilename = `${nameClean}-airflow-dag.yaml`;
  const specFilename = `${nameClean}-pipelinespec.yaml`;
  const repoPath = `specs/${nameClean}/`;

  const spec = buildJobSpec({ id: pipelineData.id || "(unsaved)", ...pipelineData, dq_rules: pipelineData.dq_rules || {} }, connections);
  const cleanSpec = JSON.parse(JSON.stringify(spec));
  const specContent = `# DataFlow Pipeline Spec — ${pipelineData.name || "untitled"}\n` + toYaml(cleanSpec);

  const airflowDagYaml = fillTemplate(selectedTemplateId, pipelineData, connections, customTemplates);

  const selectedTmpl = allTemplates.find(t => t.id === selectedTemplateId);

  const builtinForSource = BUILTIN_TEMPLATES.filter(t => t.sourceType === (isFlatFile ? "flat_file" : "database"));
  const builtinOther = BUILTIN_TEMPLATES.filter(t => t.sourceType !== (isFlatFile ? "flat_file" : "database"));
  const customForSource = customTemplates.filter(t => !t.sourceType || t.sourceType === "any" || t.sourceType === (isFlatFile ? "flat_file" : "database"));
  const customOther = customTemplates.filter(t => t.sourceType && t.sourceType !== "any" && t.sourceType !== (isFlatFile ? "flat_file" : "database"));

  const defaultCommitMsg = pipelineData._isUpdate
    ? `Update pipeline: ${pipelineData.name}`
    : `Add pipeline: ${pipelineData.name}`;

  const filePayload = [
    { path: `${repoPath}${dagFilename}`, content: airflowDagYaml },
    { path: `${repoPath}${specFilename}`, content: specContent },
  ];

  const handleGitLabAuth = async () => {
    if (!glUsername || !glPassword) return;
    setGlAuthenticating(true);
    setGlStatus(null);
    try {
      const res = await fetch("/api/gitlab/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: glUsername, password: glPassword }),
      });
      const data = await res.json();
      setGlStatus(data);
    } catch (err) {
      setGlStatus({ connected: false, error: err.message });
    } finally {
      setGlAuthenticating(false);
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    setDeployResult(null);
    setDeployError(null);
    try {
      let res, data;
      if (provider === "github") {
        res = await fetch("/api/github/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: ghOwner || DEFAULT_GITHUB_OWNER,
            repo: ghRepo || DEFAULT_GITHUB_REPO,
            branch: commitBranch || "main",
            commitMessage: commitMsg || defaultCommitMsg,
            files: filePayload,
          }),
        });
      } else {
        res = await fetch("/api/gitlab/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: glUsername,
            password: glPassword,
            branch: commitBranch || "main",
            commitMessage: commitMsg || defaultCommitMsg,
            files: filePayload,
          }),
        });
      }
      data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Commit failed");
      }
      setDeployResult({ ...data, provider });
    } catch (err) {
      setDeployError(err.message);
    } finally {
      setDeploying(false);
    }
  };

  const canDeploy = provider === "github"
    ? ghStatus?.connected
    : glStatus?.connected && glUsername && glPassword;

  const handleClose = () => {
    if (!deploying) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!deploying && !v) onOpenChange(false); }}>
      <DialogContent
        preventClose={deploying}
        className="w-[95vw] max-w-4xl max-h-[92vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => { if (deploying) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-[#0060AF]" />
            Deploy Pipeline — {pipelineData.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* Section 1: Provider toggle */}
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Git Provider</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setProvider("github"); setDeployResult(null); setDeployError(null); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                  provider === "github"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
              >
                <GitHubIcon className="w-4 h-4" />
                GitHub
              </button>
              <button
                type="button"
                onClick={() => { setProvider("gitlab"); setDeployResult(null); setDeployError(null); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                  provider === "gitlab"
                    ? "bg-orange-600 text-white border-orange-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-orange-400"
                }`}
              >
                <GitLabIcon className="w-4 h-4" />
                GitLab
              </button>
            </div>
          </div>

          {/* Section 2: Git Repository + Connection Status */}
          {provider === "github" && (
            <div className="rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">GitHub Repository & Status</Label>
                <div className="flex items-center gap-2">
                  {ghChecking ? (
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking...</span>
                  ) : ghStatus ? (
                    <StatusBadge connected={ghStatus.connected} label={ghStatus.connected ? `Connected as ${ghStatus.login}` : "Not connected"} />
                  ) : null}
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={checkGitHubStatus} title="Refresh status">
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Owner / Organization</label>
                  <Input
                    value={ghOwner}
                    onChange={e => setGhOwner(e.target.value)}
                    className="font-mono text-sm"
                    placeholder="owner"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Repository</label>
                  <Input
                    value={ghRepo}
                    onChange={e => setGhRepo(e.target.value)}
                    className="font-mono text-sm"
                    placeholder="repo-name"
                  />
                </div>
              </div>
              {!ghStatus?.connected && ghStatus?.error && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {ghStatus.error}
                </p>
              )}
            </div>
          )}

          {provider === "gitlab" && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/50 px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-orange-700 uppercase tracking-wide">GitLab Repository & Authentication</Label>
                {glStatus && (
                  <StatusBadge connected={glStatus.connected} label={glStatus.connected ? `Authenticated as ${glStatus.login}` : "Not authenticated"} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-orange-700 block mb-1">GitLab URL</label>
                  <Input
                    value={glConfig?.url || ""}
                    readOnly
                    className="font-mono text-sm bg-orange-50 text-orange-800"
                    placeholder="Set GITLAB_URL env var"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-orange-700 block mb-1">Project Path</label>
                  <Input
                    value={glConfig?.project || ""}
                    readOnly
                    className="font-mono text-sm bg-orange-50 text-orange-800"
                    placeholder="Set GITLAB_PROJECT env var"
                  />
                </div>
              </div>
              {!glConfig?.configured && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Set GITLAB_URL and GITLAB_PROJECT environment variables to configure.
                </p>
              )}
              <div className="border-t border-orange-200 pt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-orange-700" />
                  <p className="text-xs font-semibold text-orange-800">LDAP Credentials</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-orange-700 block mb-1">Username</label>
                    <Input
                      type="text"
                      value={glUsername}
                      onChange={e => { setGlUsername(e.target.value); setGlStatus(null); }}
                      className="font-mono text-sm"
                      placeholder="LDAP username"
                      autoComplete="username"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-orange-700 block mb-1">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={glPassword}
                        onChange={e => { setGlPassword(e.target.value); setGlStatus(null); }}
                        className="font-mono text-sm pr-9"
                        placeholder="LDAP password"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-400 hover:text-orange-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!glUsername || !glPassword || glAuthenticating || !glConfig?.configured}
                    onClick={handleGitLabAuth}
                    className="h-7 px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {glAuthenticating ? (
                      <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Authenticating...</>
                    ) : (
                      "Authenticate"
                    )}
                  </Button>
                  {glStatus && !glStatus.connected && (
                    <span className="text-xs font-medium text-red-500">{glStatus.error || "Authentication failed"}</span>
                  )}
                </div>
                <p className="text-xs text-orange-500">Credentials are used only for this commit and are never stored.</p>
              </div>
            </div>
          )}

          {/* Section 3: Branch, Commit Message, Path */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-3">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Git Commit Settings</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Branch</label>
                <Input
                  value={commitBranch}
                  onChange={e => setCommitBranch(e.target.value)}
                  className="font-mono text-sm"
                  placeholder="main"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600 block mb-1">Commit Message</label>
                <Input
                  value={commitMsg}
                  onChange={e => setCommitMsg(e.target.value)}
                  className="text-sm"
                  placeholder={defaultCommitMsg}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
              <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500">Files will be committed to:</span>
              <code className="text-xs font-mono text-[#0060AF] font-semibold">{repoPath}</code>
            </div>
          </div>

          {/* Section 4: DAG Template selector */}
          <div className="rounded-lg border border-[#0060AF]/20 bg-[#0060AF]/5 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-[#0060AF]" />
              <span className="text-sm font-semibold text-slate-800">DAG Template</span>
            </div>
            <select
              value={selectedTemplateId}
              onChange={e => setTemplateOverride(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-[#0060AF]/30 focus:border-[#0060AF] outline-none font-medium"
            >
              {builtinForSource.length > 0 && (
                <optgroup label={isFlatFile ? "Flat File Templates" : "Database Templates"}>
                  {builtinForSource.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              )}
              {customForSource.length > 0 && (
                <optgroup label="Custom Templates">
                  {customForSource.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              )}
              {(builtinOther.length > 0 || customOther.length > 0) && (
                <optgroup label="Other Templates">
                  {builtinOther.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  {customOther.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (custom)</option>
                  ))}
                </optgroup>
              )}
            </select>
            {selectedTmpl && (
              <p className="text-xs text-slate-500">{selectedTmpl.description}</p>
            )}
          </div>

          {/* Section 5: Artifact previews */}
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Deployment Artifacts (auto-generated)</Label>
            <div className="space-y-2">
              <ArtifactCard
                title={`Airflow DAG (YAML) — ${selectedTmpl?.name || "Template"}`}
                filename={dagFilename}
                icon={FileCode2}
                content={airflowDagYaml}
              />
              <ArtifactCard
                title="Pipeline Spec (YAML)"
                filename={specFilename}
                icon={FileText}
                content={specContent}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Filenames auto-generated from pipeline name: <code className="font-mono text-slate-500">{nameClean}</code>
            </p>
          </div>

          {/* Section 6: Deploy result */}
          {deployResult && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-semibold text-emerald-800">
                  Committed successfully to {deployResult.provider === "gitlab" ? "GitLab" : "GitHub"}
                </p>
              </div>
              <div className="space-y-1 text-xs text-emerald-700">
                <p><span className="font-medium">Branch:</span> <code className="bg-emerald-100 px-1 rounded">{deployResult.branch}</code></p>
                <p><span className="font-medium">SHA:</span> <code className="bg-emerald-100 px-1 rounded font-mono">{(deployResult.short_sha || deployResult.sha || "").substring(0, 10)}</code></p>
                {deployResult.author && (
                  <p><span className="font-medium">Author:</span> {deployResult.author}</p>
                )}
                <p><span className="font-medium">Files:</span></p>
                <ul className="ml-4 space-y-0.5">
                  {deployResult.files?.map(f => (
                    <li key={f} className="font-mono text-emerald-600">{f}</li>
                  ))}
                </ul>
              </div>
              {deployResult.url && (
                <a
                  href={deployResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0060AF] hover:underline mt-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View commit on {deployResult.provider === "gitlab" ? "GitLab" : "GitHub"}
                </a>
              )}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-200">
                <Rocket className="w-4 h-4 text-blue-700 shrink-0" />
                <p className="text-xs text-blue-700">
                  CI/CD pipeline will auto-trigger to validate and deploy the DAG to your Airflow environment.
                </p>
              </div>
            </div>
          )}

          {deployError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Commit failed</p>
                  <p className="text-xs text-red-600 mt-0.5">{deployError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Section 7: Action buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClose(); }}
              disabled={deploying}
            >
              <X className="w-4 h-4 mr-1" /> Close
            </Button>
            {!deployResult && (
              <Button
                type="button"
                disabled={deploying || !canDeploy}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeploy(); }}
                className="gap-1.5 bg-[#0060AF] hover:bg-[#004d8c] text-white"
              >
                {deploying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Committing...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Validate & Deploy
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
