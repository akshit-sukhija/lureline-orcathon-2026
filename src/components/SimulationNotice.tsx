import { AlertTriangle, ShieldAlert } from 'lucide-react';

export function SimulationNotice() {
  return (
    <div
      role="region"
      aria-label="Simulation environment notice"
      className="bg-slate-900/95 border-b border-slate-800 px-4 sm:px-6 py-2 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2 font-medium text-amber-300">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          SIMULATION LAB · Synthetic events only · No live network monitoring
        </span>
      </div>
      <div className="flex items-center gap-2 text-slate-400">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden="true" />
        <span>
          Deterministic replay &amp; ground-truth benchmark · Zero external network listeners or LLM claims
        </span>
      </div>
    </div>
  );
}
