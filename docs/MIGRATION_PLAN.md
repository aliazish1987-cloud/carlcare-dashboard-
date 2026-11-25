# NEXUS Service Intelligence — Private Migration Plan

## Safe starting state

- Legacy repository: `aliazish1987-cloud/carlcare-dashboard-` (PUBLIC at last verification).
- Current branch: `relaunch/nexus-service-intelligence-2026-11-25` (PUBLIC, planning materials only).
- Latest verified development source is stored separately in a private project Library, not this GitHub repository.
- A new private GitHub repository has not yet been confirmed available via the connected integration.
- No source or CRM upload to the old public repository is part of this migration.

## Naming

Product: **NEXUS Service Intelligence**.
Proposed private repository slug: `nexus-service-intelligence`.
Scope: secure service-center operational intelligence, with CarlCare as the initial approved operational context.

## Controlled migration, not a blind history copy

1. Create the new private repository, verify `visibility=private`, the account owner and connector access.
2. Store the original private source checkpoint and SHA-256 in the private release ledger.
3. Prepare a curated commit from verified source; exclude raw CRM, customer identifiers, secrets, archives, logs, local databases and machine-specific outputs.
4. Add branch protection, least-privilege CI, dependency scanning and a content-secret preflight.
5. Run actual tests; block release on stale/vulnerable XLSX dependency or failed TypeScript/Vite builds.
6. Only after source admission, implement and test Windows encryption, login, backup/restore, historical consistency, and explicit KPI contracts.
7. Reconcile results job-by-job with authorized anonymized CRM source exports.
8. Preserve full release and rollback evidence before marking production-ready.
9. Review public legacy repository history for sensitive data with a separate incident-response decision; Git deletion is not equivalent to historical erasure.

## Absolute restrictions

No proprietary source, historical customer records, IMEIs, passwords, financial records, private Google Sheet URLs, or actual test fixtures with personal data may be committed to a public branch. Do not assert that private CI or the production application exists unless independently demonstrated.

## Governance

Code changes require acceptance evidence and a persisted checkpoint. Analyzing an issue without implementing a verified correction is not delivery. Scheduled automations remain disabled until expressly reauthorized.
