# Technical debt

| Priority | Debt | Consequence |
| --- | --- | --- |
| High | `src/server.mjs` is a large route/domain orchestration file | Changes have wide regression surface |
| High | Ecosystem PostgreSQL schema has no repository adapters yet | Hybrid deployments retain ecosystem data in JSON |
| High | No unified request validation/schema system | Validation behavior varies by route |
| High | No production payment, vector or translation provider | Commerce, semantic search and translation remain blocked |
| Medium | `public/app.js` is a monolithic SPA | UI changes are difficult to isolate and test |
| Medium | Domain events are not universal | Some side effects bypass durable outbox semantics |
| Medium | Audit logs are not tamper-evident | Weak compliance evidence |
| Medium | Limited session/security-center lifecycle | Users cannot inspect/revoke all active devices |
| Medium | Optional Redis creates different scale behavior | Local correctness may not imply multi-instance correctness |
| Low | Compact/minified server style reduces readability | Review and onboarding cost |

Debt should be paid by extracting route groups and repository interfaces with contract tests. Rewriting the stack or prematurely splitting services would add migration risk without fixing authorization and persistence parity.
