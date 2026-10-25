import { PointerEvent, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Maximize2,
  Move,
  Network,
  Server,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  NetworkEdge,
  NetworkNode,
  ScenarioRunResult,
  SelectedEntity,
} from '../domain/types';

interface NetworkGraphProps {
  nodes: NetworkNode[];
  topologyEdges: NetworkEdge[];
  runResult: ScenarioRunResult | null;
  selectedEntity: SelectedEntity;
  onSelectEntity: (entity: SelectedEntity) => void;
}

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.2;
const ZOOM_STEP = 0.2;

export function NetworkGraph({
  nodes,
  topologyEdges,
  runResult,
  selectedEntity,
  onSelectEntity,
}: NetworkGraphProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const suppressNextClickRef = useRef<boolean>(false);

  const nodeMap = new Map<string, NetworkNode>(nodes.map((n) => [n.id, n]));
  const confirmedEdgeMap = new Map(
    (runResult?.reconstruction.predictedEdges ?? []).map((e) => [e.edgeKey, e])
  );
  const unresolvedGaps = runResult?.reconstruction.unresolvedGaps ?? [];

  const handleZoomIn = () => {
    setZoom((z) => Math.min(MAX_ZOOM, Number((z + ZOOM_STEP).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(MIN_ZOOM, Number((z - ZOOM_STEP).toFixed(2))));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    suppressNextClickRef.current = false;
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.pointerX;
    const dy = e.clientY - start.pointerY;

    if (Math.hypot(dx, dy) > 5) {
      suppressNextClickRef.current = true;
    }

    if (suppressNextClickRef.current) {
      setPan({
        x: Math.round(start.startPanX + dx),
        y: Math.round(start.startPanY + dy),
      });
    }
  };

  const handlePointerEnd = () => {
    dragStartRef.current = null;
    setIsDragging(false);
  };

  const safeSelectEntity = (entity: SelectedEntity) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    onSelectEntity(entity);
  };

  return (
    <section
      id="network-topology"
      aria-labelledby="network-topology-heading"
      className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-3.5">
        <div>
          <h2
            id="network-topology-heading"
            className="text-base font-semibold text-slate-100 flex items-center gap-2"
          >
            <Network className="w-4 h-4 text-sky-400" aria-hidden="true" />
            <span>Simulated Network Topology &amp; Evidence-Backed Path</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any node, confirmed path edge, or unresolved evidence gap to inspect its supporting event records. Drag canvas to pan.
          </p>
        </div>

        {/* Text + Icon Legend (never relies on color alone) */}
        <div
          aria-label="Network graph legend"
          className="flex flex-wrap items-center gap-4 text-xs text-slate-300"
        >
          <span className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>Ordinary Asset (4)</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>Decoy Asset (2)</span>
          </span>
          <span className="flex items-center gap-1.5 text-sky-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>Confirmed Edge</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>Unconfirmed / Gap</span>
          </span>
        </div>
      </div>

      {/* Pan & Zoom Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-mono">
          <Move className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <span data-testid="graph-viewport-status">
            Zoom: {Math.round(zoom * 100)}% · Pan: ({pan.x}px, {pan.y}px)
          </span>
        </div>

        <div
          role="group"
          aria-label="Network graph zoom and pan controls"
          className="flex items-center gap-1.5"
        >
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out network graph"
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 text-slate-200 rounded flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Zoom Out</span>
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in network graph"
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 text-slate-200 rounded flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Zoom In</span>
          </button>

          <button
            type="button"
            onClick={handleResetView}
            disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
            aria-label="Reset network graph view"
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 text-slate-200 rounded flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* SVG Network Canvas */}
      <div className="relative bg-[#090d14] border border-slate-800/90 rounded-md overflow-hidden">
        <svg
          data-testid="network-graph-svg"
          viewBox="0 0 890 430"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          className={`w-full h-auto select-none touch-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          role="img"
          aria-label="Simulated six-node network topology graph showing four ordinary assets and two decoy assets"
        >
          <defs>
            <marker
              id="arrow-topology"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#334155" />
            </marker>
            <marker
              id="arrow-confirmed"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            <marker
              id="arrow-decoy-edge"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#fb7185" />
            </marker>
            <marker
              id="arrow-gap"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#fbbf24" />
            </marker>
          </defs>

          <g
            data-testid="network-graph-viewport"
            transform={`translate(${pan.x}, ${pan.y}) translate(445, 215) scale(${zoom}) translate(-445, -215)`}
          >
            {/* Subtle Subnet Zone Labels */}
            <text
              x="40"
              y="34"
              fill="#64748b"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
            >
              ZONE 1: USER SUBNET
            </text>
            <text
              x="255"
              y="34"
              fill="#64748b"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
            >
              ZONE 2: OPS &amp; STORAGE
            </text>
            <text
              x="505"
              y="34"
              fill="#64748b"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
            >
              ZONE 3: APP TIER
            </text>
            <text
              x="695"
              y="34"
              fill="#f59e0b"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
            >
              ZONE 4: DECEPTION ENCLAVE
            </text>

            {/* 1. Allowed Topology Edges & Confirmed Reconstructed Edges */}
            {topologyEdges.map((topo) => {
              const src = nodeMap.get(topo.sourceNodeId);
              const dst = nodeMap.get(topo.destinationNodeId);
              if (!src || !dst) return null;

              const edgeKey = `${topo.sourceNodeId}->${topo.destinationNodeId}`;
              const confirmed = confirmedEdgeMap.get(edgeKey);
              const isSelected =
                selectedEntity?.kind === 'edge' &&
                selectedEntity.edgeKey === edgeKey;
              const targetsDecoy = dst.isDecoy && Boolean(confirmed);

              // Calculate shortened line endpoints so lines stop cleanly at node boundaries
              const dx = dst.x - src.x;
              const dy = dst.y - src.y;
              const dist = Math.hypot(dx, dy) || 1;
              const startOffset = 60;
              const endOffset = 64;
              const x1 = src.x + (dx / dist) * startOffset;
              const y1 = src.y + (dy / dist) * startOffset;
              const x2 = dst.x - (dx / dist) * endOffset;
              const y2 = dst.y - (dy / dist) * endOffset;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              const strokeColor = confirmed
                ? targetsDecoy
                  ? '#fb7185'
                  : '#38bdf8'
                : '#1e293b';

              const markerEnd = confirmed
                ? targetsDecoy
                  ? 'url(#arrow-decoy-edge)'
                  : 'url(#arrow-confirmed)'
                : 'url(#arrow-topology)';

              return (
                <g
                  key={topo.id}
                  onClick={() => {
                    if (confirmed) {
                      safeSelectEntity({ kind: 'edge', edgeKey });
                    }
                  }}
                  className={confirmed ? 'cursor-pointer' : ''}
                >
                  {/* Invisible wider hit area for confirmed edges */}
                  {confirmed && (
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="transparent"
                      strokeWidth={18}
                    />
                  )}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 4 : confirmed ? 3 : 1.5}
                    strokeDasharray={confirmed ? undefined : '3 3'}
                    markerEnd={markerEnd}
                  />

                  {/* Edge badge showing supporting event IDs for confirmed edges */}
                  {confirmed && (
                    <g transform={`translate(${midX}, ${midY - 14})`}>
                      <rect
                        x={-44}
                        y={-10}
                        width={88}
                        height={19}
                        rx={4}
                        fill={isSelected ? '#0284c7' : '#0f172a'}
                        stroke={
                          isSelected
                            ? '#7dd3fc'
                            : targetsDecoy
                            ? '#fb7185'
                            : '#38bdf8'
                        }
                        strokeWidth={1.2}
                      />
                      <text
                        x={0}
                        y={3}
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="9.5"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {confirmed.supportingEventIds.join(', ')}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* 2. Unresolved Evidence Gaps (missing hops or rejected non-topological spoofs) */}
            {unresolvedGaps.map((gap) => {
              const src = nodeMap.get(gap.fromNodeId);
              const dst = nodeMap.get(gap.toNodeId);
              if (!src || !dst) return null;

              const isSelected =
                selectedEntity?.kind === 'gap' && selectedEntity.id === gap.id;

              const dx = dst.x - src.x;
              const dy = dst.y - src.y;
              const dist = Math.hypot(dx, dy) || 1;
              const x1 = src.x + (dx / dist) * 60;
              const y1 = src.y + (dy / dist) * 60 + 10;
              const x2 = dst.x - (dx / dist) * 64;
              const y2 = dst.y - (dy / dist) * 64 + 10;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <g
                  key={gap.id}
                  onClick={() => safeSelectEntity({ kind: 'gap', id: gap.id })}
                  className="cursor-pointer"
                >
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="transparent"
                    strokeWidth={18}
                  />
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#fbbf24"
                    strokeWidth={isSelected ? 3.5 : 2.5}
                    strokeDasharray="6 4"
                    markerEnd="url(#arrow-gap)"
                  />
                  <g transform={`translate(${midX}, ${midY + 18})`}>
                    <rect
                      x={-54}
                      y={-10}
                      width={108}
                      height={19}
                      rx={4}
                      fill={isSelected ? '#78350f' : '#1c1917'}
                      stroke="#fbbf24"
                      strokeWidth={1.2}
                    />
                    <text
                      x={0}
                      y={3}
                      textAnchor="middle"
                      fill="#fde68a"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      ? GAP ({gap.id})
                    </text>
                  </g>
                </g>
              );
            })}

            {/* 3. Network Nodes (4 ordinary assets + 2 decoys) */}
            {nodes.map((node) => {
              const isSelected =
                selectedEntity?.kind === 'node' &&
                selectedEntity.id === node.id;

              const hasAlert = (runResult?.alerts ?? []).some(
                (a) => a.destinationNodeId === node.id
              );
              const isVisited = (
                runResult?.reconstruction.predictedEdges ?? []
              ).some(
                (e) =>
                  e.sourceNodeId === node.id || e.destinationNodeId === node.id
              );

              const boxStroke = isSelected
                ? '#38bdf8'
                : hasAlert
                ? '#fb7185'
                : node.isDecoy
                ? '#f59e0b'
                : isVisited
                ? '#0ea5e9'
                : '#334155';

              const boxFill = node.isDecoy ? '#1c1410' : '#0f172a';

              return (
                <g
                  key={node.id}
                  data-testid={`svg-node-${node.id}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() =>
                    safeSelectEntity({ kind: 'node', id: node.id })
                  }
                  className="cursor-pointer"
                >
                  <rect
                    x={-62}
                    y={-36}
                    width={124}
                    height={72}
                    rx={6}
                    fill={boxFill}
                    stroke={boxStroke}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeDasharray={node.isDecoy ? '5 3' : undefined}
                  />
                  <text
                    x={0}
                    y={-17}
                    textAnchor="middle"
                    fill={node.isDecoy ? '#fbbf24' : '#94a3b8'}
                    fontSize="9.5"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {node.isDecoy ? '[DECOY ASSET]' : '[ORDINARY ASSET]'}
                  </text>
                  <text
                    x={0}
                    y={2}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="11.5"
                    fontWeight="600"
                  >
                    {node.label}
                  </text>
                  <text
                    x={0}
                    y={19}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {node.ipAddress}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {!runResult && (
          <div className="bg-slate-950/85 border-t border-slate-800 px-4 py-3 text-xs text-slate-300 flex items-center justify-between">
            <span>
              Workbench is currently reset. No path edges or alerts are active on the canvas.
            </span>
            <span className="font-mono text-sky-400">
              Click &ldquo;Run Scenario&rdquo; to execute reconstruction
            </span>
          </div>
        )}
      </div>

      {/* Keyboard-Accessible Quick Select Controls for Graph Edges, Gaps, and Nodes */}
      <div className="space-y-3 pt-1">
        {runResult && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400 mr-1">
              Confirmed Path Edges ({runResult.reconstruction.predictedEdges.length}):
            </span>
            {runResult.reconstruction.predictedEdges.length === 0 ? (
              <span className="text-xs text-slate-500">None</span>
            ) : (
              runResult.reconstruction.predictedEdges.map((edge) => {
                const isSelected =
                  selectedEntity?.kind === 'edge' &&
                  selectedEntity.edgeKey === edge.edgeKey;
                return (
                  <button
                    key={edge.edgeKey}
                    type="button"
                    onClick={() =>
                      onSelectEntity({ kind: 'edge', edgeKey: edge.edgeKey })
                    }
                    aria-label={`Inspect confirmed edge ${edge.edgeKey} supported by ${edge.supportingEventIds.join(', ')}`}
                    className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400 ${
                      isSelected
                        ? 'bg-sky-950/90 border-sky-400 text-sky-200'
                        : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {edge.sourceNodeId} → {edge.destinationNodeId} [
                    {edge.supportingEventIds.join(', ')}]
                  </button>
                );
              })
            )}
          </div>
        )}

        {runResult && runResult.reconstruction.unresolvedGaps.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-amber-300 mr-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                Unresolved Evidence Gaps ({runResult.reconstruction.unresolvedGaps.length}):
              </span>
            </span>
            {runResult.reconstruction.unresolvedGaps.map((gap) => {
              const isSelected =
                selectedEntity?.kind === 'gap' && selectedEntity.id === gap.id;
              return (
                <button
                  key={gap.id}
                  type="button"
                  onClick={() => onSelectEntity({ kind: 'gap', id: gap.id })}
                  aria-label={`Inspect unresolved gap ${gap.id} from ${gap.fromNodeId} to ${gap.toNodeId}`}
                  className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
                    isSelected
                      ? 'bg-amber-950/90 border-amber-400 text-amber-200'
                      : 'bg-slate-900 border-amber-700/70 text-amber-300 hover:border-amber-500'
                  }`}
                >
                  ? {gap.fromNodeId} → {gap.toNodeId} (Insufficient Evidence)
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 mr-1">
            Inspect Node:
          </span>
          {nodes.map((node) => {
            const isSelected =
              selectedEntity?.kind === 'node' && selectedEntity.id === node.id;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectEntity({ kind: 'node', id: node.id })}
                aria-label={`Inspect ${node.isDecoy ? 'decoy' : 'ordinary'} node ${node.label} (${node.id})`}
                className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400 ${
                  isSelected
                    ? 'bg-slate-800 border-sky-400 text-slate-100'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="font-medium">{node.label}</span>
                <span className="text-slate-500 font-mono ml-1.5">
                  {node.isDecoy ? 'DECOY' : 'ASSET'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
