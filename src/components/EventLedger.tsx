import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  CopyX,
  ListFilter,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { ScenarioRunResult, SelectedEntity, SimulatedEvent } from '../domain/types';
import {
  LedgerSortOrder,
  LedgerStatusFilter,
} from '../state/useInvestigation';

interface EventLedgerProps {
  runResult: ScenarioRunResult | null;
  selectedEntity: SelectedEntity;
  onSelectEntity: (entity: SelectedEntity) => void;
  sessionFilter: string;
  onChangeSessionFilter: (session: string) => void;
  statusFilter: LedgerStatusFilter;
  onChangeStatusFilter: (status: LedgerStatusFilter) => void;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  sortOrder: LedgerSortOrder;
  onChangeSortOrder: (order: LedgerSortOrder) => void;
  showDeduplicated: boolean;
  onToggleShowDeduplicated: (show: boolean) => void;
}

interface LedgerRowItem {
  event: SimulatedEvent;
  statusKind: 'decoy_flagged' | 'confirmed_hop' | 'unconfirmed_or_filtered';
  statusLabel: string;
  ruleOrDetail: string;
}

export function EventLedger({
  runResult,
  selectedEntity,
  onSelectEntity,
  sessionFilter,
  onChangeSessionFilter,
  statusFilter,
  onChangeStatusFilter,
  searchQuery,
  onChangeSearchQuery,
  sortOrder,
  onChangeSortOrder,
  showDeduplicated,
  onToggleShowDeduplicated,
}: EventLedgerProps) {
  if (!runResult) {
    return (
      <section
        id="event-ledger"
        aria-labelledby="event-ledger-heading"
        className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-3"
      >
        <h2
          id="event-ledger-heading"
          className="text-base font-semibold text-slate-100 flex items-center gap-2"
        >
          <ListFilter className="w-4 h-4 text-sky-400" aria-hidden="true" />
          <span>Synthetic Event Ledger</span>
        </h2>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-md p-6 text-center text-sm text-slate-400">
          Workbench is reset. Run a scenario to populate the synthetic event ledger.
        </div>
      </section>
    );
  }

  const { validation, alerts, reconstruction } = runResult;

  const alertByEventId = new Map(
    alerts.flatMap((a) => a.supportingEventIds.map((id) => [id, a] as const))
  );
  const confirmedEventIds = new Set(
    reconstruction.predictedEdges.flatMap((e) => e.supportingEventIds)
  );
  const issueByEventId = new Map(
    validation.issues.map((iss) => [iss.eventId, iss] as const)
  );

  const distinctSessions = Array.from(
    new Set(validation.validEvents.map((e) => e.sessionId))
  );

  // Build unified row list from canonical validation result
  const baseEvents = showDeduplicated
    ? [
        ...validation.validEvents,
        ...validation.deduplicatedEvents,
        ...validation.rejectedEvents,
      ]
    : [...validation.validEvents];

  const rows: LedgerRowItem[] = baseEvents.map((event) => {
    const issue = issueByEventId.get(event.id);
    const alert = alertByEventId.get(event.id);
    const isConfirmed = confirmedEventIds.has(event.id);

    if (issue) {
      return {
        event,
        statusKind: 'unconfirmed_or_filtered',
        statusLabel:
          issue.kind === 'duplicate' ? 'Duplicate Filtered' : 'Invalid Rejected',
        ruleOrDetail: issue.duplicateOfEventId
          ? `Dup of ${issue.duplicateOfEventId}`
          : issue.kind,
      };
    }

    if (alert) {
      return {
        event,
        statusKind: 'decoy_flagged',
        statusLabel: 'Decoy Alert Fired',
        ruleOrDetail: `${alert.id} (${alert.ruleId})`,
      };
    }

    if (isConfirmed) {
      return {
        event,
        statusKind: 'confirmed_hop',
        statusLabel: 'Confirmed Hop',
        ruleOrDetail: 'Topology + Session Verified',
      };
    }

    return {
      event,
      statusKind: 'unconfirmed_or_filtered',
      statusLabel: 'Unconfirmed / Spoof Rejected',
      ruleOrDetail: 'Topology Violation',
    };
  });

  // Apply filters
  const filteredRows = rows.filter((row) => {
    if (sessionFilter !== 'all' && row.event.sessionId !== sessionFilter) {
      return false;
    }
    if (statusFilter !== 'all' && row.statusKind !== statusFilter) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const match =
        row.event.id.toLowerCase().includes(q) ||
        row.event.sessionId.toLowerCase().includes(q) ||
        row.event.sourceNodeId.toLowerCase().includes(q) ||
        row.event.destinationNodeId.toLowerCase().includes(q) ||
        row.event.eventType.toLowerCase().includes(q) ||
        row.event.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  if (sortOrder === 'desc') {
    filteredRows.reverse();
  }

  return (
    <section
      id="event-ledger"
      aria-labelledby="event-ledger-heading"
      className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div>
          <h2
            id="event-ledger-heading"
            className="text-base font-semibold text-slate-100 flex items-center gap-2"
          >
            <ListFilter className="w-4 h-4 text-sky-400" aria-hidden="true" />
            <span>
              Deterministic Event Ledger ({filteredRows.length} shown)
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Duplicate Identity Key Policy: {validation.duplicatePolicyFormula}
          </p>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search event ledger"
              placeholder="Filter ID, node, type..."
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-400 w-44"
            />
          </div>

          <label className="flex items-center gap-1.5 text-slate-300">
            <span className="sr-only">Filter by session</span>
            <select
              aria-label="Filter by session"
              value={sessionFilter}
              onChange={(e) => onChangeSessionFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-400"
            >
              <option value="all">All Sessions ({distinctSessions.length})</option>
              {distinctSessions.map((sess) => (
                <option key={sess} value={sess}>
                  Session: {sess}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-slate-300">
            <span className="sr-only">Filter by detection status</span>
            <select
              aria-label="Filter by detection status"
              value={statusFilter}
              onChange={(e) =>
                onChangeStatusFilter(e.target.value as LedgerStatusFilter)
              }
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-400"
            >
              <option value="all">All Statuses</option>
              <option value="decoy_flagged">Decoy Alert Fired</option>
              <option value="confirmed_hop">Confirmed Hop</option>
              <option value="unconfirmed_or_filtered">
                Unconfirmed / Duplicate
              </option>
            </select>
          </label>

          <button
            type="button"
            onClick={() =>
              onChangeSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
            }
            aria-label={`Sort events by timestamp ${
              sortOrder === 'asc' ? 'descending' : 'ascending'
            }`}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <ArrowDownUp className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>
              {sortOrder === 'asc' ? 'Time Asc (ID Tie-Break)' : 'Time Desc'}
            </span>
          </button>

          <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-300 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showDeduplicated}
              onChange={(e) => onToggleShowDeduplicated(e.target.checked)}
              className="rounded border-slate-600"
            />
            <span>Include Duplicates ({validation.deduplicatedEvents.length})</span>
          </label>
        </div>
      </div>

      {/* Responsive Event Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 font-medium">
              <th className="py-2.5 px-3 whitespace-nowrap">Timestamp (UTC)</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Event ID</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Session ID</th>
              <th className="py-2.5 px-3 whitespace-nowrap">
                Source → Destination
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap">Event Type</th>
              <th className="py-2.5 px-3 whitespace-nowrap">
                Detection &amp; Evidence Status
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap">Rule / Provenance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 px-4 text-center font-sans text-slate-400"
                >
                  No synthetic event records match the current filter criteria.
                </td>
              </tr>
            ) : (
              filteredRows.map(({ event, statusKind, statusLabel, ruleOrDetail }) => {
                const isSelected =
                  selectedEntity?.kind === 'event' &&
                  selectedEntity.id === event.id;

                return (
                  <tr
                    key={`${event.id}-${statusLabel}`}
                    onClick={() =>
                      onSelectEntity({ kind: 'event', id: event.id })
                    }
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectEntity({ kind: 'event', id: event.id });
                      }
                    }}
                    aria-label={`Event ${event.id} from ${event.sourceNodeId} to ${event.destinationNodeId}, status ${statusLabel}`}
                    className={`cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
                      isSelected
                        ? 'bg-sky-950/50 text-slate-100'
                        : 'bg-[#0b101b] hover:bg-slate-900/80 text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-3 tabular-nums whitespace-nowrap text-slate-400">
                      {event.timestamp.replace('T', ' ').replace('Z', '')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-100 whitespace-nowrap">
                      {event.id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      {event.sessionId}
                    </td>
                    <td className="py-2.5 px-3 text-sky-300 whitespace-nowrap">
                      {event.sourceNodeId} → {event.destinationNodeId}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      {event.eventType}
                    </td>
                    <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                      {statusKind === 'decoy_flagged' ? (
                        <span className="inline-flex items-center gap-1.5 text-rose-300 font-semibold">
                          <ShieldAlert
                            className="w-3.5 h-3.5 text-rose-400 shrink-0"
                            aria-hidden="true"
                          />
                          <span>{statusLabel}</span>
                        </span>
                      ) : statusKind === 'confirmed_hop' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-300 font-medium">
                          <CheckCircle2
                            className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                            aria-hidden="true"
                          />
                          <span>{statusLabel}</span>
                        </span>
                      ) : statusLabel.includes('Duplicate') ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-300">
                          <CopyX
                            className="w-3.5 h-3.5 text-amber-400 shrink-0"
                            aria-hidden="true"
                          />
                          <span>{statusLabel}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-300">
                          <AlertTriangle
                            className="w-3.5 h-3.5 text-amber-400 shrink-0"
                            aria-hidden="true"
                          />
                          <span>{statusLabel}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {ruleOrDetail} · {event.provenance}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
