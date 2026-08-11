# SYLORA Protocol — Architecture (Future)

**Status:** architecture only. Do not spend significant resources on full federation now.

## Purpose

Enable eventual interoperability without locking SYLORA into a closed silo:

- Identity interoperability
- Agent interoperability
- Messaging interoperability
- Content provenance verification
- Reputation verification
- Permission grants / revocations

## Design constraints

- Consent and object-level authorization travel with every claim
- Personal AI memory is never globally readable by default
- Critical actions remain confirmation-gated even across agent-to-agent requests
- Provenance should be compatible with open standards where practical (export adapters later)
- Federation is optional; the modular monolith remains the system of record

## Suggested future envelopes (non-normative)

```json
{
  "type": "sylora.agent.request",
  "from": "did:sylora:user:…/agent/personal",
  "to": "did:sylora:org:…/agent:support",
  "permissionLevel": "PROPOSE",
  "capabilities": ["availability", "pricing"],
  "consentReceipt": "…",
  "traceId": "…"
}
```

## Near-term preparation already in-repo

- Action levels: READ → PROPOSE → PREPARE → REQUEST_CONFIRMATION → EXECUTE_ALLOWED
- API scopes list for developer apps
- Content provenance records
- Reputation dimensions model
- `/api/ecosystem/status` marks protocol as `architecture-only`
