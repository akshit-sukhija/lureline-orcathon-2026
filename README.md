# Lureline

**A simple, evidence-first cyber-deception investigation demo.**

> **SIMULATION LAB — synthetic events only. No live network monitoring.**

Lureline is a browser-based workbench for exploring four repeatable cybersecurity scenarios. It demonstrates one clear idea: flag interaction with a decoy asset, show the observed network path, and mark unsupported connections as unconfirmed instead of inventing them.

## What the demo does

- **Investigate:** run one of four synthetic scenarios and follow the validation → decoy detection → path reconstruction → evaluation pipeline.
- **Evidence:** inspect a node, edge, alert, event, or unresolved gap and see the records that support it.
- **Activity log:** search, filter, and sort the scenario's synthetic events.
- **Results:** review the evidence-backed summary, compare the deterministic reconstructor with a deliberately naive baseline, and download a JSON report.
- **Optional AI Evidence Explainer:** when a valid `GEMINI_API_KEY` is configured server-side, Gemini explains the current computed results in plain language. When the key is missing or the request fails, the UI falls back to the deterministic explanation.

All numbers shown in the UI are derived from the selected scenario and current run result; they are not fake live counters.

## Scenarios

| Scenario | What it demonstrates |
| --- | --- |
| A — Decoy interaction | A valid observed chain reaches a designated decoy and raises an alert. |
| B — Normal activity | Ordinary activity does not raise a decoy alert. |
| C — Missing evidence | A missing hop remains unconfirmed rather than being fabricated. |
| D — Noisy / adversarial records | Deduplication, deterministic ordering, session separation, and rejection of spoofed/non-topological transitions. |

These fixtures are intentionally synthetic and do not measure real-world intrusion-detection effectiveness.

## Architecture

- `src/data/scenarios.ts` — sample nodes, topology, detection rules, scenarios, and isolated benchmark ground truth.
- `src/engine/` — deterministic validation, decoy detection, path reconstruction, baseline comparison, and evaluation.
- `src/state/useInvestigation.ts` — selected scenario, run/reset/replay, event filters, and shared evidence selection.
- `src/components/` — category-based SPA navigation, interactive network graph, activity log, evidence inspector, summary/report, benchmark, and the result-driven pipeline diagram.
- `api/explain.ts` — optional server-side Vercel function for Gemini explanation. The API key is read from `process.env.GEMINI_API_KEY`; it is not bundled into the browser.
- `server.ts` — local Express/Vite development server and local explanation endpoint.
- `src/tests/engine.test.ts` — deterministic engine and report-payload tests.
- `.github/workflows/lureline-validation.yml` — automated test, type-check, and production-build workflow on pushes and pull requests to `main`.

## Run locally

Requirements: Node.js 22 or later and npm.

```bash
npm install
npm run dev
```

Open the local URL printed in your terminal (the development server defaults to port 3000).

## Validate before changing or submitting

```bash
npm test
npm run lint
npm run build
```

The GitHub Actions validation workflow runs these commands after changes to `main`. Check the Actions tab for the result corresponding to the latest commit.

## Deploy to Vercel

1. Import this repository and keep the root directory as `./`.
2. Choose the **Vite** framework preset.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Install command: `npm install`.
6. Deploy without environment variables for the core synthetic demo and deterministic explanation.
7. To enable Gemini explanations, add `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables, scoped to the environments you use, then redeploy. Keep the key server-side; never prefix it with `VITE_` and never commit a real key.

## Two-minute demo walkthrough

1. **Problem (0:00–0:20):** explain that an observed decoy interaction is useful, but unsupported connections should not be treated as fact.
2. **Scenario A (0:20–0:55):** run the scenario, point to the decoy alert, and select the supporting event/path.
3. **Scenario C (0:55–1:25):** show the unresolved gap. Explain that the tool refuses to invent the missing connection.
4. **Results (1:25–1:50):** show the benchmark summary and download the JSON report.
5. **Limitations (1:50–2:00):** make clear that all data is synthetic and the app is a demonstration, not live monitoring.

## Known limits

- Input events and ground truth are curated synthetic fixtures.
- The benchmark describes behavior on these fixtures only; do not present it as real-world accuracy.
- Gemini is optional. Its explanation is not authoritative; deterministic rules and reconstructed evidence remain the source of truth.
- Automated engine tests, TypeScript checks, and a production build do not replace a manual browser check of the deployed URL, download action, navigation, and optional API endpoint.

## License

SPDX-License-Identifier: Apache-2.0. See source headers and repository metadata for project licensing details.
