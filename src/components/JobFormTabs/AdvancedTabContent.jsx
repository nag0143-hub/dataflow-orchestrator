import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Zap, Lock, FileText, Shield, ChevronDown, ChevronRight } from "lucide-react";
import ColumnMapper from "@/components/ColumnMapper";
import DataQualityRules from "@/components/DataQualityRules";
import DataCleansing from "@/components/DataCleansing";
import DataMaskingConfig from "@/components/DataMaskingConfig";
import SLAConfig from "@/components/SLAConfig";

export default function AdvancedTabContent({ formData, setFormData }) {
  const [showSecurity, setShowSecurity] = useState(false);
  const [showSLA, setShowSLA] = useState(false);
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
                <Card className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm space-y-2">
                    <div><span className="font-medium">Schema:</span> {ds.schema}</div>
                    <div><span className="font-medium">Table:</span> {ds.table}</div>
                  </div>
                </Card>

                {/* ── Core tabs: Cleansing → Quality → Column Mapping ── */}
                <Tabs defaultValue="cleansing" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="cleansing" className="text-xs">Cleansing</TabsTrigger>
                    <TabsTrigger value="quality" className="text-xs">Quality</TabsTrigger>
                    <TabsTrigger value="column_mapping" className="text-xs">Column Mapping</TabsTrigger>
                  </TabsList>

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

                  {/* Data Quality */}
                  <TabsContent value="quality" className="space-y-3">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-semibold text-sm">Data Quality Rules</h4>
                      </div>
                      <DataQualityRules
                        selectedObjects={[ds]}
                        rules={formData.dq_rules}
                        onChange={(rules) => setFormData(prev => ({ ...prev, dq_rules: rules }))}
                      />
                    </Card>
                  </TabsContent>

                  {/* Column Mapping */}
                  <TabsContent value="column_mapping" className="space-y-3">
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
                </Tabs>

                {/* ── Optional: Security ── */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowSecurity(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-600" />
                      Security (optional)
                    </div>
                    {showSecurity ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>
                  {showSecurity && (
                    <div className="p-4 space-y-3">
                      <Card className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-4 h-4 text-purple-600" />
                          <h4 className="font-semibold text-sm">Encryption & Data Masking</h4>
                        </div>
                        <DataMaskingConfig
                          value={formData.data_masking_rules || []}
                          onChange={(rules) => setFormData({ ...formData, data_masking_rules: rules })}
                        />
                      </Card>
                      <Card className="p-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-blue-600" />
                          <h4 className="font-semibold text-sm">Classification & Access</h4>
                        </div>
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
                          <p className="text-xs text-slate-400 mt-1">Leave empty to inherit pipeline-level entitlements</p>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>

                {/* ── Optional: SLA ── */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowSLA(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      SLA (optional)
                    </div>
                    {showSLA ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>
                  {showSLA && (
                    <div className="p-4">
                      <SLAConfig
                        value={ds.sla_config || {}}
                        onChange={(sla) => updateDataset({ sla_config: sla })}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}


    </div>
  );
}