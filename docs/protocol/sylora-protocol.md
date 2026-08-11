# SYLORA Protocol — architecture proposal

Status: future architecture only. No federation or interoperable network is implemented.

The proposed protocol would define signed, versioned envelopes for:

- decentralized identity references and key rotation;
- agent manifests, capabilities, sandbox declarations and revocation;
- consent-scoped messaging with anti-abuse metadata;
- provenance chains and synthetic-content labels;
- explainable reputation attestations and disputes;
- ABAC permission grants, purpose, expiry and delegation limits.

Every envelope would include protocol version, issuer, audience, subject, issued/expiry times, nonce and signature. Permission grants would be deny-by-default, narrowly scoped and revocable. Financial, legal and identity-critical actions would remain human-confirmed even when peers advertise execution capability.

Interoperability requires canonical schemas, signature suites, discovery, revocation, replay prevention, moderation exchange, data minimization and conformance tests. None of those should be represented as production-ready until independently implemented and security reviewed.
