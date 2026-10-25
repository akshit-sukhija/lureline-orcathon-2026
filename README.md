# Lureline — Evidence-First Cyber Deception Investigation Workbench

> **SIMULATION LAB · Synthetic events only · No live network monitoring.**

Lureline is an evidence-first cyber deception investigation workbench built for the **ORCATHON 2026 Cybersecurity & Blockchain** problem statement. It ingests deterministic synthetic event streams across a simulated six-node network (four ordinary assets and two decoy assets), detects decoy interactions using transparent rules, reconstructs movement paths strictly when backed by event records and valid network topology, reports explicit uncertainty when intermediate evidence is missing, and evaluates reconstruction accuracy against isolated ground truth and a Naive Baseline comparator.

---

## 1. Architecture & Module Separation

The codebase strictly separates pure domain logic from React UI rendering:

- **`src/domain/types.ts`** — Explicit TypeScript interfaces (`NetworkNode`, `NetworkEdge`, `SimulatedEvent`, `DetectionRule`, `Alert`, `ScenarioDefinition`, `ReconstructedEdge`, `UnresolvedGap`, `ReconstructionResult`, `BenchmarkResult`, `ScenarioRunResult`).
- **`src/data/scenarios.ts`** — Six fictional network nodes (`workstation-04`, `jump-host-01`, `fileshare-01`, `app-srv-02`, and two decoys `decoy-db-01`, `decoy-cred-vault`), eight allowed directed topology edges (`TOPO-01`..`TOPO-08`), four deterministic scenarios (`SCENARIO-A`..`SCENARIO-D`), and a separate `SCENARIO_GROUND_TRUTH` map isolated from the detection and reconstruction engines.
- **`src/engine/validateEvents.ts`** — Required-field validation, node-reference validation, deterministic timestamp sorting with lexicographical event-ID tie-breaker, and exact structural deduplication using the documented key `scenarioId|sessionId|sourceNodeId|destinationNodeId|eventType|timestamp`.
- **`src/engine/detect.ts`** — Pure deterministic decoy detection rules (`RULE-DECOY-DEST-01`, `RULE-DECOY-CANARY-02`). Flags validated events targeting nodes where `isDecoy === true` on valid topology routes. Every alert cites its exact supporting `eventId` and `ruleId`.
- **`src/engine/reconstruct.ts`** — Evidence-backed path reconstruction. Groups events by `sessionId` (never linking events across different sessions), verifies each transition against `NETWORK_TOPOLOGY_EDGES`, checks intra-session node continuity, and refuses to fabricate missing intermediate hops—recording an explicit `UnresolvedGap` (`"Insufficient evidence to confirm this connection."`).
- **`src/engine/baseline.ts`** — Intentionally simplistic **Naive Baseline** comparator that connects consecutive session events after timestamp sorting without verifying network topology or continuity gaps.
- **`src/engine/evaluate.ts`** — Compares Lureline and Naive Baseline predicted edge sets against `SCENARIO_GROUND_TRUTH` *only after* reconstruction completes. Computes True Positives (`TP`), False Positives (`FP`), Missed Edges (`FN`), `Precision = TP / (TP + FP)`, and `Recall = TP / (TP + FN)` with safe zero-denominator handling (`N/A`).
- **`src/engine/runScenario.ts`** — Orchestrates the canonical `ScenarioRunResult` and deterministic plain-language summary (no LLM).
- **`src/state/useInvestigation.ts`** — Manages selected scenario, step-by-step replay, reset state, ledger filters/sorting, and the single shared `selectedEntity` inspector state.
- **`src/components/`** — `SimulationNotice`, `IncidentHeader`, `NetworkGraph`, `AlertPanel`, `EvidenceInspector`, `EventLedger`, `BenchmarkPanel`, and `InvestigationSummary`.
- **`src/tests/engine.test.ts`** — Node test runner suite (`node:test` + `node:assert/strict`) covering all four scenarios, deduplication, tie-breaker ordering, session isolation, incomplete evidence, and zero-denominator metric math.

---

## 2. Four Repeatable Investigation Scenarios

| Scenario | Description | Expected Outcome |
| :--- | :--- | :--- |
| **Scenario A (`SCENARIO-A`)** | Confirmed decoy interaction across a contiguous 3-hop chain (`workstation-04 → jump-host-01 → app-srv-02 → decoy-db-01`). | Fires `ALT-A-001` referencing `EVT-A-003` and `RULE-DECOY-DEST-01`; reconstructs 3 confirmed edges; Precision 100%, Recall 100%. |
| **Scenario B (`SCENARIO-B`)** | Routine administrative and file-share operations across ordinary assets only (`sess-b-ops-10`, `sess-b-build-22`). | Fires **0** decoy alerts; reconstructs 3 ordinary edges across 2 isolated sessions; Precision 100%, Recall 100%. |
| **Scenario C (`SCENARIO-C`)** | Incomplete evidence: intermediate hop `jump-host-01 → app-srv-02` is missing from telemetry. | Lureline refuses to fabricate `jump-host-01 → app-srv-02`, reports `"Insufficient evidence to confirm this connection."` (`FN = 1`, Recall `66.7%`, Precision `100%`). Naive Baseline blindly connects consecutive session events (`Recall = 100%`). |
| **Scenario D (`SCENARIO-D`)** | Out-of-order timestamps, exact duplicate record (`EVT-D-003-DUP`), timestamp tie (`EVT-D-002A` vs `EVT-D-002B`), concurrent unrelated session (`sess-d-backup-88`), and non-topological spoof (`EVT-D-SPOOF`). | Eliminates 1 duplicate, sorts deterministically, isolates sessions, rejects spoofed hop (`Lureline Precision = 100%` vs `Naive Baseline Precision = 66.7%` with 2 FPs). |

---

## 3. Metric Definitions & Limitations

- **True Positives (TP):** Directed edges `sourceNodeId->destinationNodeId` present in both the method's predicted edge set and the scenario's expected ground-truth edge set.
- **False Positives (FP):** Directed edges predicted by the method that do not exist in the scenario's ground truth.
- **False Negatives / Missed Edges (FN):** Expected ground-truth edges that were not predicted by the method.
- **Precision:** `TP / (TP + FP)` when `TP + FP > 0`; otherwise `N/A`.
- **Recall:** `TP / (TP + FN)` when `TP + FN > 0`; otherwise `N/A`.
- **Synthetic Limitation:** All events, topology rules, and ground-truth sets are controlled synthetic fixtures designed to validate evidence-tracking and path-reconstruction invariants. They do not measure real-world intrusion detection accuracy.

---

## 4. Local Development, Testing & Vercel Deployment

### Run Locally
```bash
npm install
npm run dev
```

### Run Unit Tests & TypeScript Verification
```bash
npm test
npm run lint
npm run build
```

### Deploy to Vercel
1. Push this repository to GitHub.
2. In Vercel, click **Add New Project** and import the GitHub repository.
3. Use default Vite settings:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Environment Variables:** None required (100% static client-side bundle).
4. Click **Deploy**.
