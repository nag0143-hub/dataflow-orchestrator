import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, GripVertical } from "lucide-react";
import { TRANSFORMATIONS } from "./constants";
import { cn } from "@/lib/utils";

export default function ColumnMapperRow({
  mapping,
  sourceCol,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
  isCondensed,
  isDragging,
  dragProps,
  dragHandleProps,
  isAudit,
}) {
  if (isCondensed) {
    return (
      <tr className={cn("border-b border-slate-100 transition-colors", isDragging ? "bg-slate-100 shadow-md" : "hover:bg-blue-50")}>
        <td className="px-3 py-2" {...dragHandleProps}>
          <GripVertical className="w-3 h-3 text-slate-300 cursor-move" />
        </td>
        <td className="px-3 py-2 w-6">
          <Checkbox checked={isSelected} onCheckedChange={onSelect} disabled={isAudit} />
        </td>
        <td className="px-3 py-2 text-xs">
          <span className="font-mono text-slate-900">{mapping.source}</span>
        </td>
        <td className="px-3 py-2 text-xs">
          <span className="font-mono text-slate-600">{mapping.target}</span>
        </td>
        <td className="px-3 py-2">
          <Select value={mapping.transformation || "direct"} onValueChange={(v) => onUpdate("transformation", v)}>
            <SelectTrigger className="h-6 text-xs border-slate-200 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSFORMATIONS.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-3 py-2">
          <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-500">
            <X className="w-3 h-3" />
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className={cn("border-b border-slate-100 transition-colors", isDragging ? "bg-slate-100 shadow-md" : "hover:bg-blue-50")}>
      <td className="px-3 py-2" {...dragHandleProps}>
        <GripVertical className="w-3 h-3 text-slate-300 cursor-move" />
      </td>
      <td className="px-3 py-2 w-6">
        <Checkbox checked={isSelected} onCheckedChange={onSelect} disabled={isAudit} />
      </td>
      
      {/* Source Section */}
      <td colSpan="4" className="px-3 py-2">
        <div className="space-y-2">
          <div className="text-xs text-slate-500 font-medium">Source</div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <span className="text-xs text-slate-400 block mb-1">Name</span>
              <span className="font-mono text-xs text-slate-900 block">{mapping.source}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Type</span>
              <span className="font-mono text-xs text-slate-600">{mapping.sourceDataType || "-"}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Length</span>
              <span className="font-mono text-xs text-slate-600">{mapping.sourceLength || "-"}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Order</span>
              <span className="font-mono text-xs text-slate-600">{sourceCol?.order || "-"}</span>
            </div>
          </div>
        </div>
      </td>

      {/* Target Section */}
      <td colSpan="4" className="px-3 py-2">
        <div className="space-y-2">
          <div className="text-xs text-slate-500 font-medium">Target</div>
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={mapping.target}
              onChange={(e) => onUpdate("target", e.target.value)}
              placeholder="Target"
              className="h-6 text-xs px-2 border-slate-200"
            />
            <Input
              value={mapping.targetDataType || ""}
              onChange={(e) => onUpdate("targetDataType", e.target.value)}
              placeholder="varchar"
              className="h-6 text-xs px-2 border-slate-200 font-mono"
            />
            <Input
              value={mapping.targetLength || ""}
              onChange={(e) => onUpdate("targetLength", e.target.value)}
              placeholder="255"
              className="h-6 text-xs px-2 border-slate-200 font-mono"
            />
          </div>
        </div>
      </td>

      {/* Transformation */}
      <td className="px-3 py-2 min-w-40">
        <Select value={mapping.transformation || "direct"} onValueChange={(v) => onUpdate("transformation", v)}>
          <SelectTrigger className="h-6 text-xs border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSFORMATIONS.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-xs">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      <td className="px-3 py-2">
        <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-500">
          <X className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
}