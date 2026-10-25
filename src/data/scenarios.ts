import {
  DetectionRule,
  NetworkEdge,
  NetworkNode,
  ScenarioDefinition,
  ScenarioGroundTruth,
} from '../domain/types';

/**
 * Six fictional network nodes: four ordinary enterprise assets and two decoy assets.
 */
export const NETWORK_NODES: NetworkNode[] = [
  {
    id: 'workstation-04',
    label: 'Endpoint WS-04',
    hostname: 'ws-04.corp.sim.local',
    ipAddress: '10.10.4.14',
    zone: 'User Subnet',
    role: 'ordinary',
    isDecoy: false,
    description: 'Standard developer workstation in the simulated user access subnet.',
    x: 95,
    y: 215,
  },
  {
    id: 'jump-host-01',
    label: 'Bastion Jump-01',
    hostname: 'bastion-01.ops.sim.local',
    ipAddress: '10.20.1.10',
    zone: 'Operations Tier',
    role: 'ordinary',
    isDecoy: false,
    description: 'Administrative SSH jump host mediating access between user endpoints and internal tiers.',
    x: 315,
    y: 120,
  },
  {
    id: 'fileshare-01',
    label: 'Eng FileShare-01',
    hostname: 'fs-01.corp.sim.local',
    ipAddress: '10.30.1.50',
    zone: 'Storage Tier',
    role: 'ordinary',
    isDecoy: false,
    description: 'Ordinary SMB document repository used for routine engineering build artifacts.',
    x: 315,
    y: 320,
  },
  {
    id: 'app-srv-02',
    label: 'Internal API-02',
    hostname: 'api-02.app.sim.local',
    ipAddress: '10.20.2.22',
    zone: 'Application Tier',
    role: 'ordinary',
    isDecoy: false,
    description: 'Internal microservice gateway handling authenticated service-to-service requests.',
    x: 560,
    y: 120,
  },
  {
    id: 'decoy-db-01',
    label: 'Decoy Billing DB',
    hostname: 'fin-db-mirror.deception.sim.local',
    ipAddress: '10.99.1.100',
    zone: 'Deception Enclave',
    role: 'decoy',
    isDecoy: true,
    description: 'Synthetic decoy database seeded with non-production ledger schema. Zero legitimate production services query this host.',
    x: 790,
    y: 120,
  },
  {
    id: 'decoy-cred-vault',
    label: 'Decoy Key Vault',
    hostname: 'vault-canary.deception.sim.local',
    ipAddress: '10.99.2.200',
    zone: 'Deception Enclave',
    role: 'decoy',
    isDecoy: true,
    description: 'Synthetic credential vault canary asset. Any read request to this node indicates unauthorized traversal into a deception trap.',
    x: 740,
    y: 320,
  },
];

/**
 * Allowed directed network topology edges in the simulated environment.
 * Reconstruction requires both supporting event telemetry AND a valid topology route.
 */
export const NETWORK_TOPOLOGY_EDGES: NetworkEdge[] = [
  {
    id: 'TOPO-01',
    sourceNodeId: 'workstation-04',
    destinationNodeId: 'jump-host-01',
    protocol: 'SSH / TCP 22',
    description: 'Authorized administrative bastion access from user subnet.',
  },
  {
    id: 'TOPO-02',
    sourceNodeId: 'workstation-04',
    destinationNodeId: 'fileshare-01',
    protocol: 'SMB / TCP 445',
    description: 'Direct workstation mount to engineering shared storage.',
  },
  {
    id: 'TOPO-03',
    sourceNodeId: 'jump-host-01',
    destinationNodeId: 'app-srv-02',
    protocol: 'HTTPS / TCP 8443',
    description: 'Operations jump host to internal application gateway.',
  },
  {
    id: 'TOPO-04',
    sourceNodeId: 'jump-host-01',
    destinationNodeId: 'fileshare-01',
    protocol: 'SMB / TCP 445',
    description: 'Operations jump host backup verification access to storage.',
  },
  {
    id: 'TOPO-05',
    sourceNodeId: 'jump-host-01',
    destinationNodeId: 'decoy-db-01',
    protocol: 'PostgreSQL / TCP 5432',
    description: 'Exposed deception route from bastion host to decoy billing database.',
  },
  {
    id: 'TOPO-06',
    sourceNodeId: 'app-srv-02',
    destinationNodeId: 'decoy-db-01',
    protocol: 'PostgreSQL / TCP 5432',
    description: 'Deception connection string planted on internal API server pointing to decoy DB.',
  },
  {
    id: 'TOPO-07',
    sourceNodeId: 'app-srv-02',
    destinationNodeId: 'decoy-cred-vault',
    protocol: 'HTTPS / TCP 443',
    description: 'Deception route from application gateway to canary key vault.',
  },
  {
    id: 'TOPO-08',
    sourceNodeId: 'fileshare-01',
    destinationNodeId: 'decoy-cred-vault',
    protocol: 'HTTPS / TCP 443',
    description: 'Deception breadcrumb in shared storage pointing to canary key vault.',
  },
];

/**
 * Transparent, deterministic detection rules.
 */
export const DETECTION_RULES: DetectionRule[] = [
  {
    id: 'RULE-DECOY-DEST-01',
    name: 'Direct Decoy Asset Interaction',
    severity: 'high',
    description:
      'Flags any validated synthetic event whose destination node is explicitly designated as a decoy asset (isDecoy === true) in the topology registry.',
    logicSummary: 'destinationNode.isDecoy === true && eventType !== "CANARY_VAULT_READ"',
  },
  {
    id: 'RULE-DECOY-CANARY-02',
    name: 'Decoy Canary Credential Vault Read',
    severity: 'high',
    description:
      'Flags explicit read attempts against a decoy credential vault node where synthetic canary secrets are hosted.',
    logicSummary: 'destinationNode.isDecoy === true && eventType === "CANARY_VAULT_READ"',
  },
];

/**
 * Four repeatable synthetic scenarios required by the specification.
 */
export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'scenario-a-decoy',
    code: 'SCENARIO-A',
    title: 'Scenario A — Confirmed Decoy Interaction',
    subtitle: 'Contiguous 3-hop lateral movement reaching a designated decoy database',
    category: 'Decoy Trigger & Full Provenance',
    description:
      'A single synthetic session originates at Endpoint WS-04, traverses Bastion Jump-01 and Internal API-02, and executes a query against Decoy Billing DB. All intermediate hops have complete, ordered event records on valid topology edges.',
    analystObjective:
      'Verify that the decoy interaction triggers a transparent alert linked to EVT-A-003 and RULE-DECOY-DEST-01, and that every reconstructed edge cites its supporting event ID.',
    expectedBehaviorSummary:
      '1 high-severity decoy alert (EVT-A-003); 3 confirmed path edges; 0 unresolved gaps; Lureline and Naive Baseline match ground truth (Precision 100%, Recall 100%).',
    events: [
      {
        id: 'EVT-A-001',
        scenarioId: 'scenario-a-decoy',
        timestamp: '2026-10-25T08:00:02.000Z',
        sessionId: 'sess-a-401',
        sourceNodeId: 'workstation-04',
        destinationNodeId: 'jump-host-01',
        eventType: 'SSH_SESSION_OPEN',
        description: 'Synthetic SSH session opened from Endpoint WS-04 to Bastion Jump-01.',
        provenance: 'synthetic',
      },
      {
        id: 'EVT-A-002',
        scenarioId: 'scenario-a-decoy',
        timestamp: '2026-10-25T08:00:19.000Z',
        sessionId: 'sess-a-401',
        sourceNodeId: 'jump-host-01',
        destinationNodeId: 'app-srv-02',
        eventType: 'API_TOKEN_REQUEST',
        description: 'Internal service token requested from Bastion Jump-01 to Internal API-02.',
        provenance: 'synthetic',
      },
      {
        id: 'EVT-A-003',
        scenarioId: 'scenario-a-decoy',
        timestamp: '2026-10-25T08:00:44.000Z',
        sessionId: 'sess-a-401',
        sourceNodeId: 'app-srv-02',
        destinationNodeId: 'decoy-db-01',
        eventType: 'DB_QUERY_EXEC',
        description: 'SQL schema enumeration query executed from Internal API-02 against Decoy Billing DB.',
        provenance: 'synthetic',
      },
    ],
  },
  {
    id: 'scenario-b-normal',
    code: 'SCENARIO-B',
    title: 'Scenario B — Normal Activity (Zero Decoy Alerts)',
    subtitle: 'Routine administrative and file-share operations across ordinary assets only',
    category: 'False-Positive Resistance',
    description:
      'Two legitimate synthetic sessions perform routine operations between Endpoint WS-04, Bastion Jump-01, Internal API-02, and Eng FileShare-01. Neither session interacts with any decoy asset.',
    analystObjective:
      'Confirm that legitimate synthetic traffic across ordinary nodes generates zero decoy alerts and is never misclassified as malicious.',
    expectedBehaviorSummary:
      '0 decoy alerts fired; 3 confirmed ordinary path edges across 2 isolated sessions; 0 unresolved gaps; Precision 100%, Recall 100%.',
    events: [
      {
        id: 'EVT-B-001',
        scenarioId: 'scenario-b-normal',
        timestamp: '2026-10-25T09:15:00.000Z',
        sessionId: 'sess-b-ops-10',
        sourceNodeId: 'workstation-04',
        destinationNodeId: 'jump-host-01',
        eventType: 'SSH_SESSION_OPEN',
        description: 'Scheduled maintenance SSH login from Endpoint WS-04 to Bastion Jump-01.',
        provenance: 'synthetic',
      },
      {
        id: 'EVT-B-002',
        scenarioId: 'scenario-b-normal',
        timestamp: '2026-10-25T09:15:12.000Z',
        sessionId: 'sess-b-ops-10',
        sourceNodeId: 'jump-host-01',
        destinationNodeId: 'app-srv-02',
        eventType: 'HEARTBEAT_SYNC',
        description: 'Routine health check probe from Bastion Jump-01 to Internal API-02.',
        provenance: 'synthetic',
      },
      {
        id: 'EVT-B-003',
        scenarioId: 'scenario-b-normal',
        timestamp: '2026-10-25T09:15:25.000Z',
        sessionId: 'sess-b-build-22',
        sourceNodeId: 'workstation-04',
        destinationNodeId: 'fileshare-01',
        eventType: 'SMB_SHARE_MOUNT',
        description: 'Developer workstation mounting Eng FileShare-01 for release package archive.',
        provenance: 'synthetic',
      },
    ],
  },
  {
    id: 'scenario-c-incomplete',
    code: 'SCENARIO-C',
    title: 'Scenario C — Incomplete Evidence (Missing Hop)',
    subtitle: 'Missing intermediate telemetry between Bastion Jump-01 and Internal API-02',
    category: 'Uncertainty & Anti-Fabrication',
    description:
      'Session sess-c-707 is observed entering Bastion Jump-01 from Endpoint WS-04 (EVT-C-001) and later reading from Decoy Key Vault originating at Internal API-02 (EVT-C-002). The intermediate transition from Bastion Jump-01 to Internal API-02 was not recorded in telemetry.',
    analystObjective:
      'Verify that Lureline refuses to invent the unrecorded jump-host-01 → app-srv-02 edge, explicitly reports "Insufficient evidence to confirm this connection.", and records 1 missed edge (FN) in the ground-truth benchmark while Naive Baseline blindly guesses the gap.',
    expectedBehaviorSummary:
      '1 decoy alert (EVT-C-002); 2 confirmed edges; 1 explicit Unresolved Gap (jump-host-01 → app-srv-02); Lureline Recall 66.7% (honest miss) vs Naive Baseline Recall 100.0% (unverified consecutive guess).',
    events: [
      {
        id: 'EVT-C-001',
        scenarioId: 'scenario-c-incomplete',
        timestamp: '2026-10-25T10:30:05.000Z',
        sessionId: 'sess-c-707',
        sourceNodeId: 'workstation-04',
        destinationNodeId: 'jump-host-01',
        eventType: 'SSH_SESSION_OPEN',
        description: 'Initial session connection observed from Endpoint WS-04 to Bastion Jump-01.',
        provenance: 'synthetic',
      },
      {
        id: 'EVT-C-002',
        scenarioId: 'scenario-c-incomplete',
        timestamp: '2026-10-25T10:31:40.000Z',
        sessionId: 'sess-c-707',
        sourceNodeId: 'app-srv-02',
        destinationNodeId: 'decoy-cred-vault',
        eventType: 'CANARY_VAULT_READ',
        description: 'Canary secret read request originating from Internal API-02 to Decoy Key Vault after a 95-second telemetry gap.',
        provenance: 'synthetic',
      },
    ],
  },
  {
    id: 'scenario-d-noisy',
    code: 'SCENARIO-D',
    title: 'Scenario D — Noisy & Adversarial Records',
    subtitle: 'Out-of-order timestamps, exact duplicate record, interleaved sessions, and invalid-topology spoof',
    category: 'Deduplication, Ordering & Session Isolation',
    description:
      'Contains out-of-order event timestamps, an exact duplicate decoy event (EVT-D-003-DUP), a timestamp tie requiring deterministic ID tie-breaking, an interleaved unrelated session (sess-d-backup-88) within 2 seconds, and a spoofed telemetry event (EVT-D-SPOOF) attempting an impossible direct hop from Eng FileShare-01 to Decoy Billing DB.',
    analystObjective:
      'Verify deterministic timestamp + ID sorting, documented duplicate key elimination, strict session isolation between sess-d-probe-01 and sess-d-backup-88, and rejection of the non-topological spoofed hop.',
    expectedBehaviorSummary:
      '1 duplicate removed; 6 valid events sorted deterministically; 2 isolated sessions; 1 topology-violating spoof rejected as unconfirmed; Lureline Precision 100% (0 FP) vs Naive Baseline Precision 60% (2 FP).',
    events: [
      {
        id: 'EVT-D-003',
        scenarioId: 'scenario-d-noisy',
        timestamp: '2026-10-25T11:45:30.000Z',
        sessionId: 'sess-d-probe-01',
        sourceNodeId: 'jump-host-01',
        destinationNodeId: 'decoy-db-01',
        eventType: 'DB_QUERY_EXEC',
        description: 'Out-of-order record: query from Bastion Jump-01 to Decoy Billing DB.',
        provenance: 'synthetic',
      },
      {
        id: 'EVT-D-001',
        scenarioId: 'scenario-d-noisy',
        timestamp: '2026-10-25T11:45:10.000Z',
        sessionId: 'sess-d-probe-01',
        sourceNodeId: 'workstation-04',
        destinationNodeId: 'jump-host-01',
        eventType: 'SSH_SESSION_OPEN',
        description: 'Initial SSH hop from Endpoint WS-04 to Bastion Jump-01 (arrived out of order in stream).',
        provenance: 'synthetic',
      },
      {
        id: 'EVT-D-003-DUP',
        scenarioId: 'scenario-d-noisy',
        timestamp: '2026-10-25T11:45:30.000Z',
        sessionId: 'sess-d-probe-01',
        sourceNodeId: 'jump-host-01',
        destinationNodeId: 'decoy-db-01',
        eventType: 'DB_QUERY_EXEC',
        description: 'Duplicate collector replay of EVT-D-003 with identical identity tuple.',
        provenance: 'synthetic',
      },
      {
        id: 'EVT-D-002B',
        scenarioId: 'scenario-d-noisy',
        timestamp: '2026-10-25T11:45:12.000Z',
        sessionId: 'sess-d-backup-88',
        sourceNodeId: 'workstation-04',
        destinationNodeId: 'fileshare-01',
        eventType: 'SMB_SHARE_MOUNT',
        description: 'Unrelated concurrent backup session mounting Eng FileShare-01 at the exact same second as EVT-D-002A.',
        provenance: 'synthetic',
      },
      {
        id: 'EVT-D-002A',
        scenarioId: 'scenario-d-noisy',
        timestamp: '2026-10-25T11:45:12.000Z',
        sessionId: 'sess-d-probe-01',
        sourceNodeId: 'jump-host-01',
        destinationNodeId: 'app-srv-02',
        eventType: 'API_TOKEN_REQUEST',
        description: 'Token request from Bastion Jump-01 to Internal API-02 (shares timestamp with EVT-D-002B; sorted first by ID tie-breaker).',
        provenance: 'synthetic',
      },
      {
        id: 'EVT-D-SPOOF',
        scenarioId: 'scenario-d-noisy',
        timestamp: '2026-10-25T11:45:40.000Z',
        sessionId: 'sess-d-probe-01',
        sourceNodeId: 'fileshare-01',
        destinationNodeId: 'decoy-db-01',
        eventType: 'SPOOFED_TELEMETRY',
        description: 'Adversarial injected log claiming direct traversal from Eng FileShare-01 to Decoy Billing DB (route does not exist in topology).',
        provenance: 'synthetic',
      },
    ],
  },
];

/**
 * Isolated Ground-Truth Expectations.
 * CRITICAL INVARIANT: This map must NEVER be imported by validateEvents.ts, detect.ts, or reconstruct.ts.
 * Only evaluate.ts and test verification suites may read ground truth after reconstruction completes.
 */
export const SCENARIO_GROUND_TRUTH: Record<string, ScenarioGroundTruth> = {
  'scenario-a-decoy': {
    scenarioId: 'scenario-a-decoy',
    expectedEdgeKeys: [
      'workstation-04->jump-host-01',
      'jump-host-01->app-srv-02',
      'app-srv-02->decoy-db-01',
    ],
    expectedDecoyAlertEventIds: ['EVT-A-003'],
    rationale:
      'Complete 3-hop chain from workstation-04 through jump-host-01 and app-srv-02 to decoy-db-01.',
  },
  'scenario-b-normal': {
    scenarioId: 'scenario-b-normal',
    expectedEdgeKeys: [
      'workstation-04->jump-host-01',
      'jump-host-01->app-srv-02',
      'workstation-04->fileshare-01',
    ],
    expectedDecoyAlertEventIds: [],
    rationale:
      'Three ordinary edges across two normal sessions; zero decoy interactions.',
  },
  'scenario-c-incomplete': {
    scenarioId: 'scenario-c-incomplete',
    expectedEdgeKeys: [
      'workstation-04->jump-host-01',
      'jump-host-01->app-srv-02',
      'app-srv-02->decoy-cred-vault',
    ],
    expectedDecoyAlertEventIds: ['EVT-C-002'],
    rationale:
      'Ground truth includes the unrecorded intermediate hop jump-host-01->app-srv-02. Evidence-backed reconstruction must NOT invent it (resulting in 1 FN), whereas the naive baseline connects consecutive session nodes without evidence.',
  },
  'scenario-d-noisy': {
    scenarioId: 'scenario-d-noisy',
    expectedEdgeKeys: [
      'workstation-04->jump-host-01',
      'jump-host-01->app-srv-02',
      'jump-host-01->decoy-db-01',
      'workstation-04->fileshare-01',
    ],
    expectedDecoyAlertEventIds: ['EVT-D-003'],
    rationale:
      'Four genuine edges across two isolated sessions. Duplicate EVT-D-003-DUP is dropped, and spoofed edge fileshare-01->decoy-db-01 is rejected because no topology route exists and fileshare-01 was never visited in sess-d-probe-01.',
  },
};
