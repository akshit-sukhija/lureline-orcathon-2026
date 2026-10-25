import { useCallback, useMemo, useState } from 'react';
import {
  DETECTION_RULES,
  NETWORK_NODES,
  NETWORK_TOPOLOGY_EDGES,
  SCENARIOS,
} from '../data/scenarios';
import {
  ScenarioDefinition,
  ScenarioRunResult,
  SelectedEntity,
} from '../domain/types';
import { executeScenario } from '../engine/runScenario';

export type LedgerStatusFilter =
  | 'all'
  | 'decoy_flagged'
  | 'confirmed_hop'
  | 'unconfirmed_or_filtered';

export type LedgerSortOrder = 'asc' | 'desc';

export function useInvestigation() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    SCENARIOS[0].id
  );
  const [isReset, setIsReset] = useState<boolean>(false);
  const [runCount, setRunCount] = useState<number>(1);
  const [replayStepCount, setReplayStepCount] = useState<number | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>({
    kind: 'alert',
    id: 'ALT-A-001',
  });

  // Event Ledger filters
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<LedgerStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<LedgerSortOrder>('asc');
  const [showDeduplicatedInLedger, setShowDeduplicatedInLedger] =
    useState<boolean>(true);

  const selectedScenario: ScenarioDefinition = useMemo(() => {
    return (
      SCENARIOS.find((s) => s.id === selectedScenarioId) ?? SCENARIOS[0]
    );
  }, [selectedScenarioId]);

  // Effective scenario (either full event stream or sliced for step-by-step replay)
  const effectiveScenario: ScenarioDefinition = useMemo(() => {
    if (replayStepCount === null) {
      return selectedScenario;
    }
    // Sort raw events or slice up to replayStepCount of raw events
    return {
      ...selectedScenario,
      events: selectedScenario.events.slice(0, replayStepCount),
    };
  }, [selectedScenario, replayStepCount]);

  // Canonical run result derived purely from the domain engine
  const runResult: ScenarioRunResult | null = useMemo(() => {
    if (isReset) {
      return null;
    }
    return executeScenario(
      effectiveScenario,
      NETWORK_NODES,
      NETWORK_TOPOLOGY_EDGES,
      DETECTION_RULES
    );
  }, [effectiveScenario, isReset]);

  const selectScenario = useCallback((scenarioId: string) => {
    const target = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
    setSelectedScenarioId(target.id);
    setIsReset(false);
    setReplayStepCount(null);
    setSessionFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
    setSortOrder('asc');
    setRunCount((c) => c + 1);

    // Pre-select the primary finding (first alert, first gap, or first edge)
    const freshResult = executeScenario(target);
    if (freshResult.alerts.length > 0) {
      setSelectedEntity({ kind: 'alert', id: freshResult.alerts[0].id });
    } else if (freshResult.reconstruction.unresolvedGaps.length > 0) {
      setSelectedEntity({
        kind: 'gap',
        id: freshResult.reconstruction.unresolvedGaps[0].id,
      });
    } else if (freshResult.reconstruction.predictedEdges.length > 0) {
      setSelectedEntity({
        kind: 'edge',
        edgeKey: freshResult.reconstruction.predictedEdges[0].edgeKey,
      });
    } else if (freshResult.validation.validEvents.length > 0) {
      setSelectedEntity({
        kind: 'event',
        id: freshResult.validation.validEvents[0].id,
      });
    } else {
      setSelectedEntity(null);
    }
  }, []);

  const runOrRerunScenario = useCallback(() => {
    setIsReset(false);
    setReplayStepCount(null);
    setRunCount((c) => c + 1);
    const freshResult = executeScenario(selectedScenario);
    if (freshResult.alerts.length > 0) {
      setSelectedEntity({ kind: 'alert', id: freshResult.alerts[0].id });
    } else if (freshResult.reconstruction.unresolvedGaps.length > 0) {
      setSelectedEntity({
        kind: 'gap',
        id: freshResult.reconstruction.unresolvedGaps[0].id,
      });
    } else if (freshResult.reconstruction.predictedEdges.length > 0) {
      setSelectedEntity({
        kind: 'edge',
        edgeKey: freshResult.reconstruction.predictedEdges[0].edgeKey,
      });
    } else {
      setSelectedEntity(null);
    }
  }, [selectedScenario]);

  const resetWorkbench = useCallback(() => {
    setIsReset(true);
    setReplayStepCount(null);
    setSelectedEntity(null);
    setSessionFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
    setSortOrder('asc');
  }, []);

  const stepReplayForward = useCallback(() => {
    setIsReset(false);
    const totalRaw = selectedScenario.events.length;
    setReplayStepCount((prev) => {
      const next = prev === null ? 1 : prev >= totalRaw ? null : prev + 1;
      return next;
    });
  }, [selectedScenario.events.length]);

  return {
    scenarios: SCENARIOS,
    nodes: NETWORK_NODES,
    topologyEdges: NETWORK_TOPOLOGY_EDGES,
    rules: DETECTION_RULES,
    selectedScenario,
    selectedScenarioId,
    isReset,
    runCount,
    replayStepCount,
    runResult,
    selectedEntity,
    setSelectedEntity,
    selectScenario,
    runOrRerunScenario,
    resetWorkbench,
    stepReplayForward,
    // Ledger filter state
    sessionFilter,
    setSessionFilter,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    showDeduplicatedInLedger,
    setShowDeduplicatedInLedger,
  };
}
