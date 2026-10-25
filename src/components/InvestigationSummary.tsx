import { FormEvent, useEffect, useState } from 'react';
import {
  Bot,
  ClipboardCheck,
  Download,
  Send,
  Sparkles,
} from 'lucide-react';
import { ScenarioRunResult } from '../domain/types';
import {
  buildInvestigationReportPayload,
  generateDeterministicExplanation,
} from '../engine/explainerAndReport';

interface InvestigationSummaryProps {
  runResult: ScenarioRunResult | null;
}

interface ExplainerMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  source: 'gemini' | 'deterministic-fallback' | 'user';
  modelName?: string;
  timestamp: string;
}

export type ExplainerModelChoice =
  | 'gemini-3.8-flash'
  | 'gemini-3.1-flash-lite'
  | 'gemini-4-argon';

export function InvestigationSummary({ runResult }: InvestigationSummaryProps) {
  const [lastDownloadedFile, setLastDownloadedFile] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<ExplainerMessage[]>([]);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] =
    useState<ExplainerModelChoice>('gemini-3.8-flash');
  const [followUpInput, setFollowUpInput] = useState<string>('');
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const scenarioKey = runResult
    ? `${runResult.scenario.id}-${runResult.validation.validEvents.length}`
    : 'reset';

  // Clear explainer thread and download banner when scenario changes or resets
  useEffect(() => {
    setMessages([]);
    setLastDownloadedFile(null);
    setFallbackNotice(null);
    setFollowUpInput('');
  }, [scenarioKey]);

  const handleDownloadReport = () => {
    const payload = buildInvestigationReportPayload(runResult);
    if (!payload) {
      return;
    }

    const fileName = `lureline-report-${payload.scenario.code}.json`;
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);

    try {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setLastDownloadedFile(fileName);
    } finally {
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 250);
    }
  };

  const requestExplanation = async (customPrompt?: string) => {
    if (!runResult || isExplaining) {
      return;
    }

    const payload = buildInvestigationReportPayload(runResult);
    if (!payload) {
      return;
    }

    const userPromptText =
      customPrompt?.trim() ||
      `Explain the ${runResult.scenario.code} investigation: why each decoy alert fired (with supporting event ID and rule ID), which connections have direct supporting evidence, which connections remain unconfirmed and why, and the investigation's limitations.`;

    const userMsg: ExplainerMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      text: userPromptText,
      source: 'user',
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setIsExplaining(true);
    setFallbackNotice(null);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          reportPayload: payload,
          model: selectedModel,
          messages: nextHistory.map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.ok && typeof data.explanation === 'string') {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-model-${Date.now()}`,
            role: 'model',
            text: data.explanation,
            source: 'gemini',
            modelName: data.model || selectedModel,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        const deterministicText = generateDeterministicExplanation(
          runResult,
          customPrompt
        );
        setFallbackNotice(
          data?.error ||
            'Gemini API unavailable or unconfigured; showing authoritative deterministic explanation fallback.'
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-fallback-${Date.now()}`,
            role: 'model',
            text: deterministicText,
            source: 'deterministic-fallback',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      const deterministicText = generateDeterministicExplanation(
        runResult,
        customPrompt
      );
      setFallbackNotice(
        'Server endpoint unreachable; showing authoritative deterministic explanation fallback.'
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-fallback-${Date.now()}`,
          role: 'model',
          text: deterministicText,
          source: 'deterministic-fallback',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleFollowUpSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!followUpInput.trim() || !runResult || isExplaining) return;
    const question = followUpInput.trim();
    setFollowUpInput('');
    void requestExplanation(question);
  };

  if (!runResult) {
    return (
      <section
        aria-labelledby="summary-heading"
        className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="summary-heading"
            className="text-base font-semibold text-slate-100 flex items-center gap-2"
          >
            <ClipboardCheck
              className="w-4 h-4 text-sky-400"
              aria-hidden="true"
            />
            <span>Deterministic Investigation Summary &amp; Report Export</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-900 border border-slate-800 rounded-md opacity-40 pointer-events-none flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download Report</span>
            </button>
            <button
              type="button"
              disabled
              className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-900 border border-slate-800 rounded-md opacity-40 pointer-events-none flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Explain Investigation</span>
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Workbench is reset. Run a scenario to generate a deterministic summary, export a JSON report, or run the AI Evidence Explainer.
        </p>
      </section>
    );
  }

  const { deterministicSummary, scenario } = runResult;

  return (
    <section
      aria-labelledby="summary-heading"
      className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-3.5">
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
            Computed strictly from canonical validation, detection, reconstruction, and benchmark structures.
          </p>
        </div>

        {/* Download Report & Explain Investigation Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadReport}
            aria-label={`Download JSON report for ${scenario.code}`}
            className="px-3 py-1.5 text-xs font-medium text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>Download Report</span>
          </button>

          <button
            type="button"
            onClick={() => void requestExplanation()}
            disabled={isExplaining}
            aria-label="Explain Investigation"
            className="px-3 py-1.5 text-xs font-medium text-sky-100 bg-sky-950/90 hover:bg-sky-900 disabled:opacity-50 border border-sky-500/60 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" />
            <span>
              {isExplaining ? 'Generating Explanation...' : 'Explain Investigation'}
            </span>
          </button>
        </div>
      </div>

      {lastDownloadedFile && (
        <div
          role="status"
          className="bg-emerald-950/35 border border-emerald-700/60 rounded-md px-3.5 py-2 text-xs text-emerald-200 flex items-center justify-between gap-2 font-mono"
        >
          <span>Exported JSON report: {lastDownloadedFile}</span>
          <span>Scenario: {scenario.code}</span>
        </div>
      )}

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

      {/* Optional AI Evidence Explainer Panel */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              <span>AI Evidence Explainer (Optional · Read-Only on Computed Results)</span>
            </div>
            <p className="text-[11px] text-amber-300/90">
              AI-GENERATED / FALLBACK EXPLANATION · Based strictly on synthetic demonstration data · Never modifies alerts, paths, or benchmark metrics.
            </p>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Model:</span>
            <select
              aria-label="Select Gemini explainer model"
              value={selectedModel}
              onChange={(e) =>
                setSelectedModel(e.target.value as ExplainerModelChoice)
              }
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-sky-400"
            >
              <option value="gemini-3.8-flash">gemini-3.8-flash (General)</option>
              <option value="gemini-3.1-flash-lite">
                gemini-3.1-flash-lite (Fast)
              </option>
              <option value="gemini-4-argon">gemini-4-argon (Complex)</option>
            </select>
          </label>
        </div>

        {fallbackNotice && (
          <div
            role="note"
            className="bg-slate-900/90 border border-amber-700/60 rounded px-3 py-2 text-xs text-amber-200"
          >
            Note: {fallbackNotice}
          </div>
        )}

        {messages.length > 0 && (
          <div
            aria-label="AI Evidence Explainer conversation thread"
            className="max-h-72 overflow-y-auto space-y-2.5 bg-[#090d14] border border-slate-800 rounded-md p-3 text-xs"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded border ${
                  msg.role === 'user'
                    ? 'bg-slate-900/80 border-slate-800 text-slate-200'
                    : 'bg-sky-950/20 border-sky-900/60 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400 mb-1.5">
                  <span>
                    {msg.role === 'user'
                      ? 'ANALYST QUERY'
                      : msg.source === 'gemini'
                      ? `AI-GENERATED (${msg.modelName}) · SYNTHETIC DATA`
                      : 'DETERMINISTIC FALLBACK EXPLAINER · SYNTHETIC DATA'}
                  </span>
                  <span>
                    {msg.timestamp.replace('T', ' ').slice(0, 19)} UTC
                  </span>
                </div>
                <pre className="whitespace-pre-wrap font-sans leading-relaxed text-xs text-slate-200 m-0">
                  {msg.text}
                </pre>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleFollowUpSubmit} className="flex items-center gap-2">
          <input
            type="text"
            aria-label="Ask follow-up question about current scenario evidence"
            placeholder={`Ask about ${scenario.code} alerts, supported edges, or unconfirmed gaps...`}
            value={followUpInput}
            onChange={(e) => setFollowUpInput(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-sky-400"
          />
          <button
            type="submit"
            disabled={isExplaining || !followUpInput.trim()}
            aria-label="Send explainer question"
            className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 rounded flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>Ask Explainer</span>
          </button>
        </form>
      </div>
    </section>
  );
}
