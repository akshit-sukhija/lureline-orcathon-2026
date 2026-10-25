import {
  AlertCircle,
  CheckCircle2,
  Scale,
  XCircle,
} from 'lucide-react';
import { MethodMetrics, ScenarioRunResult, SelectedEntity } from '../domain/types';

interface BenchmarkPanelProps {
  runResult: ScenarioRunResult | null;
  onSelectEntity: (entity: SelectedEntity) => void;
}

function formatRatioPercent(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return `${(value * 100).toFixed(1)}%`;
}

function MethodComparisonCard({
  metrics,
  isPrimary,
}: {
  metrics: MethodMetrics;
  isPrimary: boolean;
}) {
  return (
    <div
      className={`bg-slate-900/90 border rounded-md p-4 space-y-3 ${
        isPrimary ? 'border-sky-800/80' : 'border-slate-800'
      }`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5 min-h-[60px]">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            {metrics.methodName}
          </h3>
          <p className="text-xs text-slate-400">
            {isPrimary
              ? 'Requires supporting event IDs + valid topology + session continuity'
              : 'Intentionally simplistic: bridges consecutive session events without topology/gap verification'}
          </p>
        </div>
        <span className="text-xs font-mono text-slate-400 shrink-0">
          Synthetic Eval
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-xs">
        <div className="bg-[#0b101b] border border-slate-800/90 rounded p-2.5">
          <div className="text-slate-400 font-sans">True Positives</div>
          <div className="mt-1 text-base font-bold tabular-nums text-emerald-400">
            {metrics.tpCount}
          </div>
          <div className="text-[11px] text-slate-500">Predicted &amp; Expected</div>
        </div>

        <div className="bg-[#0b101b] border border-slate-800/90 rounded p-2.5">
          <div className="text-slate-400 font-sans">False Positives</div>
          <div
            className={`mt-1 text-base font-bold tabular-nums ${
              metrics.fpCount > 0 ? 'text-rose-400' : 'text-slate-200'
            }`}
          >
            {metrics.fpCount}
          </div>
          <div className="text-[11px] text-slate-500">Predicted, Not Expected</div>
        </div>

        <div className="bg-[#0b101b] border border-slate-800/90 rounded p-2.5">
          <div className="text-slate-400 font-sans">Missed Edges (FN)</div>
          <div
            className={`mt-1 text-base font-bold tabular-nums ${
              metrics.fnCount > 0 ? 'text-amber-400' : 'text-slate-200'
            }`}
          >
            {metrics.fnCount}
          </div>
          <div className="text-[11px] text-slate-500">Expected, Not Predicted</div>
        </div>

        <div className="bg-[#0b101b] border border-slate-800/90 rounded p-2.5">
          <div className="text-slate-400 font-sans">Precision</div>
          <div className="mt-1 text-base font-bold tabular-nums text-sky-300">
            {formatRatioPercent(metrics.precision)}
          </div>
          <div className="text-[11px] text-slate-500">TP / (TP + FP)</div>
        </div>

        <div className="bg-[#0b101b] border border-slate-800/90 rounded p-2.5">
          <div className="text-slate-400 font-sans">Recall</div>
          <div className="mt-1 text-base font-bold tabular-nums text-sky-300">
            {formatRatioPercent(metrics.recall)}
          </div>
          <div className="text-[11px] text-slate-500">TP / (TP + FN)</div>
        </div>
      </div>

      <div className="space-y-1 text-xs font-mono text-slate-400 pt-1">
        <div>Precision Formula: {metrics.precisionExplanation}</div>
        <div>Recall Formula: {metrics.recallExplanation}</div>
      </div>
    </div>
  );
}

export function BenchmarkPanel({
  runResult,
  onSelectEntity,
}: BenchmarkPanelProps) {
  if (!runResult) {
    return (
      <section
        id="benchmark-comparison"
        aria-labelledby="benchmark-heading"
        className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-3"
      >
        <h2
          id="benchmark-heading"
          className="text-base font-semibold text-slate-100 flex items-center gap-2"
        >
          <Scale className="w-4 h-4 text-sky-400" aria-hidden="true" />
          <span>Ground-Truth Benchmark &amp; Naive Baseline Comparison</span>
        </h2>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-md p-6 text-center text-sm text-slate-400">
          Workbench is reset. Run a scenario to compare Lureline reconstruction against the Naive Baseline and scenario ground truth.
        </div>
      </section>
    );
  }

  const { benchmark, reconstruction, baseline } = runResult;
  const allCandidateEdges = Array.from(
    new Set([
      ...benchmark.groundTruthEdgeKeys,
      ...reconstruction.predictedEdgeKeys,
      ...baseline.predictedEdgeKeys,
    ])
  );

  const groundTruthSet = new Set(benchmark.groundTruthEdgeKeys);
  const lurelineEdgeMap = new Map(
    reconstruction.predictedEdges.map((e) => [e.edgeKey, e])
  );
  const baselineEdgeMap = new Map(
    baseline.predictedEdges.map((e) => [e.edgeKey, e])
  );

  return (
    <section
      id="benchmark-comparison"
      aria-labelledby="benchmark-heading"
      className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 border-b border-slate-800/80 pb-3.5">
        <div>
          <h2
            id="benchmark-heading"
            className="text-base font-semibold text-slate-100 flex items-center gap-2"
          >
            <Scale className="w-4 h-4 text-sky-400" aria-hidden="true" />
            <span>
              Synthetic Ground-Truth Benchmark: Lureline vs. Naive Baseline
            </span>
          </h2>
          <p className="text-xs text-amber-300/90 mt-0.5">
            {benchmark.syntheticDisclaimer}
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Ground truth is isolated from detection &amp; reconstruction modules
        </div>
      </div>

      {/* Method Cards Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MethodComparisonCard metrics={benchmark.lureline} isPrimary={true} />
        <MethodComparisonCard
          metrics={benchmark.naiveBaseline}
          isPrimary={false}
        />
      </div>

      {/* Honest Comparison Takeaway */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-md p-3.5 text-xs space-y-1">
        <div className="font-semibold text-slate-200">
          Benchmark Takeaway (Both methods evaluated on identical scenario input)
        </div>
        <p className="text-slate-300 leading-relaxed">
          {benchmark.comparisonSummary}
        </p>
      </div>

      {/* Edge-by-Edge Alignment Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-300">
          Edge-by-Edge Ground-Truth Alignment Matrix ({allCandidateEdges.length}{' '}
          total candidate edges)
        </h3>
        <div className="overflow-x-auto border border-slate-800 rounded-md">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-2.5 px-3 whitespace-nowrap">Directed Edge</th>
                <th className="py-2.5 px-3 whitespace-nowrap">
                  In Ground Truth?
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">
                  Lureline Evidence-Backed
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">
                  Lureline Supporting Events
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">
                  Naive Baseline
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {allCandidateEdges.map((edgeKey) => {
                const inGT = groundTruthSet.has(edgeKey);
                const lureEdge = lurelineEdgeMap.get(edgeKey);
                const baseEdge = baselineEdgeMap.get(edgeKey);

                const lureStatus =
                  inGT && lureEdge
                    ? 'TP (Confirmed)'
                    : !inGT && lureEdge
                    ? 'FP (Unsupported)'
                    : inGT && !lureEdge
                    ? 'FN (Missed / Unconfirmed Gap)'
                    : 'TN (Rejected)';

                const baseStatus =
                  inGT && baseEdge
                    ? 'TP (Predicted)'
                    : !inGT && baseEdge
                    ? 'FP (False Bridge / Spoof)'
                    : inGT && !baseEdge
                    ? 'FN (Missed)'
                    : 'TN';

                return (
                  <tr
                    key={edgeKey}
                    className="bg-[#0b101b] hover:bg-slate-900/70 text-slate-300"
                  >
                    <td className="py-2.5 px-3 font-semibold text-sky-300 whitespace-nowrap">
                      {lureEdge ? (
                        <button
                          type="button"
                          onClick={() =>
                            onSelectEntity({ kind: 'edge', edgeKey })
                          }
                          className="underline decoration-sky-500/60 hover:text-sky-200 cursor-pointer"
                        >
                          {edgeKey}
                        </button>
                      ) : (
                        <span>{edgeKey}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                      {inGT ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                          <CheckCircle2
                            className="w-3.5 h-3.5 text-emerald-400"
                            aria-hidden="true"
                          />
                          <span>Expected</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <XCircle
                            className="w-3.5 h-3.5 text-slate-500"
                            aria-hidden="true"
                          />
                          <span>Not in Ground Truth</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                      {lureStatus.startsWith('TP') ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300 font-medium">
                          <CheckCircle2
                            className="w-3.5 h-3.5 text-emerald-400"
                            aria-hidden="true"
                          />
                          <span>{lureStatus}</span>
                        </span>
                      ) : lureStatus.startsWith('FN') ? (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                          <AlertCircle
                            className="w-3.5 h-3.5 text-amber-400"
                            aria-hidden="true"
                          />
                          <span>{lureStatus}</span>
                        </span>
                      ) : lureStatus.startsWith('FP') ? (
                        <span className="inline-flex items-center gap-1 text-rose-300 font-medium">
                          <XCircle
                            className="w-3.5 h-3.5 text-rose-400"
                            aria-hidden="true"
                          />
                          <span>{lureStatus}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">{lureStatus}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-300">
                      {lureEdge
                        ? lureEdge.supportingEventIds.join(', ')
                        : 'Insufficient evidence'}
                    </td>
                    <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                      {baseStatus.startsWith('TP') ? (
                        <span className="text-emerald-300">{baseStatus}</span>
                      ) : baseStatus.startsWith('FP') ? (
                        <span className="text-rose-300 font-medium">
                          {baseStatus}
                        </span>
                      ) : (
                        <span className="text-amber-300">{baseStatus}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
