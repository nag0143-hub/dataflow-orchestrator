import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

const SCHEDULE_OPTS = [
  { value: "manual",        label: "Manual" },
  { value: "every_minutes", label: "Every N mins" },
  { value: "every_hours",   label: "Every N hours" },
  { value: "hourly",        label: "Hourly" },
  { value: "daily",         label: "Daily" },
  { value: "weekly",        label: "Weekly" },
  { value: "monthly",       label: "Monthly" },
  { value: "custom",        label: "Custom Cron" },
  { value: "event_driven",  label: "Event Driven" },
];


const EVENT_SENSOR_OPTS = [
  { value: "file_watcher",   label: "File Watcher",    desc: "Trigger when a file appears or changes in a path" },
  { value: "s3_event",       label: "S3 / ADLS Event", desc: "Trigger on object create/update in cloud storage" },
  { value: "db_sensor",      label: "DB Sensor",       desc: "Trigger when a SQL condition becomes true" },
  { value: "sftp_sensor",    label: "SFTP Sensor",     desc: "Trigger when a file arrives on an SFTP server" },
  { value: "api_webhook",    label: "API / Webhook",   desc: "Trigger via an inbound HTTP webhook call" },
  { value: "upstream_job",   label: "Upstream Job",    desc: "Trigger after another pipeline completes" },
];

export default function ScheduleSettings({ formData, setFormData }) {
  const schedType = formData.schedule_type || "manual";

  const update = (patch) => setFormData(prev => ({ ...prev, ...patch }));

  return (
    <div className="space-y-4">
      {/* Schedule */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
        <Label className="text-sm font-semibold">Run Schedule</Label>
        <p className="text-xs text-slate-500">When this pipeline should run</p>

        {/* Schedule type buttons */}
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_OPTS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                const cronMap = {
                  hourly: "0 * * * *",
                  daily: "0 6 * * *",
                  weekly: "0 6 * * 1",
                  monthly: "0 6 1 * *",
                  every_minutes: "*/15 * * * *",
                  every_hours: "0 */2 * * *",
                };
                update({ schedule_type: opt.value, cron_expression: cronMap[opt.value] || formData.cron_expression });
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                schedType === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Every N minutes */}
        {schedType === "every_minutes" && (
          <div className="space-y-2">
            <Label className="text-xs">Run every</Label>
            <div className="flex items-center gap-2">
              <Select
                value={formData.cron_expression?.match(/\*\/(\d+)/)?.[1] || "15"}
                onValueChange={v => update({ cron_expression: `*/${v} * * * *` })}
              >
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,5,10,15,20,30,45].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} minute{n > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-slate-500">minutes</span>
            </div>
            <p className="text-xs text-slate-400">Cron: <code className="font-mono">{formData.cron_expression || "*/15 * * * *"}</code></p>
          </div>
        )}

        {/* Every N hours */}
        {schedType === "every_hours" && (
          <div className="space-y-2">
            <Label className="text-xs">Run every</Label>
            <div className="flex items-center gap-2">
              <Select
                value={formData.cron_expression?.match(/\*\/(\d+)/)?.[1] || "2"}
                onValueChange={v => update({ cron_expression: `0 */${v} * * *` })}
              >
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,6,8,12].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} hour{n > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-slate-500">hours</span>
            </div>
            <p className="text-xs text-slate-400">Cron: <code className="font-mono">{formData.cron_expression || "0 */2 * * *"}</code></p>
          </div>
        )}

        {/* Hourly */}
        {schedType === "hourly" && (
          <div className="space-y-2">
            <Label className="text-xs">At minute past the hour</Label>
            <Select
              value={formData.cron_expression?.split(" ")[0] || "0"}
              onValueChange={v => update({ cron_expression: `${v} * * * *` })}
            >
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0,5,10,15,20,30,45].map(m => (
                  <SelectItem key={m} value={String(m)}>:{String(m).padStart(2,"0")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">Cron: <code className="font-mono">{formData.cron_expression || "0 * * * *"}</code></p>
          </div>
        )}

        {/* Daily */}
        {schedType === "daily" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Hour (UTC)</Label>
              <Select
                value={formData.cron_expression?.split(" ")[1] || "6"}
                onValueChange={v => {
                  const min = formData.cron_expression?.split(" ")[0] || "0";
                  update({ cron_expression: `${min} ${v} * * *` });
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
                  update({ cron_expression: `${v} ${hr} * * *` });
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

        {/* Weekly */}
        {schedType === "weekly" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Day of Week</Label>
              <Select
                value={formData.cron_expression?.split(" ")[4] || "1"}
                onValueChange={v => {
                  const parts = (formData.cron_expression || "0 6 * * 1").split(" ");
                  parts[4] = v;
                  update({ cron_expression: parts.join(" ") });
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
                  update({ cron_expression: parts.join(" ") });
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

        {/* Monthly */}
        {schedType === "monthly" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Day of Month</Label>
              <Select
                value={formData.cron_expression?.split(" ")[2] || "1"}
                onValueChange={v => {
                  const parts = (formData.cron_expression || "0 6 1 * *").split(" ");
                  parts[2] = v;
                  update({ cron_expression: parts.join(" ") });
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
                  update({ cron_expression: parts.join(" ") });
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

        {/* Custom cron */}
        {schedType === "custom" && (
          <div className="space-y-2">
            <Label className="text-xs">Cron Expression</Label>
            <Input
              value={formData.cron_expression || ""}
              onChange={e => update({ cron_expression: e.target.value })}
              placeholder="e.g. 0 6 * * 1-5"
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-400">Format: <code>minute hour day month weekday</code>. E.g. <code>0 6 * * 1-5</code> = weekdays at 06:00 UTC.</p>
          </div>
        )}

        {schedType === "manual" && (
          <p className="text-xs text-slate-400">This pipeline will only run when triggered manually.</p>
        )}

        {/* Event Driven */}
        {schedType === "event_driven" && (
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sensor / Trigger Type</Label>
            <div className="grid grid-cols-1 gap-2">
              {EVENT_SENSOR_OPTS.map(opt => {
                const isSelected = formData.event_sensor_type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ event_sensor_type: opt.value })}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "bg-purple-50 border-purple-400 text-purple-900"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-300 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 shrink-0 ${
                      isSelected ? "border-purple-500 bg-purple-500" : "border-slate-300"
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-slate-500">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {formData.event_sensor_type && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                {(formData.event_sensor_type === "file_watcher" || formData.event_sensor_type === "sftp_sensor") && (
                  <div className="space-y-1">
                    <Label className="text-xs">Watch Path / Pattern</Label>
                    <Input
                      value={formData.event_config?.watch_path || ""}
                      onChange={e => update({ event_config: { ...formData.event_config, watch_path: e.target.value } })}
                      placeholder="/data/inbound/*.csv"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-slate-400">Supports glob patterns (e.g. <code>*.csv</code>, <code>orders_*.parquet</code>)</p>
                  </div>
                )}
                {formData.event_sensor_type === "s3_event" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Bucket / Container Prefix</Label>
                    <Input
                      value={formData.event_config?.watch_path || ""}
                      onChange={e => update({ event_config: { ...formData.event_config, watch_path: e.target.value } })}
                      placeholder="s3://my-bucket/prefix/"
                      className="font-mono text-sm"
                    />
                  </div>
                )}
                {formData.event_sensor_type === "db_sensor" && (
                  <div className="space-y-1">
                    <Label className="text-xs">SQL Condition (must return true to trigger)</Label>
                    <Input
                      value={formData.event_config?.sql_condition || ""}
                      onChange={e => update({ event_config: { ...formData.event_config, sql_condition: e.target.value } })}
                      placeholder="SELECT COUNT(*) > 0 FROM control_table WHERE status='ready'"
                      className="font-mono text-sm"
                    />
                  </div>
                )}
                {formData.event_sensor_type === "api_webhook" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Webhook Endpoint (read-only)</Label>
                    <Input
                      value={`/api/webhooks/pipeline/${formData.name || "<pipeline-name>"}/trigger`}
                      readOnly
                      className="font-mono text-sm bg-slate-50 dark:bg-slate-800 text-slate-500"
                    />
                    <p className="text-xs text-slate-400">POST to this endpoint with a valid API key to trigger the pipeline.</p>
                  </div>
                )}
                {formData.event_sensor_type === "upstream_job" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Upstream Pipeline Name</Label>
                    <Input
                      value={formData.event_config?.upstream_job || ""}
                      onChange={e => update({ event_config: { ...formData.event_config, upstream_job: e.target.value } })}
                      placeholder="my-upstream-pipeline"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Polling Interval</Label>
                    <Select
                      value={formData.event_config?.poll_interval || "60"}
                      onValueChange={v => update({ event_config: { ...formData.event_config, poll_interval: v } })}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                        <SelectItem value="600">10 minutes</SelectItem>
                        <SelectItem value="1800">30 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Timeout</Label>
                    <Select
                      value={formData.event_config?.timeout_hours || "24"}
                      onValueChange={v => update({ event_config: { ...formData.event_config, timeout_hours: v } })}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="8">8 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="72">72 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {formData.schedule_type !== "manual" && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Use Custom Calendar</p>
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
                  <Label className="text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1 block">
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
                  <Label className="text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1 block">
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
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Advanced Features</p>
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