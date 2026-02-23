import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DataCleansing({ selectedObjects, cleansing, onChange }) {
  const [expandedTable, setExpandedTable] = useState(null);
  const [showAllowList, setShowAllowList] = useState(false);
  const [showExcludeList, setShowExcludeList] = useState(false);

  if (!selectedObjects || selectedObjects.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm text-slate-500">Select objects first to configure data cleansing rules.</p>
      </div>
    );
  }

  const getTableKey = (obj) => `${obj.schema}.${obj.table}`;

  const handleToggleRule = (tableKey, ruleKey) => {
    const current = cleansing?.[tableKey] || {};
    onChange({
      ...cleansing,
      [tableKey]: {
        ...current,
        [ruleKey]: !current[ruleKey]
      }
    });
  };

  const handleCharacterList = (tableKey, listType, value) => {
    const current = cleansing?.[tableKey] || {};
    onChange({
      ...cleansing,
      [tableKey]: {
        ...current,
        [`${listType}_list`]: value
      }
    });
  };

  const handleCharacterMode = (tableKey, mode) => {
    const current = cleansing?.[tableKey] || {};
    onChange({
      ...cleansing,
      [tableKey]: {
        ...current,
        character_mode: mode
      }
    });
  };

  const handleRemoveRule = (tableKey) => {
    const updated = { ...cleansing };
    delete updated[tableKey];
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {selectedObjects.map((obj) => {
        const tableKey = getTableKey(obj);
        const tableConfig = cleansing?.[tableKey] || {};
        const isExpanded = expandedTable === tableKey;

        return (
          <div key={tableKey} className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedTable(isExpanded ? null : tableKey)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors",
                isExpanded && "bg-slate-50"
              )}
            >
              <div className="flex items-center gap-2 text-left">
                <Wand2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 text-sm">{obj.table}</p>
                  <p className="text-xs text-slate-500">{obj.schema}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {Object.keys(tableConfig).length > 0 && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                    {Object.values(tableConfig).filter(Boolean).length} rule{Object.values(tableConfig).filter(Boolean).length !== 1 ? "s" : ""}
                  </span>
                )}
                <svg
                  className={cn(
                    "w-4 h-4 text-slate-400 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-200 bg-slate-50/50 p-4 space-y-4">
                {/* Remove Unprintable Characters */}
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        checked={!!tableConfig.remove_unprintable}
                        onCheckedChange={() => handleToggleRule(tableKey, "remove_unprintable")}
                      />
                      <span className="text-sm font-medium text-slate-900">Remove Unprintable Characters</span>
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">By default, removes control characters (ASCII 0-31, 127, 128-159)</p>

                  {tableConfig.remove_unprintable && (
                    <div className="space-y-3 border-t border-slate-200 pt-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleCharacterMode(tableKey, "default")}
                          className={cn(
                            "flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                            tableConfig.character_mode !== "exclude" 
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                          )}
                        >
                          Default Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCharacterMode(tableKey, "exclude")}
                          className={cn(
                            "flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                            tableConfig.character_mode === "exclude"
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                          )}
                        >
                          Exclude List
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCharacterMode(tableKey, "allow")}
                          className={cn(
                            "flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                            tableConfig.character_mode === "allow"
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                          )}
                        >
                          Allow List
                        </button>
                      </div>

                      {tableConfig.character_mode === "exclude" && (
                        <div>
                          <label className="text-xs text-slate-700 font-medium block mb-1">
                            Characters to Keep (comma-separated ASCII codes or ranges)
                          </label>
                          <Input
                            type="text"
                            placeholder="32,48-57,65-90,97-122"
                            value={tableConfig.exclude_list || ""}
                            onChange={(e) => handleCharacterList(tableKey, "exclude", e.target.value)}
                            className="text-xs"
                          />
                          <p className="text-xs text-slate-400 mt-1">e.g. "32" (space), "48-57" (0-9), "65-90" (A-Z)</p>
                        </div>
                      )}

                      {tableConfig.character_mode === "allow" && (
                        <div>
                          <label className="text-xs text-slate-700 font-medium block mb-1">
                            Characters to Remove (comma-separated ASCII codes or ranges)
                          </label>
                          <Input
                            type="text"
                            placeholder="9,10,13"
                            value={tableConfig.allow_list || ""}
                            onChange={(e) => handleCharacterList(tableKey, "allow", e.target.value)}
                            className="text-xs"
                          />
                          <p className="text-xs text-slate-400 mt-1">e.g. "9" (tab), "10" (LF), "13" (CR)</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Header/Trailer Removal */}
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={!!tableConfig.remove_header_trailer}
                      onCheckedChange={() => handleToggleRule(tableKey, "remove_header_trailer")}
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-900">Remove Header/Trailer Records</span>
                      <p className="text-xs text-slate-500">Remove first and last record from each file</p>
                    </div>
                  </label>
                </div>

                {/* Remove Line Feeds */}
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={!!tableConfig.remove_line_feeds}
                      onCheckedChange={() => handleToggleRule(tableKey, "remove_line_feeds")}
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-900">Remove Line Feeds (LF, CR/LF)</span>
                      <p className="text-xs text-slate-500">Remove \\n and \\r\\n characters (ASCII 10, 13)</p>
                    </div>
                  </label>
                </div>

                {/* Remove Carriage Returns */}
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={!!tableConfig.remove_carriage_returns}
                      onCheckedChange={() => handleToggleRule(tableKey, "remove_carriage_returns")}
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-900">Remove Carriage Returns (CR/CTRL+M)</span>
                      <p className="text-xs text-slate-500">Remove \\r and \\r\\n characters (ASCII 13)</p>
                    </div>
                  </label>
                </div>

                {/* Remove Control Characters */}
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={!!tableConfig.remove_control_chars}
                      onCheckedChange={() => handleToggleRule(tableKey, "remove_control_chars")}
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-900">Remove Control Characters</span>
                      <p className="text-xs text-slate-500">Remove tabs (\\t), nulls (\\0), and other control chars</p>
                    </div>
                  </label>
                </div>

                {/* Remove Non-ASCII */}
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={!!tableConfig.remove_non_ascii}
                      onCheckedChange={() => handleToggleRule(tableKey, "remove_non_ascii")}
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-900">Remove Non-ASCII Characters</span>
                      <p className="text-xs text-slate-500">Keep only ASCII 32-126 (printable ASCII)</p>
                    </div>
                  </label>
                </div>

                {/* Remove Button */}
                {Object.keys(tableConfig).length > 0 && (
                  <div className="border-t border-slate-200 pt-3 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveRule(tableKey)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove All Rules
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}