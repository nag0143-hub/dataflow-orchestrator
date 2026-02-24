import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { GitCommitHorizontal } from "lucide-react";
import JobBasicsTab from "@/components/JobFormTabs/JobBasicsTab.jsx";
import JobDataTab from "@/components/JobFormTabs/JobDataTab.jsx";
import PipelineStepIndicator from "@/components/PipelineStepIndicator";
import AdvancedTabContent from "@/components/JobFormTabs/AdvancedTabContent";
import JobSpecTabPreview from "@/components/JobSpecTabPreview";
import ScheduleSettings from "@/components/JobFormTabs/ScheduleSettings";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import GitCheckinDialog from "@/components/GitCheckinDialog";

export default function JobFormDialog({
  open,
  onOpenChange,
  editingJob,
  formData,
  setFormData,
  connections,
  onSaveSuccess,
  currentUser
}) {
  const [activeTab, setActiveTab] = useState("general");
  const [commitMessage, setCommitMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [gitCheckinData, setGitCheckinData] = useState(null);
  const [gitCheckinOpen, setGitCheckinOpen] = useState(false);

  const sourceConnections = connections.filter(c => c.connection_type === "source");
  const targetConnections = connections.filter(c => c.connection_type === "target");

  const tabOrder = ["general", "datasets", "settings"];
  const allTabs = formData.enable_advanced
    ? [...tabOrder, "advanced", "spec"]
    : [...tabOrder, "spec"];
  const currentTabIndex = allTabs.indexOf(activeTab);

  const handleNext = () => {
    setTouched(true);
    if (activeTab === "general") {
      const e = getErrors();
      if (e.name || e.source_connection_id || e.target_connection_id) return;
    }
    if (activeTab === "datasets") {
      const e = getErrors();
      if (e.datasets) { toast.error(e.datasets); return; }
    }
    if (currentTabIndex < allTabs.length - 1) {
      setActiveTab(allTabs[currentTabIndex + 1]);
    }
  };

  const getErrors = () => {
    const e = {};
    if (!formData.name?.trim()) e.name = "Pipeline name is required.";
    if (!formData.source_connection_id) e.source_connection_id = "Please select a source connection.";
    if (!formData.target_connection_id) e.target_connection_id = "Please select a target connection.";
    if (formData.source_connection_id && formData.source_connection_id === formData.target_connection_id) {
      e.source_connection_id = "Source and target must be different.";
      e.target_connection_id = "Source and target must be different.";
    }
    if (!formData.selected_datasets || formData.selected_datasets.length === 0) e.datasets = "At least one dataset must be selected.";
    if (formData.schedule_type === "custom" && !formData.cron_expression?.trim()) e.cron_expression = "Cron expression is required for custom schedule.";
    return e;
  };

  const fieldErrors = touched ? getErrors() : {};
  const isValid = Object.keys(getErrors()).length === 0;

  const validateJob = (silent = false) => {
    const errors = getErrors();
    if (Object.keys(errors).length > 0) {
      if (!silent) toast.error(Object.values(errors)[0]);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!validateJob()) return;

    setSaving(true);

    const payload = {
      ...formData,
      total_runs: editingJob?.total_runs || 0,
      successful_runs: editingJob?.successful_runs || 0,
      failed_runs: editingJob?.failed_runs || 0,
    };

    try {
      if (editingJob) {
        await base44.entities.IngestionJob.update(editingJob.id, payload);
        await base44.entities.ActivityLog.create({
          log_type: "info",
          category: "job",
          job_id: editingJob.id,
          message: `Pipeline "${formData.name}" updated`,
        });
        toast.success("Pipeline updated");
        onOpenChange(false);
        setCommitMessage("");
        onSaveSuccess?.();
        // Show git check-in dialog after update
        setGitCheckinData({ ...formData, id: editingJob.id, _isUpdate: true });
        setGitCheckinOpen(true);
        return;
      } else {
        const created = await base44.entities.IngestionJob.create(payload);
        await base44.entities.ActivityLog.create({
          log_type: "success",
          category: "job",
          job_id: created.id,
          message: `Pipeline "${formData.name}" created`,
        });
        toast.success("Pipeline created");
        onOpenChange(false);
        setCommitMessage("");
        onSaveSuccess?.();
        // Show git check-in dialog after creation
        setGitCheckinData({ ...formData, id: created.id });
        setGitCheckinOpen(true);
        return;
      }
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = [
    { key: "general", label: "Basics" },
    { key: "datasets", label: "Datasets" },
    { key: "settings", label: "Schedule" },
    ...(formData.enable_advanced ? [{ key: "advanced", label: "Advanced" }] : []),
    { key: "spec", label: "Spec" },
  ];

  const getCompletedSteps = () => {
    const completed = [];
    if (formData.name?.trim() && formData.source_connection_id && formData.target_connection_id) completed.push("general");
    if (formData.selected_datasets?.length > 0) completed.push("datasets");
    if (formData.schedule_type) completed.push("settings");
    return completed;
  };

  return (
    <div>
    <GitCheckinDialog
      open={gitCheckinOpen}
      onOpenChange={setGitCheckinOpen}
      pipelineData={gitCheckinData}
      connections={connections}
    />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingJob ? "Edit Pipeline" : "New Data Transfer Pipeline"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <PipelineStepIndicator
            steps={stepLabels}
            activeStep={activeTab}
            onStepClick={setActiveTab}
            completedSteps={getCompletedSteps()}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="max-h-[calc(92vh-320px)] overflow-y-auto">
              <TabsContent value="general" className="space-y-4 mt-0">
                <JobBasicsTab
                  formData={formData}
                  setFormData={setFormData}
                  sourceConnections={sourceConnections}
                  targetConnections={targetConnections}
                  errors={fieldErrors}
                />
              </TabsContent>

              <TabsContent value="datasets" className="space-y-4 mt-0">
                {fieldErrors.datasets && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <span className="w-3.5 h-3.5">{"⚠"}</span>{fieldErrors.datasets}
                  </div>
                )}
                <JobDataTab
                  formData={formData}
                  setFormData={setFormData}
                />
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <ScheduleSettings formData={formData} setFormData={setFormData} />
              </TabsContent>

              {formData.enable_advanced && (
                <TabsContent value="advanced" className="space-y-5 mt-4">
                  <AdvancedTabContent formData={formData} setFormData={setFormData} />
                </TabsContent>
              )}

              <TabsContent value="spec" className="mt-4">
                <JobSpecTabPreview formData={formData} connections={connections} />
              </TabsContent>
            </div>
          </Tabs>

          {activeTab === "spec" && (
            <div className="mt-6 pt-4 border-t space-y-3">
              <div>
                <Label className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                  <GitCommitHorizontal className="w-3.5 h-3.5" />
                  Commit message (optional)
                </Label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Describe what changed..."
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !isValid}>
                  {saving ? "Saving..." : editingJob ? "Update Pipeline" : "Create Pipeline"}
                </Button>
              </div>
            </div>
          )}

          {activeTab !== "spec" && (
            <div className="mt-6 pt-4 border-t flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleNext}>
                Next
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}