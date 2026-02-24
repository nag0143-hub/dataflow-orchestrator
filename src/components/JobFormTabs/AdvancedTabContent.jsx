import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Wand2, ArrowLeftRight } from "lucide-react";
import ColumnMapper from "@/components/ColumnMapper";
import DataQualityRules from "@/components/DataQualityRules";
import DataCleansing from "@/components/DataCleansing";
import DataMaskingConfig from "@/components/DataMaskingConfig";
import SLAConfig from "@/components/SLAConfig";

export default function AdvancedTabContent({ formData, setFormData }) {
  const [selectedDataset, setSelectedDataset] = useState(
    formData.selected_datasets?.[0] ? `${formData.selected_datasets[0].schema}.${formData.selected_datasets[0].table}` : ""
  );

  const handleMappingsChange = (mappingsOrUpdater) => {
    setFormData(prev => ({
      ...prev,
      column_mappings: typeof mappingsOrUpdater === "function"
        ? mappingsOrUpdater(prev.column_mappings)
        : mappingsOrUpdater
    }));
  };

  const handleRulesChange = (rules) => {
    setFormData(prev => ({ ...prev, dq_rules: rules }));
  };

  const handleCleansingChange = (cleansing) => {
    setFormData(prev => ({ ...prev, data_cleansing: cleansing }));
  };

  return (
    <div className="space-y-4">
      {/* Dataset Selector */}
      {formData.selected_datasets?.length > 0 && (
        <div className="border border-slate-200 rounded-xl p-4 bg-blue-50">
          <Label className="text-sm font-semibold text-slate-700 block mb-2">Select Dataset for Rules Configuration</Label>
          <Select value={selectedDataset} onValueChange={setSelectedDataset}>
            <SelectTrigger>
              <SelectValue placeholder="Select a dataset" />
            </SelectTrigger>
            <SelectContent>
              {formData.selected_datasets.map((ds, idx) => (
                <SelectItem key={idx} value={`${ds.schema}.${ds.table}`}>
                  {ds.schema}.{ds.table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-2">All rules below will apply to this dataset only</p>
        </div>
      )}

      {/* Security Section */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <h4 className="font-semibold text-slate-900 text-sm">Security & Access Control</h4>
        </div>
        <div>
          <Label>Job-Level Access Entitlements</Label>
          <p className="text-xs text-slate-500 mb-2">Roles/entitlements that can access this job. Datasets inherit these unless overridden.</p>
          <Input
            value={formData.access_entitlements?.join(", ") || ""}
            onChange={(e) => setFormData({
              ...formData,
              access_entitlements: e.target.value.split(",").map(s => s.trim()).filter(s => s)
            })}
            placeholder="e.g. data_analyst, data_engineer, admin"
          />
        </div>

        {formData.selected_datasets?.length > 0 && (
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div>
              <Label className="text-sm">Dataset-Level Access Entitlements</Label>
              <p className="text-xs text-slate-500 mb-2">
                Configure access for individual datasets. Leave empty to inherit job-level entitlements: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{formData.access_entitlements?.length > 0 ? formData.access_entitlements.join(", ") : "(none set)"}</code>
              </p>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {formData.selected_datasets.map((obj, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                  <div className="font-medium text-sm text-slate-900">
                    {obj.schema}.{obj.table}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Data Classification</Label>
                    <Select
                      value={obj.data_classification || ""}
                      onValueChange={(v) => {
                        const updated = [...formData.selected_datasets];
                        updated[idx].data_classification = v;
                        setFormData({ ...formData, selected_datasets: updated });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select classification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="confidential">Confidential</SelectItem>
                        <SelectItem value="personal_class_1">Personal Class 1</SelectItem>
                        <SelectItem value="personal_class_1_pci">Personal Class 1 - PCI</SelectItem>
                        <SelectItem value="personal_class_2">Personal Class 2</SelectItem>
                        <SelectItem value="personal_class_3">Personal Class 3</SelectItem>
                        <SelectItem value="personal_class_4">Personal Class 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    value={obj.access_entitlements?.join(", ") || ""}
                    onChange={(e) => {
                      const updated = [...formData.selected_datasets];
                      updated[idx].access_entitlements = e.target.value.split(",").map(s => s.trim()).filter(s => s);
                      setFormData({ ...formData, selected_datasets: updated });
                    }}
                    placeholder="e.g. data_analyst, finance_user (empty = inherit job-level)"
                    className="text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Spark Properties Section */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-orange-600" />
          <h4 className="font-semibold text-slate-900 text-sm">Spark Properties Overrides</h4>
        </div>
        {formData.selected_datasets?.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {formData.selected_datasets.map((obj, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                <div className="font-medium text-sm text-slate-900 mb-2">
                  {obj.schema}.{obj.table}
                </div>
                <Textarea
                  value={
                    obj.spark_properties
                      ? Object.entries(obj.spark_properties)
                          .map(([k, v]) => `${k}=${v}`)
                          .join("\n")
                      : ""
                  }
                  onChange={(e) => {
                    const updated = [...formData.selected_datasets];
                    const props = {};
                    e.target.value.split("\n").forEach(line => {
                      const [k, v] = line.split("=");
                      if (k && v) props[k.trim()] = v.trim();
                    });
                    updated[idx].spark_properties = Object.keys(props).length > 0 ? props : undefined;
                    setFormData({ ...formData, selected_datasets: updated });
                  }}
                  placeholder="e.g. spark.sql.shuffle.partitions=200&#10;spark.executor.memory=4g"
                  className="text-xs font-mono"
                  rows={3}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Select datasets to configure Spark properties</p>
        )}
      </div>

      {/* Data Cleansing */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-indigo-600" />
          <h4 className="font-semibold text-slate-900 text-sm">Data Cleansing</h4>
        </div>
        <p className="text-xs text-slate-500">Remove unprintable characters, control characters, and whitespace anomalies.</p>
        <DataCleansing
          selectedObjects={formData.selected_datasets}
          cleansing={formData.data_cleansing}
          onChange={handleCleansingChange}
        />
      </div>

      {/* Column Mapping */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-violet-600" />
          <h4 className="font-semibold text-slate-900 text-sm">Column Mapping & Transformations</h4>
        </div>
        <p className="text-xs text-slate-500">Map source columns to target columns and apply transformations.</p>
        <ColumnMapper
          selectedObjects={formData.selected_datasets}
          mappings={formData.column_mappings}
          onChange={handleMappingsChange}
        />
      </div>

      {/* Data Masking */}
      <DataMaskingConfig
        value={formData.data_masking_rules}
        onChange={(rules) => setFormData({ ...formData, data_masking_rules: rules })}
      />

      {/* SLA Management */}
      <SLAConfig
        value={formData.sla_config}
        onChange={(sla) => setFormData({ ...formData, sla_config: sla })}
      />
    </div>
  );
}