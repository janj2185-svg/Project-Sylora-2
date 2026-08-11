# SYLORA Protocol — Future Interoperability Architecture

**Status:** architecture reserved — **not implemented as a live federation network**  
**Rule:** do not spend significant resources on full federation until the core product moats are production-solid.

## Purpose

Prepare an open protocol so SYLORA can eventually interoperate without becoming a closed silo:

1. Identity interoperability
2. Agent interoperability
3. Messaging interoperability
4. Content provenance verification
5. Reputation verification
6. Permissions / consent portability

## Design principles

- Explicit consent and capability scopes
- Portable Personal AI memory export/import (user-owned)
- Agents described by signed manifests
- Provenance compatible with open standards (C2PA-ready metadata)
- Reputation claims are evidence-backed and disputable — never a secret score
- No crypto/NFT requirement for protocol participation

## Suggested future surfaces

| Area | Future endpoint family | Notes |
|---|---|---|
| Identity | `sylora://identity/...` | DID-optional; username + verified claims |
| Agents | `sylora://agent/{slug}@{host}` | Manifest + permission negotiation |
| Messaging | ActivityPub-like or custom inbox | Keep private by default |
| Provenance | signed content receipts | Verify AI involvement labels |
| Reputation | signed attestations | Selective disclosure |
| Permissions | capability tokens | Short-lived, revocable |

## What exists today

- In-product Identity, Personal AI, KG, Agent manifests, Provenance records, Reputation dimensions
- Data export / privacy request APIs
- Developer API keys + scope model as a precursor to OAuth federation

## What is intentionally deferred

- Multi-homed federation
- Cross-instance agent execution
- Global reputation gossip
- Full OIDC provider + JWKS production keys
