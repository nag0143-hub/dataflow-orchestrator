import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Zap, Lock, FileText, Shield } from "lucide-react";
import ColumnMapper from "@/components/ColumnMapper";
import DataQualityRules from "@/components/DataQualityRules";
import DataCleansing from "@/components/DataCleansing";
import DataMaskingConfig from "@/components/DataMaskingConfig";
import SLAConfig from "@/components/SLAConfig";

export default function AdvancedTabContent({ formData, setFormData }) {
  const [activeDataset, setActiveDataset] = useState(
    formData.selected_datasets?.[0] ? `${formData.selected_datasets[0].schema}.${formData.selected_datasets[0].table}` : ""
  );

  const currentDataset = formData.selected_datasets?.find(
    d => `${d.schema}.${d.table}` === activeDataset
  );

  const getDatasetIndex = () => 
    formData.selected_datasets?.findIndex(d => `${d.schema}.${d.table}` === activeDataset) || 0;

  const updateDataset = (updates) => {
    const idx = getDatasetIndex();
    if (idx >= 0) {
      const updated = [...formData.selected_datasets];
      updated[idx] = { ...updated[idx], ...updates };
      setFormData({ ...formData, selected_datasets: updated });
    }
  };

  return (
    <div className="space-y-4">
      {/* No datasets selected state */}
      {!formData.selected_datasets?.length && (
        <Card className="p-6 border-dashed border-2 text-center">
          <p className="text-slate-500 text-sm">Select datasets in the Data tab to configure rules</p>
        </Card>
      )}

      {/* Dataset Tabs */}
      {formData.selected_datasets?.length > 0 && (
        <Tabs value={activeDataset} onValueChange={setActiveDataset} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(formData.selected_datasets.length, 4)}, 1fr)` }}>
            {formData.selected_datasets.map((ds) => (
              <TabsTrigger key={`${ds.schema}.${ds.table}`} value={`${ds.schema}.${ds.table}`} className="text-xs">
                {ds.table}
              </TabsTrigger>
            ))}
          </TabsList>

          {formData.selected_datasets.map((ds) => {
            const dsKey = `${ds.schema}.${ds.table}`;
            return (
              <TabsContent key={dsKey} value={dsKey} className="space-y-4 mt-4">
                
                {/* Dataset Info */}
                <Card className="p-4 bg-slate-50 border border-slate-200">
                  <div className="text-sm space-y-2">
                    <div><span className="font-medium">Schema:</span> {ds.schema}</div>
                    <div><span className="font-medium">Table:</span> {ds.table}</div>
                  </div>
                </Card>

                {/* Rules Tabs */}
                <Tabs defaultValue="mapping" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="mapping" className="text-xs">Mapping</TabsTrigger>
                    <TabsTrigger value="quality" className="text-xs">Quality</TabsTrigger>
                    <TabsTrigger value="cleansing" className="text-xs">Cleansing</TabsTrigger>
                    <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
                  </TabsList>

                  {/* Column Mapping */}
                  <TabsContent value="mapping" className="space-y-3">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-violet-600" />
                        <h4 className="font-semibold text-sm">Column Mapping & Transformations</h4>
                      </div>
                      <ColumnMapper
                        selectedObjects={[ds]}
                        mappings={formData.column_mappings}
                        onChange={(mappingsOrUpdater) => {
                          setFormData(prev => ({
                            ...prev,
                            column_mappings: typeof mappingsOrUpdater === "function"
                              ? mappingsOrUpdater(prev.column_mappings)
                              : mappingsOrUpdater
                          }));
                        }}
                      />
                    </Card>
                  </TabsContent>

                  {/* Data Quality */}
                  <TabsContent value="quality" className="space-y-3">
                    <Card className="p-4 space-y-4">
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4 text-emerald-600" />
                            <h4 className="font-semibold text-sm">Data Quality Rules</h4>
                          </div>
                          <DataQualityRules
                            selectedObjects={[ds]}
                            rules={formData.dq_rules}
                            onChange={(rules) => setFormData(prev => ({ ...prev, dq_rules: rules }))}
                          />
                        </div>
                      </div>
                    </Card>
                  </TabsContent>

                  {/* Data Cleansing */}
                  <TabsContent value="cleansing" className="space-y-3">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-amber-600" />
                        <h4 className="font-semibold text-sm">Data Cleansing</h4>
                      </div>
                      <DataCleansing
                        selectedObjects={[ds]}
                        cleansing={formData.data_cleansing}
                        onChange={(cleansing) => setFormData(prev => ({ ...prev, data_cleansing: cleansing }))}
                      />
                    </Card>
                  </TabsContent>

                  {/* Security */}
                  <TabsContent value="security" className="space-y-3">
                    <Card className="p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-600" />
                        <h4 className="font-semibold text-sm">Security & Classification</h4>
                      </div>

                      {/* Data Classification */}
                      <div>
                        <Label className="text-xs text-slate-600">Data Classification</Label>
                        <Select
                          value={ds.data_classification || ""}
                          onValueChange={(v) => updateDataset({ data_classification: v })}
                        >
                          <SelectTrigger className="h-8 text-xs mt-1">
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

                      {/* Dataset Access Entitlements */}
                      <div>
                        <Label className="text-xs text-slate-600">Dataset Access Entitlements</Label>
                        <Input
                          value={ds.access_entitlements?.join(", ") || ""}
                          onChange={(e) => updateDataset({
                            access_entitlements: e.target.value.split(",").map(s => s.trim()).filter(s => s)
                          })}
                          placeholder="e.g. data_analyst, finance_user"
                          className="text-xs mt-1"
                        />
                        <p className="text-xs text-slate-400 mt-1">Leave empty to inherit job-level entitlements</p>
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* Global Settings - SLA & Masking */}
      <div className="border-t pt-6 mt-6 space-y-4">
        <h3 className="font-semibold text-sm text-slate-700">Global Settings</h3>
        
        <DataMaskingConfig
          value={formData.data_masking_rules}
          onChange={(rules) => setFormData({ ...formData, data_masking_rules: rules })}
        />

        <SLAConfig
          value={formData.sla_config}
          onChange={(sla) => setFormData({ ...formData, sla_config: sla })}
        />
      </div>
    </div>
  );
}