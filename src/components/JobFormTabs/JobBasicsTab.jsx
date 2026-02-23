import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { platformConfig } from "@/components/PlatformIcon";

export default function JobBasicsTab({ formData, setFormData, sourceConnections, targetConnections }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Job Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Daily Sales Sync"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Source Connection *</Label>
          <Select
            value={formData.source_connection_id}
            onValueChange={(v) => setFormData({ ...formData, source_connection_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {sourceConnections.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <span>{platformConfig[c.platform]?.label}</span>
                    <span className="text-slate-400">-</span>
                    <span>{c.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Target Connection *</Label>
          <Select
            value={formData.target_connection_id}
            onValueChange={(v) => setFormData({ ...formData, target_connection_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select target" />
            </SelectTrigger>
            <SelectContent>
              {targetConnections.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <span>{platformConfig[c.platform]?.label}</span>
                    <span className="text-slate-400">-</span>
                    <span>{c.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What does this job do?"
          rows={2}
        />
      </div>

      <details className="border border-slate-200 rounded-lg p-3">
        <summary className="cursor-pointer font-medium text-sm text-slate-700 hover:text-slate-900">Organization & Notifications</summary>
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200">
          <div>
            <Label className="text-xs">Assignment Group</Label>
            <Input
              value={formData.assignment_group}
              onChange={(e) => setFormData({ ...formData, assignment_group: e.target.value })}
              placeholder="Data Engineering"
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Cost Center</Label>
            <Input
              value={formData.cost_center}
              onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
              placeholder="CC-12345"
              className="text-sm"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Notification Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="alerts@company.com"
              className="text-sm"
            />
          </div>
        </div>
      </details>
    </div>
  );
}