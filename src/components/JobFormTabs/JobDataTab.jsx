import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import HelpTooltip from "@/components/HelpTooltip";
import ObjectSelector from "@/components/ObjectSelector";

export default function JobDataTab({ formData, setFormData, showDatasetLoadMethods, setShowDatasetLoadMethods }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Label className="block">Select Tables/Datasets to Transfer</Label>
          <HelpTooltip text="Choose which tables or datasets from the source system to include in this job. You can override load methods per dataset." />
        </div>
        <ObjectSelector
          selectedObjects={formData.selected_datasets}
          onChange={(objects) => setFormData({ ...formData, selected_datasets: objects })}
        />
      </div>

      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <div>
          <Label className="text-sm font-semibold">Job-Level Load Method</Label>
          <p className="text-xs text-slate-500 mb-3">Default method for all datasets. Can be overridden per dataset.</p>
          <Select
            value={formData.load_method || "append"}
            onValueChange={(v) => setFormData({ ...formData, load_method: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="append">Append - Add rows to existing data</SelectItem>
              <SelectItem value="replace">Replace - Clear and reload all data</SelectItem>
              <SelectItem value="upsert">Upsert - Insert or update based on key</SelectItem>
              <SelectItem value="merge">Merge - Advanced merge strategy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.selected_datasets?.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Dataset-Level Load Methods</p>
            <p className="text-xs text-slate-400">Override the job-level load method for specific datasets</p>
          </div>
          <Switch checked={showDatasetLoadMethods} onCheckedChange={setShowDatasetLoadMethods} />
        </div>
      )}

      {formData.selected_datasets?.length > 0 && showDatasetLoadMethods && (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {formData.selected_datasets.map((obj, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                <div className="font-medium text-sm text-slate-900">
                  {obj.schema}.{obj.table}
                </div>
                <Select
                  value={obj.load_method || "append"}
                  onValueChange={(v) => {
                    const updated = [...formData.selected_datasets];
                    updated[idx].load_method = v;
                    setFormData({ ...formData, selected_datasets: updated });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="append">Append</SelectItem>
                    <SelectItem value="replace">Replace</SelectItem>
                    <SelectItem value="upsert">Upsert</SelectItem>
                    <SelectItem value="merge">Merge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}