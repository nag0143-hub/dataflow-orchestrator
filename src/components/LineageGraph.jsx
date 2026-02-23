import React, { useState, useMemo } from "react";
import { ChevronRight, Database, ArrowRight } from "lucide-react";

export default function LineageGraph({ job, connections, onNodeClick }) {
  const [hoveredNode, setHoveredNode] = useState(null);

  const sourceConn = connections.find((c) => c.id === job.source_connection_id);
  const targetConn = connections.find((c) => c.id === job.target_connection_id);

  // Calculate positions for nodes
  const positions = {
    source: { x: 50, y: 200 },
    job: { x: 300, y: 200 },
    target: { x: 550, y: 200 },
  };

  const datasets = (job.selected_datasets || []).map((d, idx) => ({
    ...d,
    id: `${d.schema}.${d.table}`,
    y: 50 + idx * 40,
  }));

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-6">
      <h4 className="font-semibold text-slate-900 mb-4">Data Flow Graph</h4>

      <svg width="100%" height="600" className="border border-slate-100 rounded bg-slate-50">
        {/* Connection lines */}
        {/* Source to Job */}
        <line
          x1={positions.source.x + 80}
          y1={positions.source.y}
          x2={positions.job.x - 60}
          y2={positions.job.y}
          stroke="#cbd5e1"
          strokeWidth="2"
        />

        {/* Job to Target */}
        <line
          x1={positions.job.x + 60}
          y1={positions.job.y}
          x2={positions.target.x - 80}
          y2={positions.target.y}
          stroke="#cbd5e1"
          strokeWidth="2"
        />

        {/* Dataset connections */}
        {datasets.map((dataset, idx) => (
          <g key={`dataset-${idx}`}>
            {/* Source to Dataset */}
            <line
              x1={positions.source.x + 80}
              y1={positions.source.y}
              x2={200}
              y2={50 + idx * 40}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="4"
            />
            {/* Dataset to Target */}
            <line
              x1={400}
              y1={50 + idx * 40}
              x2={positions.target.x - 80}
              y2={positions.target.y}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="4"
            />
          </g>
        ))}

        {/* Source Node */}
        {sourceConn && (
          <g
            onClick={() => onNodeClick("source", sourceConn)}
            onMouseEnter={() => setHoveredNode("source")}
            onMouseLeave={() => setHoveredNode(null)}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={positions.source.x}
              y={positions.source.y - 40}
              width="160"
              height="80"
              rx="8"
              fill={hoveredNode === "source" ? "#eff6ff" : "#f8fafc"}
              stroke={hoveredNode === "source" ? "#3b82f6" : "#cbd5e1"}
              strokeWidth="2"
            />
            <circle
              cx={positions.source.x + 20}
              cy={positions.source.y}
              r="8"
              fill="#06b6d4"
            />
            <text
              x={positions.source.x + 35}
              y={positions.source.y - 12}
              fontSize="12"
              fontWeight="600"
              fill="#0f172a"
            >
              Source
            </text>
            <text
              x={positions.source.x + 35}
              y={positions.source.y + 6}
              fontSize="11"
              fill="#64748b"
            >
              {sourceConn.name}
            </text>
            <text
              x={positions.source.x + 35}
              y={positions.source.y + 20}
              fontSize="10"
              fill="#94a3b8"
            >
              {sourceConn.platform}
            </text>
          </g>
        )}

        {/* Job Node */}
        <g
          onClick={() => onNodeClick("job", job)}
          onMouseEnter={() => setHoveredNode("job")}
          onMouseLeave={() => setHoveredNode(null)}
          style={{ cursor: "pointer" }}
        >
          <rect
            x={positions.job.x - 60}
            y={positions.job.y - 40}
            width="120"
            height="80"
            rx="8"
            fill={hoveredNode === "job" ? "#f0fdf4" : "#f8fafc"}
            stroke={hoveredNode === "job" ? "#22c55e" : "#cbd5e1"}
            strokeWidth="2"
          />
          <circle cx={positions.job.x - 40} cy={positions.job.y} r="8" fill="#f59e0b" />
          <text
            x={positions.job.x - 25}
            y={positions.job.y - 12}
            fontSize="12"
            fontWeight="600"
            fill="#0f172a"
          >
            Job
          </text>
          <text
            x={positions.job.x - 25}
            y={positions.job.y + 6}
            fontSize="10"
            fill="#64748b"
            textLength="70"
          >
            {job.name.substring(0, 10)}
          </text>
          <text
            x={positions.job.x - 25}
            y={positions.job.y + 20}
            fontSize="10"
            fill="#94a3b8"
          >
            {datasets.length} datasets
          </text>
        </g>

        {/* Target Node */}
        {targetConn && (
          <g
            onClick={() => onNodeClick("target", targetConn)}
            onMouseEnter={() => setHoveredNode("target")}
            onMouseLeave={() => setHoveredNode(null)}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={positions.target.x - 80}
              y={positions.target.y - 40}
              width="160"
              height="80"
              rx="8"
              fill={hoveredNode === "target" ? "#fef2f2" : "#f8fafc"}
              stroke={hoveredNode === "target" ? "#ef4444" : "#cbd5e1"}
              strokeWidth="2"
            />
            <circle
              cx={positions.target.x - 20}
              cy={positions.target.y}
              r="8"
              fill="#ec4899"
            />
            <text
              x={positions.target.x - 5}
              y={positions.target.y - 12}
              fontSize="12"
              fontWeight="600"
              fill="#0f172a"
            >
              Target
            </text>
            <text
              x={positions.target.x - 5}
              y={positions.target.y + 6}
              fontSize="11"
              fill="#64748b"
            >
              {targetConn.name}
            </text>
            <text
              x={positions.target.x - 5}
              y={positions.target.y + 20}
              fontSize="10"
              fill="#94a3b8"
            >
              {targetConn.platform}
            </text>
          </g>
        )}

        {/* Dataset Nodes */}
        {datasets.map((dataset, idx) => (
          <g
            key={`dataset-node-${idx}`}
            onClick={() => onNodeClick("dataset", dataset)}
            onMouseEnter={() => setHoveredNode(`dataset-${idx}`)}
            onMouseLeave={() => setHoveredNode(null)}
            style={{ cursor: "pointer" }}
          >
            <rect
              x="200"
              y={50 + idx * 40 - 20}
              width="200"
              height="40"
              rx="6"
              fill={hoveredNode === `dataset-${idx}` ? "#f5f3ff" : "#fafafa"}
              stroke={hoveredNode === `dataset-${idx}` ? "#a78bfa" : "#e5e7eb"}
              strokeWidth="1.5"
            />
            <circle cx="215" cy={50 + idx * 40} r="5" fill="#8b5cf6" />
            <text
              x="230"
              y={50 + idx * 40 + 4}
              fontSize="11"
              fontWeight="500"
              fill="#1f2937"
            >
              {dataset.schema}.{dataset.table}
            </text>
            <text
              x="230"
              y={50 + idx * 40 + 15}
              fontSize="9"
              fill="#9ca3af"
            >
              {dataset.load_method || "append"}
            </text>
          </g>
        ))}
      </svg>

      <p className="text-xs text-slate-500 mt-3">Click on any node to view details</p>
    </div>
  );
}