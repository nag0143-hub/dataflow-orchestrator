import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "lucide-react";

export default function ScheduleSettings({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      {/* Load Method */}
      <div className="border border-slate-200 rounded-lg p-4 space-y-3">
        <Label className="text-sm font-semibold">Load Method *</Label>
        <p className="text-xs text-slate-500">How to handle existing data in the target</p>
        <Select
          value={formData.load_method || "append"}
          onValueChange={(v) => setFormData({ ...formData, load_method: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="append">Append - Add new rows</SelectItem>
            <SelectItem value="replace">Replace - Clear and reload</SelectItem>
            <SelectItem value="upsert">Upsert - Insert or update</SelectItem>
            <SelectItem value="merge">Merge - Advanced strategy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Schedule */}
      <div className="border border-slate-200 rounded-lg p-4 space-y-3">
        <Label className="text-sm font-semibold">Run Schedule</Label>
        <p className="text-xs text-slate-500">When this job should run</p>
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h4 className="font-semibold text-slate-900 text-sm">Schedule</h4>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { value: "manual", label: "Manual" },
            { value: "hourly", label: "Hourly" },
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                const cronMap = { hourly: "0 * * * *", daily: "0 6 * * *", weekly: "0 6 * * 1", monthly: "0 6 1 * *" };
                setFormData(prev => ({
                  ...prev,
                  schedule_type: opt.value,
                  cron_expression: cronMap[opt.value] || prev.cron_expression
                }));
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                formData.schedule_type === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {formData.schedule_type === "hourly" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">At minute</Label>
              <Select
                value={formData.cron_expression?.split(" ")[0] || "0"}
                onValueChange={v => setFormData(prev => ({ ...prev, cron_expression: `${v} * * * *` }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0,5,10,15,20,30,45].map(m => (
                    <SelectItem key={m} value={String(m)}>:{String(m).padStart(2,"0")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-1">Runs at HH:{(formData.cron_expression?.split(" ")[0] || "0").padStart(2,"0")} every hour</p>
            </div>
          </div>
        )}

        {formData.schedule_type === "daily" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Hour (UTC)</Label>
              <Select
                value={formData.cron_expression?.split(" ")[1] || "6"}
                onValueChange={v => {
                  const min = formData.cron_expression?.split(" ")[0] || "0";
                  setFormData(prev => ({ ...prev, cron_expression: `${min} ${v} * * *` }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({length:24},(_,i)=>i).map(h => (
                    <SelectItem key={h} value={String(h)}>{String(h).padStart(2,"0")}:00 UTC</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Minute</Label>
              <Select
                value={formData.cron_expression?.split(" ")[0] || "0"}
                onValueChange={v => {
                  const hr = formData.cron_expression?.split(" ")[1] || "6";
                  setFormData(prev => ({ ...prev, cron_expression: `${v} ${hr} * * *` }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0,5,10,15,20,30,45].map(m => (
                    <SelectItem key={m} value={String(m)}>:{String(m).padStart(2,"0")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 text-xs text-slate-400">
              Cron: <code className="font-mono">{formData.cron_expression || "0 6 * * *"}</code>
            </div>
          </div>
        )}

        {formData.schedule_type === "weekly" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Day of Week</Label>
              <Select
                value={formData.cron_expression?.split(" ")[4] || "1"}
                onValueChange={v => {
                  const parts = (formData.cron_expression || "0 6 * * 1").split(" ");
                  parts[4] = v;
                  setFormData(prev => ({ ...prev, cron_expression: parts.join(" ") }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d,i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Hour (UTC)</Label>
              <Select
                value={formData.cron_expression?.split(" ")[1] || "6"}
                onValueChange={v => {
                  const parts = (formData.cron_expression || "0 6 * * 1").split(" ");
                  parts[1] = v;
                  setFormData(prev => ({ ...prev, cron_expression: parts.join(" ") }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({length:24},(_,i)=>i).map(h => (
                    <SelectItem key={h} value={String(h)}>{String(h).padStart(2,"0")}:00 UTC</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 text-xs text-slate-400">
              Cron: <code className="font-mono">{formData.cron_expression || "0 6 * * 1"}</code>
            </div>
          </div>
        )}

        {formData.schedule_type === "monthly" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Day of Month</Label>
              <Select
                value={formData.cron_expression?.split(" ")[2] || "1"}
                onValueChange={v => {
                  const parts = (formData.cron_expression || "0 6 1 * *").split(" ");
                  parts[2] = v;
                  setFormData(prev => ({ ...prev, cron_expression: parts.join(" ") }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({length:28},(_,i)=>i+1).map(d => (
                    <SelectItem key={d} value={String(d)}>{d === 1 ? "1st" : d === 2 ? "2nd" : d === 3 ? "3rd" : `${d}th`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Hour (UTC)</Label>
              <Select
                value={formData.cron_expression?.split(" ")[1] || "6"}
                onValueChange={v => {
                  const parts = (formData.cron_expression || "0 6 1 * *").split(" ");
                  parts[1] = v;
                  setFormData(prev => ({ ...prev, cron_expression: parts.join(" ") }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({length:24},(_,i)=>i).map(h => (
                    <SelectItem key={h} value={String(h)}>{String(h).padStart(2,"0")}:00 UTC</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 text-xs text-slate-400">
              Cron: <code className="font-mono">{formData.cron_expression || "0 6 1 * *"}</code>
            </div>
          </div>
        )}

        {formData.schedule_type === "manual" && (
          <p className="text-xs text-slate-400">This job will only run when triggered manually.</p>
        )}

        {formData.schedule_type !== "manual" && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Use Custom Calendar</p>
                <p className="text-xs text-slate-400">Apply include/exclude date rules (e.g. bank holidays)</p>
              </div>
              <Switch
                checked={!!formData.use_custom_calendar}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, use_custom_calendar: checked }))}
              />
            </div>

            {formData.use_custom_calendar && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-700 font-semibold mb-1 block">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1" />
                    Include Calendar
                  </Label>
                  <p className="text-xs text-slate-400 mb-2">Run ONLY on these dates (e.g. bank holidays to include)</p>
                  <Select
                    value={formData.include_calendar_id || ""}
                    onValueChange={v => setFormData(prev => ({ ...prev, include_calendar_id: v || null }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select calendar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem>
                      <SelectItem value="__coming_soon__" disabled>— No calendars configured yet —</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-700 font-semibold mb-1 block">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block mr-1" />
                    Exclude Calendar
                  </Label>
                  <p className="text-xs text-slate-400 mb-2">SKIP runs on these dates (e.g. bank holidays to exclude)</p>
                  <Select
                    value={formData.exclude_calendar_id || ""}
                    onValueChange={v => setFormData(prev => ({ ...prev, exclude_calendar_id: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select calendar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem>
                      <SelectItem value="__coming_soon__" disabled>— No calendars configured yet —</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Advanced Features Toggle */}
        <div className="border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Advanced Features</p>
              <p className="text-xs text-slate-400">Enable advanced options for data quality, column mapping, and cleansing</p>
            </div>
            <Switch
              checked={formData.enable_advanced}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enable_advanced: checked }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}