import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import JobBasicsTab from "@/components/JobFormTabs/JobBasicsTab.jsx";
import JobDataTab from "@/components/JobFormTabs/JobDataTab.jsx";
import PipelineStepIndicator from "@/components/PipelineStepIndicator";
import AdvancedTabContent from "@/components/JobFormTabs/AdvancedTabContent";
import JobSpecTabPreview from "@/components/JobSpecTabPreview";
import ScheduleSettings from "@/components/JobFormTabs/ScheduleSettings";
import GitCheckinDialog from "@/components/GitCheckinDialog";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Maximize2 } from "lucide-react";

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

  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [specGenerated, setSpecGenerated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);


  const sourceConnections = connections.filter(c => c.connection_type === "source");
  const targetConnections = connections.filter(c => c.connection_type === "target");

  const tabOrder = ["general", "datasets", "settings"];
  const allTabs = formData.enable_advanced
    ? [...tabOrder, "advanced", "spec"]
    : [...tabOrder, "spec"];
  
  // Only add checkin tab if spec has been validated
  if (specGenerated) {
    allTabs.push("checkin");
  }
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

  const handleSaveDraft = async () => {
    setSaving(true);
    const payload = {
      ...formData,
      _isDraft: true,
      total_runs: editingJob?.total_runs || 0,
      successful_runs: editingJob?.successful_runs || 0,
      failed_runs: editingJob?.failed_runs || 0,
    };

    try {
      if (editingJob) {
        await base44.entities.IngestionJob.update(editingJob.id, payload);
        toast.success("Pipeline draft saved");
        onSaveSuccess?.();
      } else {
        const created = await base44.entities.IngestionJob.create(payload);
        toast.success("Pipeline draft saved");
        onSaveSuccess?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!validateJob()) return;

    setSaving(true);

    const payload = {
      ...formData,
      _isDraft: false,
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
          message: `Pipeline "${formData.name}" updated and committed`,
        });
        toast.success("Pipeline updated and ready to commit to git");
        onOpenChange(false);
        onSaveSuccess?.();
        return;
      } else {
        const created = await base44.entities.IngestionJob.create(payload);
        await base44.entities.ActivityLog.create({
          log_type: "success",
          category: "job",
          job_id: created.id,
          message: `Pipeline "${formData.name}" created and committed`,
        });
        toast.success("Pipeline created and ready to commit to git");
        onOpenChange(false);
        onSaveSuccess?.();
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
    ...(specGenerated ? [{ key: "checkin", label: "Git Check-in" }] : []),
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`overflow-y-auto transition-all duration-300 ${isExpanded ? 'max-w-6xl max-h-[96vh] w-[95vw] h-[95vh]' : 'max-w-2xl max-h-[92vh] w-auto h-auto'}`}>
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>
            {editingJob ? "Edit Pipeline" : "Create Pipeline"}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <PipelineStepIndicator
            steps={stepLabels}
            activeStep={activeTab}
            onStepClick={setActiveTab}
            completedSteps={getCompletedSteps()}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className={`overflow-y-auto ${isExpanded ? 'max-h-[calc(95vh-300px)]' : 'max-h-[calc(92vh-320px)]'}`}>
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

              {specGenerated && (
                <TabsContent value="checkin" className="mt-4">
                  <div className="space-y-4">
                    <GitCheckinDialog 
                      open={true}
                      onOpenChange={() => {}}
                      pipelineData={formData}
                      connections={connections}
                    />
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>

          {activeTab === "spec" && (
            <div className="mt-6 pt-4 border-t flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleSaveDraft}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save as Draft"}
              </Button>
              <Button 
                onClick={() => {
                  if (isValid) {
                    setSpecGenerated(true);
                    handleNext();
                  } else {
                    toast.error("Please validate all required fields before proceeding");
                  }
                }}
                disabled={!isValid}
              >
                Validate & Proceed to Git Check-in
              </Button>
            </div>
          )}

          {activeTab === "checkin" && (
            <div className="mt-6 pt-4 border-t flex justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => setActiveTab("spec")}>
                Back
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleSaveDraft}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save as Draft"}
                </Button>
                <Button type="submit" disabled={saving || !isValid}>
                  {saving ? "Committing..." : editingJob ? "Update & Commit" : "Create & Commit"}
                </Button>
              </div>
            </div>
          )}

          {activeTab !== "spec" && (
            <div className="mt-6 pt-4 border-t flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleSaveDraft}
                disabled={saving}
                className="mr-2"
              >
                {saving ? "Saving..." : "Save as Draft"}
              </Button>
              <Button onClick={handleNext}>
                Next
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
    </div>
  );
}