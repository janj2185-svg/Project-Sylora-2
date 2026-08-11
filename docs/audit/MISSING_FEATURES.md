# Missing and blocked features

## Missing

- OAuth authorization/login and external identity federation
- AI-to-AI delegation and secure agent-to-agent messaging
- Production enterprise administration, SSO and compliance exports
- Federation or implementation of the proposed SYLORA protocol
- Automated knowledge extraction and entity resolution
- Webhook delivery worker, retries and signing

## Blocked by infrastructure/provider

- Semantic/vector search: `VECTOR_SEARCH_PROVIDER` and a real vector database are absent.
- Production payments: no payment provider is integrated. Paid flows must continue to fail closed.
- Translation: no configured translation provider means requests return explicit `BLOCKED` status.
- Reliable public WebRTC across restrictive networks requires configured TURN servers.

## Partial

- Personal AI has memory, context and confirmed actions but no autonomous planning.
- Identity, reputation, provenance, enterprise controls, developer platform and marketplace now have domain foundations, not complete product workflows.
- Creator Studio lacks a complete AI asset pipeline and broad production broadcast orchestration.
- Search remains structured substring search.
- Admin and observability lack external operational tooling.

Example agent manifests are catalog data only. They do not imply hosted execution, security approval or production readiness.
