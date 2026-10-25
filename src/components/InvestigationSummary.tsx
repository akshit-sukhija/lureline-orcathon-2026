import { ClipboardCheck } from 'lucide-react';
import { ScenarioRunResult } from '../domain/types';

interface InvestigationSummaryProps {
  runResult: ScenarioRunResult | null;
}

export function InvestigationSummary({ runResult }: InvestigationSummaryProps) {
  if (!runResult) {
    return (
      <section
        aria-labelledby="summary-heading"
        className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-2"
      >
        <h2
          id="summary-heading"
          className="text-base font-semibold text-slate-100 flex items-center gap-2"
        >
          <ClipboardCheck className="w-4 h-4 text-sky-400" aria-hidden="true" />
          <span>Deterministic Investigation Summary</span>
        </h2>
        <p className="text-xs text-slate-400">
          Workbench is reset. Run a scenario to generate a deterministic summary from computed domain facts.
        </p>
      </section>
    );
  }

  const { deterministicSummary } = runResult;

  return (
    <section
      aria-labelledby="summary-heading"
      className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <h2
            id="summary-heading"
            className="text-base font-semibold text-slate-100 flex items-center gap-2"
          >
            <ClipboardCheck
              className="w-4 h-4 text-sky-400"
              aria-hidden="true"
            />
            <span>Deterministic Investigation Summary</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Computed strictly from canonical validation, detection, reconstruction, and benchmark structures — zero LLM generation or speculative attribution.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3.5 text-sm font-semibold text-slate-100">
        {deterministicSummary.headline}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-md p-3.5 space-y-1.5">
          <div className="font-semibold text-slate-200">
            1. Observed Telemetry &amp; Validation
          </div>
          <ul className="space-y-1 text-slate-300 leading-relaxed list-disc pl-4">
            {deterministicSummary.observedFacts.map((fact, idx) => (
              <li key={idx}>{fact}</li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-md p-3.5 space-y-1.5">
          <div className="font-semibold text-slate-200">
            2. Evidence-Supported Path
          </div>
          <p className="text-slate-300 leading-relaxed">
            {deterministicSummary.confirmedPathSummary}
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-md p-3.5 space-y-1.5">
          <div className="font-semibold text-amber-300">
            3. Explicit Uncertainty &amp; Limitations
          </div>
          <p className="text-slate-300 leading-relaxed">
            {deterministicSummary.uncertaintySummary}
          </p>
        </div>
      </div>
    </section>
  );
}
