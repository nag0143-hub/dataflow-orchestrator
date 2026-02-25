import { forwardRef } from "react";
import { X, GripVertical, Lock } from "lucide-react";
import { TRANSFORMATIONS } from "./constants";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

// Excel-like editable cell
function EditableCell({ value, onChange, placeholder = "", className = "", mono = false, disabled = false }) {
  return (
    <input
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-full h-7 px-2 text-xs border-0 bg-transparent focus:bg-white focus:border focus:border-blue-400 focus:outline-none rounded focus:shadow-sm transition-all",
        mono && "font-mono",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    />
  );
}

function SelectCell({ value, onChange, options, disabled = false }) {
  return (
    <select
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "w-full h-7 px-1 text-xs border-0 bg-transparent focus:bg-white focus:border focus:border-blue-400 focus:outline-none rounded transition-all appearance-none cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

const ColumnMapperRow = forwardRef(function ColumnMapperRow({
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
}, ref) {
  const isLocked = mapping.is_audit;

  if (isCondensed) {
    return (
      <tr
        ref={ref}
        className={cn(
          "border-b border-slate-100 transition-colors group",
          isDragging ? "bg-blue-50 shadow-lg" : isAudit ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-blue-50/50"
        )}
        {...dragProps}
      >
        <td className="pl-2 py-1 w-6" {...dragHandleProps}>
          <GripVertical className="w-3 h-3 text-slate-300 cursor-move group-hover:text-slate-500" />
        </td>
        <td className="py-1 w-6">
          <Checkbox checked={isSelected} onCheckedChange={onSelect} disabled={isAudit} className="h-3 w-3" />
        </td>
        {isAudit && <td className="py-1 w-5"><Lock className="w-3 h-3 text-amber-500" /></td>}
        <td className="py-1 text-xs font-mono text-slate-700 pl-2">{mapping.source || <span className="text-slate-400 italic">computed</span>}</td>
        <td className="py-1"><EditableCell value={mapping.target} onChange={v => onUpdate("target", v)} mono /></td>
        <td className="py-1 min-w-[140px]">
          <SelectCell value={mapping.transformation || "direct"} onChange={v => onUpdate("transformation", v)} options={TRANSFORMATIONS} />
        </td>
        <td className="py-1 pr-2 w-6">
          <button type="button" onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all">
            <X className="w-3 h-3" />
          </button>
        </td>
      </tr>
    );
  }

  // Full Excel-style row
  return (
    <tr
      className={cn(
        "border-b border-slate-100 transition-colors group",
        isDragging ? "bg-blue-50 shadow-lg" : isAudit ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-blue-50/40"
      )}
      {...dragProps}
    >
      <td className="pl-2 py-1 w-6" {...dragHandleProps}>
        <GripVertical className="w-3 h-3 text-slate-300 cursor-move group-hover:text-slate-500" />
      </td>
      <td className="py-1 w-6">
        <Checkbox checked={isSelected} onCheckedChange={onSelect} disabled={isAudit} className="h-3 w-3" />
      </td>
      {/* Audit indicator */}
      <td className="py-1 w-5 text-center">
        {isAudit && <Lock className="w-3 h-3 text-amber-500 inline" />}
      </td>

      {/* Source Name */}
      <td className="py-1 px-2 text-xs font-mono text-slate-800 border-r border-slate-100 min-w-[120px]">
        {mapping.source || <span className="text-slate-400 italic text-xs">computed</span>}
      </td>
      {/* Source Type */}
      <td className="py-1 text-xs font-mono text-slate-500 border-r border-slate-100 min-w-[80px] px-2">
        {mapping.sourceDataType || ""}
      </td>
      {/* Source Length */}
      <td className="py-1 text-xs font-mono text-slate-400 border-r border-slate-100 min-w-[60px] px-2">
        {mapping.sourceLength || ""}
      </td>

      {/* Target Name */}
      <td className="py-1 border-r border-slate-100 min-w-[120px]">
        <EditableCell value={mapping.target} onChange={v => onUpdate("target", v)} placeholder="target_col" mono />
      </td>
      {/* Target Type */}
      <td className="py-1 border-r border-slate-100 min-w-[80px]">
        <EditableCell value={mapping.targetDataType} onChange={v => onUpdate("targetDataType", v)} placeholder="varchar" mono />
      </td>
      {/* Target Length */}
      <td className="py-1 border-r border-slate-100 min-w-[60px]">
        <EditableCell value={mapping.targetLength} onChange={v => onUpdate("targetLength", v)} placeholder="255" mono />
      </td>

      {/* Transformation */}
      <td className="py-1 border-r border-slate-100 min-w-[140px]">
        <SelectCell value={mapping.transformation || "direct"} onChange={v => onUpdate("transformation", v)} options={TRANSFORMATIONS} />
      </td>

      {/* Expression (shown only for custom transforms) */}
      <td className="py-1 min-w-[120px]">
        <EditableCell
          value={mapping.expression}
          onChange={v => onUpdate("expression", v)}
          placeholder={mapping.transformation === "custom_sql" ? "SQL expr..." : ""}
          disabled={mapping.transformation !== "custom_sql"}
        />
      </td>

      <td className="py-1 pr-2 w-6">
        <button type="button" onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all">
          <X className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
}