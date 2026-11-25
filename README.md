# NEXUS Service Intelligence — Repository Relaunch Proposal

**Status:** Architecture and safe-migration branch only. **Not production-ready.**

NEXUS Service Intelligence is the proposed long-term name for a secure, offline-first service operations analytics platform. Its CarlCare reporting implementation is a private enterprise use case, not a public demonstration data source.

## Repository status

This branch is a **public, non-sensitive migration notice** in the legacy repository. The verified development application and any operational data must **not** be pushed here. This branch does not create a private repository, change repository visibility, or certify the application for production.

The repository's original `main` branch remains unchanged. Existing historical files may be publicly accessible until repository visibility is changed by an authorized repository administrator. Removing files from a branch does not erase Git history.

## Approved direction

- Verified private source repository before importing any proprietary application code.
- Source and dependency integrity, auditable test runs, and least-privilege CI.
- Offline-first local database, secure login, encrypted backups, and reproducible restore testing.
- Controlled CRM report admission; ambiguous file classification must not enter financial or KPI projections.
- Traceable financial booking, payment collection, and outstanding-value metrics.
- Two report layers: Executive Summary and Detailed Analytical Report.
- Windows desktop packaging only after dependency, authentication, recovery, and real-data reconciliation gates pass.

## Current migration gates

1. Create and **verify** a private repository owned by the authorized project account.
2. Review and sanitize the latest verified source checkpoint before initial import.
3. Resolve the patched XLSX parser provenance and reproducible frontend build.
4. Establish private CI and data-free synthetic acceptance tests.
5. Reconcile approved operational KPI logic against authorized, anonymized CRM samples.
6. Validate Windows security, offline functionality, backup and restore.

**No source transfer, release, or production deployment is authorized by this public branch alone.**

## Legacy notice

The historic public dashboard prototype is preserved on `main` for review, but it is not equivalent to the validated development system. Do not upload real customer records, IMEIs, phone numbers, warranty files, passwords, or branch financials to this public repository.

For private migration, use GitHub repository settings and the account's authorized connection. See `docs/MIGRATION_PLAN.md`.
