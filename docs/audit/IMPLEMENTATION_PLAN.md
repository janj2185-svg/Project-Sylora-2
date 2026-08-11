# Implementation plan

## Stage 0 — baseline and safety

- Maintain this factual capability/security audit.
- Preserve existing API and test behavior.
- Mark provider-dependent features `BLOCKED` rather than returning synthetic success.

## Stage 1 — ecosystem foundations

- Establish permission, identity, memory, knowledge graph, action, audit, marketplace and developer contracts.
- Add organization/RBAC, enterprise policy, reputation, trust/provenance and entitlement models.
- Add JSON persistence paths and PostgreSQL migration 010.
- Expose narrow authenticated APIs and an admin status endpoint.

Exit criteria: permission and confirmation tests pass, private graph data is filtered, secrets are hashed, and no example agent claims to be running.

## Stage 2 — integrated product surfaces

- Show AI permissions, memory controls, installed agents, identity privacy and command context inside existing AI/Profile views.
- Add provider-gated translation and permission-aware search.
- Record structured audit events for ecosystem mutations.

Exit criteria: API integration tests and the complete regression suite pass.

## Next stages

1. Implement PostgreSQL ecosystem repositories with parity tests.
2. Extract server route groups and common validation.
3. Implement OAuth authorization, signed webhook workers and session security center.
4. Integrate vetted payment, translation and vector providers separately, retaining fail-closed behavior.
5. Add agent package review, resource isolation and runtime quotas before third-party execution.
6. Consider protocol federation only after local identity, permission, provenance and abuse controls are mature.
