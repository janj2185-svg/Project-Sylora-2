# SYLORA Protocol — Future Architecture (Not Fully Implemented)

**Status:** architecture / documentation only  
**Rule:** do not spend significant resources on full federation now.

## Purpose

Prepare an open protocol so SYLORA identities, agents, messaging, provenance, reputation and permissions can eventually interoperate beyond a single deployment — without requiring blockchain/crypto fashion accessories.

## Potential domains

1. **Identity interoperability** — portable identity documents with privacy levels and verification claims.  
2. **Agent interoperability** — agent manifests, capability negotiation, permission grants, sandbox attestations.  
3. **Messaging interoperability** — permissioned message envelopes with translation metadata and synthetic-voice labels.  
4. **Content provenance** — origin, AI involvement, edit history; designed for future C2PA/open-standard bridges.  
5. **Reputation verification** — explainable dimension proofs + dispute references (never a secret social score).  
6. **Permissions** — capability tokens scoped by purpose, audience and expiry.

## Non-goals (now)

- Full federation mesh  
- Cross-instance trust registries in production  
- Crypto/NFT “identity” shortcuts  

## Suggested future envelope (informative)

```json
{
  "proto": "sylora/0.1",
  "type": "agent.capability.query",
  "from": "did:sylora:agent:…",
  "to": "did:sylora:org:…",
  "permissions": ["READ"],
  "body": {},
  "provenance": { "aiInvolvement": "none" }
}
```

Current product work implements local foundations that can later emit/consume such envelopes.
