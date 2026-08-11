# SECURITY_AUDIT

## Controls present

- scrypt password hashing
- bearer sessions; new tokens stored as SHA-256 digests
- per-IP API/auth rate limits; per-user AI limits (Redis or memory)
- security headers + CSP (`script-src 'self'`)
- admin gated by `SYLORA_ADMIN_EMAILS`
- AI write tools require explicit user confirmation
- Companion: bind 127.0.0.1, timing-safe token, origin allowlist, action allowlist
- ICE/TURN credentials only via authenticated RTC config endpoint
- No production secrets hardcoded in client bundles

## Gaps to close while building ecosystem

1. Object-level authorization on every new graph/agent/org resource  
2. Explicit AI permission matrix (what Personal AI may read/act)  
3. Audit log for AI tool use, agent installs, developer API access  
4. Webhook signature verification + replay protection  
5. OAuth/OIDC for third-party apps (consent + scopes)  
6. Prompt-injection hardening for agent tools  
7. Action levels: READ / PROPOSE / PREPARE / REQUEST_CONFIRMATION / EXECUTE_ALLOWED  
8. Tenant isolation for organizations  
9. Media/HLS auth or signed URLs for private content  
10. Device/session inventory + suspicious login signals  
11. Privacy center: export/delete/revoke agents  
12. Synthetic content / deepfake labeling + provenance  
13. Age assurance / parental control architecture (policy hooks)  
14. Payment webhook authenticity when provider connects  

## Non-negotiable rules for this rebuild

- Never hardcode API keys  
- Never fake “production ready” payments  
- Never disable auth to make a demo pass  
- Never give AI EXECUTE on financial/legal actions without confirmation  
- Never collect private graph edges without consent + visibility
